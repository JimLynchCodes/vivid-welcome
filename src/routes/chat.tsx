import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/ChatApp";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [{ title: "Store Assistant — Pineapple Xpress" }],
  }),
  component: ChatPage,
});

function ChatPage() {
  return <ChatApp />;
}
