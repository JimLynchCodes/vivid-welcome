/**
 * Generate a synthetic ~500KB+ markdown file (FAKE, under data/fixtures/fake/)
 * and measure BM25 index + retrieval quality.
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = path.resolve("data/fixtures/fake");
await mkdir(dir, { recursive: true });
const file = path.join(dir, "synthetic-large.md");

const brands = ["Elf Bar", "Lost Mary", "JUUL", "GeekVape", "Vaporesso", "SMOK", "Oxbar", "Raz"];
const towns = ["Vineland", "Burlington", "Millville", "Glassboro", "Cherry Hill", "Camden"];
const lines = [
  "# FAKE SYNTHETIC KNOWLEDGE BASE — DO NOT USE AS REAL STORE DATA\n",
  "## Overview\n",
  "This file is generated for RAG scale tests only.\n",
];

let i = 0;
while (Buffer.byteLength(lines.join("\n"), "utf8") < 520_000) {
  const brand = brands[i % brands.length];
  const town = towns[i % towns.length];
  lines.push(`## Product family ${i} — ${brand} in ${town}\n`);
  lines.push(
    `The FAKE product line ${brand} SKU-FAKE-${i} is associated with the ${town} demo warehouse. `,
  );
  lines.push(
    `Customers asking about ${brand.toLowerCase()} availability in ${town.toLowerCase()} should be told this is synthetic test data. `,
  );
  lines.push(
    `Keywords: nicotine disposable device pod ${brand.split(" ")[0].toLowerCase()} inventory demo-${i}.\n\n`,
  );
  i++;
}
await writeFile(file, lines.join(""));
const st = await stat(file);
console.log(`Wrote ${file} (${(st.size / 1024).toFixed(1)} KB, ${i} sections)`);

const result = spawnSync("npx", ["tsx", "scripts/bench-rag-run.ts", dir], {
  encoding: "utf8",
  cwd: process.cwd(),
});
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
console.log(result.stdout);
