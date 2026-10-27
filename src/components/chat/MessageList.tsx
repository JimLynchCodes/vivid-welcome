import { Check, Copy, User } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "@/lib/chat-storage";
import { Markdown } from "./Markdown";

const SUGGESTIONS = [
  "Where is the Vineland store?",
  "How do I order online for Burlington?",
  "What makes Pineapple Xpress different?",
  "Do you have a Queens location?",
];

type Props = {
  messages: ChatMessage[];
  streaming: boolean;
  onSuggestion: (text: string) => void;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy message"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-gold" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function MessageList({ messages, streaming, onSuggestion }: Props) {
  if (messages.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <div className="mb-3 font-display text-3xl tracking-widest text-foreground sm:text-4xl">
          Pineapple <span className="text-gold">Xpress</span>
        </div>
        <p className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base">
          Ask anything about our stores, delivery, or ordering. Answers come from our store
          knowledge base.
        </p>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-left text-sm text-foreground/90 transition-colors hover:border-gold/40 hover:bg-gold/10"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      {messages.map((m, idx) => {
        const isLast = idx === messages.length - 1;
        const showCursor = streaming && isLast && m.role === "assistant";
        return (
          <div key={m.id} className="group flex gap-3 sm:gap-4">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                m.role === "assistant"
                  ? "bg-gold/20 text-gold"
                  : "bg-white/10 text-muted-foreground"
              }`}
            >
              {m.role === "assistant" ? "PX" : <User className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.role === "assistant" ? "Assistant" : "You"}
                </span>
                {m.content && <CopyButton text={m.content} />}
              </div>
              {m.role === "assistant" ? (
                <div>
                  {m.content ? (
                    <Markdown content={m.content} />
                  ) : (
                    <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-gold/50" />
                  )}
                  {showCursor && m.content && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gold align-middle" />
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                  {m.content}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
