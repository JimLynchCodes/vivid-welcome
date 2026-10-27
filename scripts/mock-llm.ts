/**
 * OpenAI-compatible mock that supports streaming + tool calls.
 *
 *   npm run mock-llm
 *   LLM_BASE_URL=http://localhost:18990/v1 LLM_API_KEY=mock LLM_MODEL=mock npm run server
 */
import { createServer } from "node:http";

const port = Number(process.env["MOCK_LLM_PORT"] ?? 18990);

type Msg = { role?: string; content?: string | null; tool_calls?: unknown[]; name?: string };

function lastUser(messages: Msg[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content?.trim() || "";
}

function lastTool(messages: Msg[]): Msg | undefined {
  return [...messages].reverse().find((m) => m.role === "tool");
}

function wantsInventory(q: string): boolean {
  return /in stock|inventory|available|have\b.*\b(elf|lost mary|juul|geek)/i.test(q);
}

function wantsOrder(q: string): boolean {
  return /order\s*(status|#|number)|where.*(order|package)|track/i.test(q);
}

async function streamText(res: import("node:http").ServerResponse, text: string) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    "access-control-allow-origin": "*",
  });
  for (const w of text.split(/(\s+)/)) {
    const payload = JSON.stringify({
      id: "mock",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content: w }, finish_reason: null }],
    });
    res.write(`data: ${payload}\n\n`);
    await new Promise((r) => setTimeout(r, 8));
  }
  res.write("data: [DONE]\n\n");
  res.end();
}

function jsonCompletion(res: import("node:http").ServerResponse, message: Record<string, unknown>) {
  res.writeHead(200, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(
    JSON.stringify({
      id: "mock",
      object: "chat.completion",
      choices: [{ index: 0, message, finish_reason: message["tool_calls"] ? "tool_calls" : "stop" }],
    }),
  );
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
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as {
      stream?: boolean;
      tools?: unknown[];
      messages?: Msg[];
    };
    const messages = body.messages ?? [];
    const q = lastUser(messages);
    const toolMsg = lastTool(messages);
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;

    // After a tool result → final answer (stream or json)
    if (toolMsg) {
      let answer = "Here's what I found from our live systems.\n\n";
      try {
        const parsed = JSON.parse(toolMsg.content || "{}") as {
          sample_note?: string;
          items?: Array<{ name: string; store: string; quantity: number; in_stock: boolean }>;
          order?: { orderId: string; status: string; storeName?: string };
          found?: boolean;
          message?: string;
          products?: unknown[];
          error?: string;
        };
        if (parsed.sample_note) answer += `_(${parsed.sample_note})_\n\n`;
        if (parsed.error) answer = `I couldn't complete that lookup: ${parsed.error}`;
        else if (parsed.items) {
          if (parsed.items.length === 0) answer += "No matching inventory rows.";
          else {
            answer += parsed.items
              .map(
                (i) =>
                  `- **${i.name}** at ${i.store}: ${i.in_stock ? `${i.quantity} in stock` : "out of stock"}`,
              )
              .join("\n");
          }
        } else if (parsed.found === false) {
          answer = parsed.message || "No matching order.";
        } else if (parsed.order) {
          answer += `Order **${parsed.order.orderId}** is **${parsed.order.status}**`;
          if (parsed.order.storeName) answer += ` (${parsed.order.storeName})`;
          answer += ".";
        } else if (parsed.products) {
          answer += `Found ${parsed.products.length} product(s).`;
        } else {
          answer += "Done.";
        }
      } catch {
        answer += String(toolMsg.content).slice(0, 500);
      }
      if (body.stream) return void streamText(res, answer);
      return jsonCompletion(res, { role: "assistant", content: answer });
    }

    // Decide to call a tool (non-stream json)
    if (hasTools && !body.stream && wantsInventory(q)) {
      return jsonCompletion(res, {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_inv_1",
            type: "function",
            function: {
              name: "check_inventory",
              arguments: JSON.stringify({
                query: q.match(/elf bar|lost mary|juul|geekvape|aegis/i)?.[0] ?? "Elf Bar",
                store: /burlington/i.test(q) ? "burlington" : /vineland/i.test(q) ? "vineland" : undefined,
              }),
            },
          },
        ],
      });
    }

    if (hasTools && !body.stream && wantsOrder(q)) {
      // Extract crude order id / verify if present; otherwise ask via tool with placeholders from text
      const order = q.match(/PX-\d+/i)?.[0] ?? "PX-1001";
      const verify =
        q.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ??
        q.match(/\d{4,}/)?.[0] ??
        "test@example.com";
      return jsonCompletion(res, {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_ord_1",
            type: "function",
            function: {
              name: "get_order_status",
              arguments: JSON.stringify({ order_number: order, verify }),
            },
          },
        ],
      });
    }

    // Plain RAG-ish answer
    let answer =
      `Based on our store knowledge base, here's what I can tell you about "${q}". `;
    if (/hour|open|close/i.test(q)) {
      answer =
        "I don't have published store hours in my knowledge base yet. Please check back or visit the store.";
    } else if (/vineland|landis/i.test(q)) {
      answer =
        "Pineapple Xpress Vineland is at **1381 W Landis Ave #1381B, Vineland, NJ 08360**. You can order online via its Quickvee delivery link.";
    } else if (/burlington|holly/i.test(q)) {
      answer =
        "Pineapple Xpress Burlington is at **1805 Mt Holly Rd Ste 200, Burlington, NJ 08016**.";
    } else if (/about|different|fresh|legit/i.test(q)) {
      answer =
        "Pineapple Xpress focuses on Fresh, Legit, Simple, and Curated nicotine vapes and disposables.";
    } else {
      answer +=
        "We operate locations in Vineland and Burlington, NJ. Ask about a store, inventory, or an order (with verification).";
    }

    if (body.stream) return void streamText(res, answer);
    return jsonCompletion(res, { role: "assistant", content: answer });
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}).listen(port, () => {
  console.log(`Mock OpenAI-compatible LLM on http://localhost:${port}/v1`);
});
