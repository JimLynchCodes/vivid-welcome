/**
 * Tiny OpenAI-compatible chat-completions mock that streams tokens.
 * Used for local end-to-end tests without a real LLM_API_KEY.
 *
 *   LLM_BASE_URL=http://localhost:8790/v1 LLM_API_KEY=mock LLM_MODEL=mock npm run server
 *   npm run mock-llm
 */
import { createServer } from "node:http";

const port = Number(process.env["MOCK_LLM_PORT"] ?? 18990);

function extractUserText(body: unknown): string {
  try {
    const messages = (body as { messages?: Array<{ role?: string; content?: string }> }).messages;
    const lastUser = [...(messages ?? [])].reverse().find((m) => m.role === "user");
    return lastUser?.content?.trim() || "your question";
  } catch {
    return "your question";
  }
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "POST, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && req.url?.endsWith("/chat/completions")) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const q = extractUserText(body);

    // Peek at system prompt for knowledge snippets so the mock "retrieves"
    const system = (body.messages ?? []).find((m: { role?: string }) => m.role === "system");
    const sysText: string = system?.content ?? "";
    const hasVineland = /vineland/i.test(q) || /vineland/i.test(sysText);
    const hasBurlington = /burlington/i.test(q) || /burlington/i.test(sysText);

    let answer = `Based on our store knowledge base, here's what I can tell you about "${q}". `;
    if (/hour|open|close/i.test(q)) {
      answer =
        "I don't have published store hours in my knowledge base yet. Please check back or visit the store for current hours.";
    } else if (/vineland|landis/i.test(q) || hasVineland) {
      answer =
        "Pineapple Xpress Vineland is at **1381 W Landis Ave #1381B, Vineland, NJ 08360**. You can order online at the Quickvee delivery link for that merchant.";
    } else if (/burlington|holly/i.test(q) || hasBurlington) {
      answer =
        "Pineapple Xpress Burlington is at **1805 Mt Holly Rd Ste 200, Burlington, NJ 08016**. Order online via its Quickvee delivery page.";
    } else if (/about|different|value|fresh|legit/i.test(q)) {
      answer =
        "Pineapple Xpress focuses on Fresh, Legit, Simple, and Curated nicotine vapes and disposables — shipped to your door or available at our NJ locations.";
    } else {
      answer +=
        "We operate Pineapple Xpress locations in Vineland and Burlington, NJ, plus a Queens option. Ask about a specific store for its address and order link.";
    }

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "access-control-allow-origin": "*",
    });

    // Stream word-by-word like a real model
    const words = answer.split(/(\s+)/);
    for (const w of words) {
      const payload = JSON.stringify({
        id: "mock",
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { content: w }, finish_reason: null }],
      });
      res.write(`data: ${payload}\n\n`);
      await new Promise((r) => setTimeout(r, 12));
    }
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}).listen(port, () => {
  console.log(`Mock OpenAI-compatible LLM on http://localhost:${port}/v1`);
});
