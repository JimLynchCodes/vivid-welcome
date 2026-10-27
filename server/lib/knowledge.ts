import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Chunk = {
  id: string;
  source: string;
  title: string;
  text: string;
  tokens: string[];
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "be",
  "with",
  "at",
  "by",
  "from",
  "as",
  "it",
  "this",
  "that",
  "you",
  "your",
  "we",
  "our",
  "do",
  "does",
  "did",
  "if",
  "not",
  "no",
  "yes",
  "can",
  "will",
  "just",
  "about",
  "what",
  "where",
  "when",
  "who",
  "how",
  "which",
  "me",
  "my",
  "i",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-/ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function chunkMarkdown(source: string, raw: string): Chunk[] {
  const parts = raw.split(/\n(?=#{1,3}\s)/);
  const chunks: Chunk[] = [];
  let i = 0;
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Skip TODO placeholder files that only contain comments / empty guidance.
    if (
      source.startsWith("TODO-") &&
      !/[A-Za-z0-9].{20,}/.test(trimmed.replace(/<!--[\s\S]*?-->/g, "").replace(/^#.*/m, ""))
    ) {
      continue;
    }
    const titleMatch = trimmed.match(/^#{1,3}\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? source;
    const text = trimmed.replace(/^#{1,3}\s+.+$/m, "").trim() || trimmed;
    if (text.length < 20) continue;
    chunks.push({
      id: `${source}#${i++}`,
      source,
      title,
      text: `${title}\n${text}`,
      tokens: tokenize(`${title} ${text}`),
    });
  }
  return chunks;
}

let cache: Chunk[] | null = null;

export function knowledgeDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../data/knowledge");
}

export async function loadChunks(): Promise<Chunk[]> {
  if (cache) return cache;
  const dir = knowledgeDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const all: Chunk[] = [];
  for (const file of files) {
    // Placeholder files stay in the repo for Jim to fill in, but are not retrieved.
    if (file.startsWith("TODO-")) continue;
    const raw = await readFile(path.join(dir, file), "utf8");
    all.push(...chunkMarkdown(file, raw));
  }
  cache = all;
  return all;
}

/** Simple TF scoring over keyword overlap — good enough for a small KB. */
export async function retrieve(query: string, k = 4): Promise<Chunk[]> {
  const chunks = await loadChunks();
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return chunks.slice(0, k);

  const scored = chunks.map((chunk) => {
    const tf = new Map<string, number>();
    for (const t of chunk.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of qTokens) {
      const f = tf.get(t) ?? 0;
      if (f > 0) score += 1 + Math.log(1 + f);
      // Bonus for exact title hits
      if (chunk.title.toLowerCase().includes(t)) score += 0.5;
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.chunk);
}

export function formatContext(chunks: Chunk[]): string {
  if (chunks.length === 0) {
    return "(No matching knowledge base passages were found.)";
  }
  return chunks.map((c, i) => `[${i + 1}] (${c.source}) ${c.title}\n${c.text}`).join("\n\n");
}
