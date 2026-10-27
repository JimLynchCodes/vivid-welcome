import { buildIndexFromDir } from "../server/lib/knowledge.ts";

const dir = process.argv[2] || "data/fixtures/fake";
const { chunks, ms, retrieve } = await buildIndexFromDir(dir);
const q1 = retrieve("Elf Bar availability in Vineland", 5);
const q2 = retrieve("JUUL pods Cherry Hill", 5);
const hit1 = q1.some((c) => /Elf Bar/i.test(c.text) && /Vineland/i.test(c.text));
const hit2 = q2.some((c) => /JUUL/i.test(c.text));
console.log(
  JSON.stringify(
    {
      chunks,
      index_ms: Math.round(ms),
      hit_elf_vineland: hit1,
      hit_juul: hit2,
      top1: q1[0]?.headingPath,
      top2: q2[0]?.headingPath,
    },
    null,
    2,
  ),
);
