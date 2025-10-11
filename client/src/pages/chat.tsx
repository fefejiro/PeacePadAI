import ChatInterface from "@/components/ChatInterface";
import AffirmationBanner from "@/components/AffirmationBanner";

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <AffirmationBanner />
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
