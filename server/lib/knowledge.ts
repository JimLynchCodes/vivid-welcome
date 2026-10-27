import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Chunk = {
  id: string;
  source: string;
  /** Heading breadcrumb, e.g. "Stores > Vineland > Hours" */
  headingPath: string;
  text: string;
  tokens: string[];
};

type Bm25Index = {
  chunks: Chunk[];
  /** term -> doc frequency */
  df: Map<string, number>;
  avgDl: number;
  builtAt: number;
  fingerprint: string;
};

const STOP = new Set(
  `a an the and or of to in on for is are was were be with at by from as it this that
   you your we our do does did if not no yes can will just about what where when who
   how which me my i into than then so such also only own same than too very`.split(/\s+/),
);

const CHUNK_CHARS = Number(process.env["RAG_CHUNK_CHARS"] ?? 1200);
const CHUNK_OVERLAP = Number(process.env["RAG_CHUNK_OVERLAP"] ?? 150);
const MAX_CONTEXT_CHARS = Number(process.env["RAG_MAX_CONTEXT_CHARS"] ?? 6000);
const K1 = 1.5;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-/ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function knowledgeDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../data/knowledge");
}

/**
 * Split markdown by heading hierarchy. Each chunk keeps the full heading path
 * as context. Oversized sections are further split with character overlap.
 */
export function chunkMarkdown(source: string, raw: string): Chunk[] {
  const lines = raw.split(/\n/);
  const stack: Array<{ level: number; title: string }> = [];
  const sections: Array<{ path: string; body: string[] }> = [];
  let current: { path: string; body: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n").trim();
    if (body.length >= 20) sections.push({ path: current.path, body: current.body.slice() });
  };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      flush();
      const level = m[1]!.length;
      const title = m[2]!.trim();
      while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
      stack.push({ level, title });
      current = { path: stack.map((s) => s.title).join(" > "), body: [] };
      continue;
    }
    if (!current) {
      current = { path: source, body: [] };
    }
    current.body.push(line);
  }
  flush();

  const chunks: Chunk[] = [];
  let i = 0;
  for (const section of sections) {
    const full = section.body.join("\n").trim();
    const pieces = splitWithOverlap(full, CHUNK_CHARS, CHUNK_OVERLAP);
    for (const piece of pieces) {
      const text = `${section.path}\n${piece}`.trim();
      chunks.push({
        id: `${source}#${i++}`,
        source,
        headingPath: section.path,
        text,
        tokens: tokenize(text),
      });
    }
  }
  return chunks;
}

function splitWithOverlap(text: string, size: number, overlap: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    // Prefer breaking on a paragraph or sentence boundary
    if (end < text.length) {
      const window = text.slice(start, end);
      const breakAt =
        Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n")) +
        start;
      if (breakAt > start + size * 0.4) end = breakAt + 1;
    }
    out.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out.filter(Boolean);
}

let indexCache: Bm25Index | null = null;

async function fingerprintDir(dir: string): Promise<string> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const parts: string[] = [];
  for (const f of files) {
    if (f.startsWith("TODO-")) continue;
    const st = await stat(path.join(dir, f));
    parts.push(`${f}:${st.mtimeMs}:${st.size}`);
  }
  return parts.join("|");
}

export async function buildIndex(force = false): Promise<Bm25Index> {
  const dir = knowledgeDir();
  const fp = await fingerprintDir(dir);
  if (!force && indexCache && indexCache.fingerprint === fp) return indexCache;

  const t0 = performance.now();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const chunks: Chunk[] = [];
  for (const file of files) {
    if (file.startsWith("TODO-")) continue;
    const raw = await readFile(path.join(dir, file), "utf8");
    chunks.push(...chunkMarkdown(file, raw));
  }

  const df = new Map<string, number>();
  let totalDl = 0;
  for (const c of chunks) {
    totalDl += c.tokens.length;
    const seen = new Set(c.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }

  indexCache = {
    chunks,
    df,
    avgDl: chunks.length ? totalDl / chunks.length : 0,
    builtAt: Date.now(),
    fingerprint: fp,
  };
  const ms = performance.now() - t0;
  console.log(
    `[rag] indexed ${chunks.length} chunks from ${files.filter((f) => !f.startsWith("TODO-")).length} files in ${ms.toFixed(1)}ms`,
  );
  return indexCache;
}

function bm25Score(queryTokens: string[], chunk: Chunk, index: Bm25Index): number {
  const N = index.chunks.length || 1;
  const tf = new Map<string, number>();
  for (const t of chunk.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const dl = chunk.tokens.length || 1;
  let score = 0;
  for (const t of queryTokens) {
    const f = tf.get(t) ?? 0;
    if (f === 0) continue;
    const n = index.df.get(t) ?? 0;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    const denom = f + K1 * (1 - B + B * (dl / (index.avgDl || 1)));
    score += idf * ((f * (K1 + 1)) / denom);
    if (chunk.headingPath.toLowerCase().includes(t)) score += 0.25;
  }
  return score;
}

export async function retrieve(query: string, k = 6): Promise<Chunk[]> {
  const index = await buildIndex();
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return index.chunks.slice(0, k);

  const scored = index.chunks
    .map((chunk) => ({ chunk, score: bm25Score(qTokens, chunk, index) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => s.chunk);
}

/** Pack top chunks into a context string under a character budget. */
export function formatContext(chunks: Chunk[], maxChars = MAX_CONTEXT_CHARS): string {
  if (chunks.length === 0) return "(No matching knowledge base passages were found.)";
  const parts: string[] = [];
  let used = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const block = `[${i + 1}] (${c.source} · ${c.headingPath})\n${c.text}`;
    if (used + block.length + 2 > maxChars && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}

export function getIndexStats(): { chunks: number; avgDl: number; builtAt: number } | null {
  if (!indexCache) return null;
  return {
    chunks: indexCache.chunks.length,
    avgDl: indexCache.avgDl,
    builtAt: indexCache.builtAt,
  };
}

/** Test helper: build an index from an arbitrary directory of .md files. */
export async function buildIndexFromDir(dir: string): Promise<{
  chunks: number;
  ms: number;
  retrieve: (q: string, k?: number) => Chunk[];
}> {
  const t0 = performance.now();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const chunks: Chunk[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf8");
    chunks.push(...chunkMarkdown(file, raw));
  }
  const df = new Map<string, number>();
  let totalDl = 0;
  for (const c of chunks) {
    totalDl += c.tokens.length;
    const seen = new Set(c.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const index: Bm25Index = {
    chunks,
    df,
    avgDl: chunks.length ? totalDl / chunks.length : 0,
    builtAt: Date.now(),
    fingerprint: `test:${dir}`,
  };
  const ms = performance.now() - t0;
  return {
    chunks: chunks.length,
    ms,
    retrieve: (q, k = 5) => {
      const qTokens = tokenize(q);
      return chunks
        .map((chunk) => ({ chunk, score: bm25Score(qTokens, chunk, index) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((s) => s.chunk);
    },
  };
}
