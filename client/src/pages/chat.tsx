import ChatInterface from "@/components/ChatInterface";
import AffirmationBanner from "@/components/AffirmationBanner";

export default function ChatPage() {
  // Check localStorage for affirmations setting (default OFF)
  const affirmationsEnabled = localStorage.getItem("affirmations_enabled") === "true";

  return (
    <div className="h-screen flex flex-col">
      {affirmationsEnabled && <AffirmationBanner />}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
