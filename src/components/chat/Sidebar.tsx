import { Link } from "@tanstack/react-router";
import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/chat-storage";

type Props = {
  open: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

export function Sidebar({
  open,
  onToggle,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-[#12100e] transition-transform duration-200 sm:static sm:z-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full sm:w-0 sm:overflow-hidden sm:border-0 sm:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <button
            type="button"
            onClick={onNew}
            className="flex flex-1 items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/20"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground sm:hidden"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Chats
          </p>
          {conversations.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">No chats yet.</p>
          )}
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`w-full rounded-xl px-3 py-2.5 pr-9 text-left text-sm transition-colors ${
                    c.id === activeId
                      ? "bg-gold/15 text-foreground"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <span className="line-clamp-1">{c.title}</span>
                </button>
                <button
                  type="button"
                  aria-label="Delete chat"
                  onClick={() => onDelete(c.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border p-3">
          <Link
            to="/"
            className="block rounded-xl px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gold-soft transition-colors hover:bg-gold/10"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Open sidebar"
          className="absolute left-3 top-3 z-20 rounded-xl border border-border bg-card/90 p-2 text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
