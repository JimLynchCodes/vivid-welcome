export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
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

export async function streamChatCompletion(
  messages: ChatMessage[],
  config: LlmConfig,
  signal?: AbortSignal,
): Promise<Response> {
  if (!config.apiKey) {
    throw new Error("LLM_API_KEY is not set");
  }

  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      temperature: 0.3,
      messages,
    }),
  };
  if (signal) init.signal = signal;

  const res = await fetch(`${config.baseUrl}/chat/completions`, init);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 400)}`);
  }

  return res;
}

/** Convert OpenAI SSE stream into a plain text/event-stream of {token} events. */
export function pipeOpenAiSseToTokens(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
