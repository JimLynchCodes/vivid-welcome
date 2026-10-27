export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const KEY = "px-chat-conversations-v1";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMessage(role: ChatRole, content: string): ChatMessage {
  return { id: uid(), role, content, createdAt: Date.now() };
}

export function newConversation(): Conversation {
  return {
    id: uid(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(KEY, JSON.stringify(conversations));
}

export function titleFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
}
