import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
};

export function Composer({ value, onChange, onSubmit, onStop, streaming, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim()) onSubmit();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (streaming) {
      onStop();
      return;
    }
    if (value.trim()) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-4 sm:pb-6">
      <div className="flex items-end gap-2 rounded-3xl border border-border bg-card/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl focus-within:border-gold/50">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about stores, delivery, or locations…"
          className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label={streaming ? "Stop generating" : "Send message"}
          disabled={!streaming && (!value.trim() || disabled)}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-background transition-opacity disabled:opacity-40"
        >
          {streaming ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
        Answers use our store knowledge base. May be incomplete — verify important details.
      </p>
    </form>
  );
}
