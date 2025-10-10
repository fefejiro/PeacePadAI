import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
