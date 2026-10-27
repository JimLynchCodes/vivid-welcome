/**
 * End-to-end: health + RAG stream + inventory tool loop + order tool loop.
 * Expects mock-llm + API (COMMERCE_PROVIDER=mock) running.
 */
const API = process.env.CHAT_API ?? "http://localhost:8787";

async function readSse(res) {
  const text = await res.text();
  const tokens = [];
  const statuses = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const data = t.slice(5).trim();
    if (data === "[DONE]") continue;
    try {
      const j = JSON.parse(data);
      if (j.token) tokens.push(j.token);
      if (j.status) statuses.push(j.status);
    } catch {
      /* ignore */
    }
  }
  return { text, answer: tokens.join(""), statuses };
}

async function chat(content) {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`chat failed ${res.status}: ${await res.text()}`);
  return readSse(res);
}

async function main() {
  const health = await fetch(`${API}/api/health`).then((r) => r.json());
  if (!health.ok) throw new Error("health failed");
  console.log("health:", health.commerce_provider, "chunks=", health.rag?.chunks);

  // RAG
  {
    const { answer, text } = await chat("Where is the Vineland store?");
    if (!text.includes("data:")) throw new Error("expected SSE");
    if (!/Vineland|Landis/i.test(answer)) {
      throw new Error("expected Vineland/Landis:\n" + answer.slice(0, 400));
    }
    console.log("rag: OK");
  }

  // Inventory tool
  {
    const { answer, statuses } = await chat(
      "Is Elf Bar in stock at the Vineland store?",
    );
    if (!statuses.some((s) => /inventory|Checking/i.test(s))) {
      console.warn("warn: no inventory status event", statuses);
    }
    if (!/Elf Bar|in stock|FAKE|sample|Vineland/i.test(answer)) {
      throw new Error("expected inventory answer:\n" + answer.slice(0, 500));
    }
    console.log("inventory-tool: OK");
  }

  // Order tool (mock order PX-1001 + test@example.com)
  {
    const { answer } = await chat(
      "What is the status of order PX-1001 for test@example.com?",
    );
    if (!/PX-1001|out_for_delivery|delivery|FAKE|sample/i.test(answer)) {
      throw new Error("expected order answer:\n" + answer.slice(0, 500));
    }
    console.log("order-tool: OK");
  }

  // Length limit
  const bad = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(2500) }] }),
  });
  if (bad.status !== 400) throw new Error(`expected 400, got ${bad.status}`);

  console.log("e2e-chat: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
