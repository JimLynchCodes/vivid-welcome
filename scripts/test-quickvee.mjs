import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = Number(process.env.MOCK_QUICKVEE_PORT ?? 18991);
const base = `http://localhost:${port}`;

const child = spawn("npx", ["tsx", "scripts/mock-quickvee.ts"], {
  env: { ...process.env, MOCK_QUICKVEE_PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let ready = false;
child.stdout.on("data", (d) => {
  if (String(d).includes("Mock Quickvee")) ready = true;
});
child.stderr.on("data", (d) => process.stderr.write(d));

for (let i = 0; i < 50 && !ready; i++) await sleep(100);
if (!ready) {
  child.kill();
  throw new Error("mock-quickvee did not start");
}

const result = spawnSync("npx", ["tsx", "scripts/test-quickvee-run.ts"], {
  encoding: "utf8",
  env: {
    ...process.env,
    QUICKVEE_BASE_URL: base,
    QUICKVEE_API_KEY: "test",
    COMMERCE_PROVIDER: "quickvee",
  },
});
child.kill();
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
