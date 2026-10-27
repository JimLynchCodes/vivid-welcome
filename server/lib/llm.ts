import { TOOL_DEFINITIONS, runToolCall, type ToolCall } from "./tools.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function getLlmConfig(): LlmConfig {
  const apiKey = process.env["LLM_API_KEY"] ?? "";
  const baseUrl = (process.env["LLM_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env["LLM_MODEL"] ?? "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

type CompletionResult =
  | { type: "message"; content: string }
  | { type: "tool_calls"; calls: ToolCall[]; content: string | null };

/** Non-streaming completion — used for the tool-call loop. */
export async function completeChat(
  messages: ChatMessage[],
  config: LlmConfig,
  opts: { tools?: boolean; signal?: AbortSignal } = {},
): Promise<CompletionResult> {
  if (!config.apiKey) throw new Error("LLM_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: config.model,
    stream: false,
    temperature: 0.3,
    messages,
  };
  if (opts.tools !== false) {
    body["tools"] = TOOL_DEFINITIONS;
    body["tool_choice"] = "auto";
  }

  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  };
  if (opts.signal) init.signal = opts.signal;

  const res = await fetch(`${config.baseUrl}/chat/completions`, init);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${t.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: ToolCall[];
      };
    }>;
  };
  const msg = json.choices?.[0]?.message;
  if (msg?.tool_calls && msg.tool_calls.length > 0) {
    return {
      type: "tool_calls",
      calls: msg.tool_calls,
      content: msg.content ?? null,
    };
  }
  return { type: "message", content: msg?.content ?? "" };
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  config: LlmConfig,
  opts: { tools?: boolean; signal?: AbortSignal } = {},
): Promise<Response> {
  if (!config.apiKey) throw new Error("LLM_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: config.model,
    stream: true,
    temperature: 0.3,
    messages,
  };
  // Final answer stream: no tools so we get tokens only
  if (opts.tools) {
    body["tools"] = TOOL_DEFINITIONS;
    body["tool_choice"] = "auto";
  }

  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  };
  if (opts.signal) init.signal = opts.signal;

  const res = await fetch(`${config.baseUrl}/chat/completions`, init);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${t.slice(0, 400)}`);
  }
  return res;
}

export type SseEvent =
  { type: "status"; status: string } | { type: "token"; token: string } | { type: "done" };

/** Run tool-call loop server-side, then stream the final assistant answer. */
export async function runAgentStream(
  messages: ChatMessage[],
  config: LlmConfig,
  opts: { ip: string; signal?: AbortSignal; maxToolRounds?: number },
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const maxRounds = opts.maxToolRounds ?? 3;
  const working: ChatMessage[] = [...messages];

  return new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        if (event.type === "done") {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }
        if (event.type === "status") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: event.status })}\n\n`),
          );
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: event.token })}\n\n`));
      };

      try {
        for (let round = 0; round < maxRounds; round++) {
          if (opts.signal?.aborted) break;
          send({ type: "status", status: round === 0 ? "Thinking…" : "Using tools…" });

          const result = await completeChat(working, config, {
            tools: true,
            ...(opts.signal ? { signal: opts.signal } : {}),
          });

          if (result.type === "message") {
            // Stream the final text token-by-token for UX consistency
            const text = result.content || "";
            // Prefer a real stream for the last hop when we can
            const upstream = await streamChatCompletion(working, config, {
              tools: false,
              ...(opts.signal ? { signal: opts.signal } : {}),
            });
            if (upstream.body) {
              await pipeTokens(upstream.body, send, opts.signal);
            } else if (text) {
              for (const ch of text.match(/.{1,12}/g) ?? []) {
                send({ type: "token", token: ch });
              }
            }
            send({ type: "done" });
            controller.close();
            return;
          }

          // Tool calls
          working.push({
            role: "assistant",
            content: result.content,
            tool_calls: result.calls,
          });

          for (const call of result.calls) {
            const output = await runToolCall(call, {
              ip: opts.ip,
              onStatus: (status) => send({ type: "status", status }),
            });
            working.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: output,
            });
          }
        }

        // Exhausted tool rounds — force a final answer without tools
        send({ type: "status", status: "Writing reply…" });
        const upstream = await streamChatCompletion(working, config, {
          tools: false,
          ...(opts.signal ? { signal: opts.signal } : {}),
        });
        if (upstream.body) await pipeTokens(upstream.body, send, opts.signal);
        send({ type: "done" });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Agent error";
        send({ type: "token", token: `Sorry — ${message}` });
        send({ type: "done" });
        controller.close();
      }
    },
  });
}

async function pipeTokens(
  upstream: ReadableStream<Uint8Array>,
  send: (e: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder();
  const reader = upstream.getReader();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = json.choices?.[0]?.delta?.content;
          if (token) send({ type: "token", token });
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
