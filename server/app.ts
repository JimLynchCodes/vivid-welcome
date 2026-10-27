import { Hono } from "hono";
import { cors } from "hono/cors";
import { formatContext, retrieve } from "./lib/knowledge.js";
import {
  getLlmConfig,
  pipeOpenAiSseToTokens,
  streamChatCompletion,
  type ChatMessage,
} from "./lib/llm.js";
import { rateLimit } from "./lib/rate-limit.js";
import { SYSTEM_PROMPT } from "./lib/system-prompt.js";

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY = 12;

type Body = {
  messages?: Array<{ role?: string; content?: string }>;
};

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/api/health", (c) => c.json({ ok: true, service: "pineapple-xpress-chat" }));

app.post("/api/chat", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "local";

  const limited = rateLimit(`chat:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return c.json({ error: "Too many requests. Please wait a moment." }, 429, {
      "Retry-After": String(limited.retryAfterSec),
    });
  }

  let body: Body;
  try {
    body = (await c.req.json()) as Body;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: ChatMessage[] = raw
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY);

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return c.json({ error: "A user message is required" }, 400);
  }
  if (lastUser.content.length > MAX_MESSAGE_CHARS) {
    return c.json({ error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` }, 400);
  }

  const chunks = await retrieve(lastUser.content, 4);
  const context = formatContext(chunks);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nKnowledge base passages:\n${context}`,
    },
    ...history,
  ];

  try {
    const config = getLlmConfig();
    const upstream = await streamChatCompletion(messages, config, c.req.raw.signal);
    if (!upstream.body) {
      return c.json({ error: "LLM returned an empty body" }, 502);
    }

    const stream = pipeOpenAiSseToTokens(upstream.body);
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM error";
    console.error("[chat]", message);
    return c.json({ error: message }, 502);
  }
});

export default app;
