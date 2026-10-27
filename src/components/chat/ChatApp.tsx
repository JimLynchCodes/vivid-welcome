import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadConversations,
  newConversation,
  newMessage,
  saveConversations,
  titleFromPrompt,
  type Conversation,
} from "@/lib/chat-storage";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { Sidebar } from "./Sidebar";

async function readSseStream(
  res: Response,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<void> {
  if (!res.body) throw new Error("Empty response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal.aborted) {
      await reader.cancel();
      break;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data) as { token?: string; error?: string };
        if (json.error) throw new Error(json.error);
        if (json.token) onToken(json.token);
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }
}

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0]?.id ?? null);
    setHydrated(true);
    // Collapse sidebar by default on small screens
    if (window.matchMedia("(max-width: 639px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages, streaming]);

  const upsert = useCallback((next: Conversation) => {
    setConversations((prev) => {
      const others = prev.filter((c) => c.id !== next.id);
      return [next, ...others].sort((a, b) => b.updatedAt - a.updatedAt);
    });
    setActiveId(next.id);
  }, []);

  const handleNew = useCallback(() => {
    const c = newConversation();
    upsert(c);
    setDraft("");
    if (window.matchMedia("(max-width: 639px)").matches) setSidebarOpen(false);
  }, [upsert]);

  const handleDelete = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || streaming) return;

      let conv = active;
      if (!conv) {
        conv = newConversation();
      }

      const userMsg = newMessage("user", prompt);
      const assistantMsg = newMessage("assistant", "");
      const withUser: Conversation = {
        ...conv,
        title: conv.messages.length === 0 ? titleFromPrompt(prompt) : conv.title,
        messages: [...conv.messages, userMsg, assistantMsg],
        updatedAt: Date.now(),
      };
      upsert(withUser);
      setDraft("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const history = withUser.messages
          .filter((m) => m.id !== assistantMsg.id)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errText = `Request failed (${res.status})`;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) errText = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(errText);
        }

        let assembled = "";
        await readSseStream(
          res,
          (token) => {
            assembled += token;
            const snapshot = assembled;
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== withUser.id) return c;
                const messages = c.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: snapshot } : m,
                );
                return { ...c, messages, updatedAt: Date.now() };
              }),
            );
          },
          controller.signal,
        );

        if (!assembled) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== withUser.id) return c;
              const messages = c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: "I couldn't generate a reply. Please try again in a moment.",
                    }
                  : m,
              );
              return { ...c, messages, updatedAt: Date.now() };
            }),
          );
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Something went wrong talking to the assistant.";
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== withUser.id) return c;
            const messages = c.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: `Sorry — ${message}` } : m,
            );
            return { ...c, messages, updatedAt: Date.now() };
          }),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [active, streaming, upsert],
  );

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          if (window.matchMedia("(max-width: 639px)").matches) setSidebarOpen(false);
        }}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-center border-b border-border/60 px-12 sm:px-4">
          <span className="font-display text-sm tracking-[0.2em] text-muted-foreground sm:text-base">
            Store Assistant
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <MessageList
            messages={active?.messages ?? []}
            streaming={streaming}
            onSuggestion={(text) => void send(text)}
          />
          <div ref={bottomRef} />
        </div>

        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => void send(draft)}
          onStop={handleStop}
          streaming={streaming}
        />
      </div>
    </div>
  );
}
