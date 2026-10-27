/**
 * End-to-end check: mock LLM + chat API + retrieval streaming.
 * Expects mock-llm on 8790 and API on 8787.
 */
const API = process.env.CHAT_API ?? "http://localhost:8787";

async function main() {
  const health = await fetch(`${API}/api/health`).then((r) => r.json());
  if (!health.ok) throw new Error("health failed");

  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Where is the Vineland store?" }],
    }),
  });
  if (!res.ok) {
    throw new Error(`chat failed ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  if (!text.includes("data:")) throw new Error("expected SSE data frames");
  if (!/Vineland|Landis/i.test(text)) {
    throw new Error("expected Vineland/Landis in streamed answer:\n" + text.slice(0, 500));
  }
  // Length limit
  const tooLong = "x".repeat(2500);
  const bad = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: tooLong }] }),
  });
  if (bad.status !== 400) throw new Error(`expected 400 for long msg, got ${bad.status}`);

  console.log("e2e-chat: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
