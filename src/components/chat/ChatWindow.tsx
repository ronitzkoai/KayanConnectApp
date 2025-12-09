import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessages } from "@/hooks/useMessages";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, User } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  userId: string;
  otherUser: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const ChatWindow = ({ userId, otherUser }: ChatWindowProps) => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, loading, sendMessage } = useMessages(conversationId, userId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      toast.error("שגיאה בשליחת ההודעה");
    }
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-center">
          <p className="text-muted-foreground">בחר שיחה כדי להתחיל</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background grid grid-rows-[auto_1fr_auto]">
      {/* Header - row 1 (auto) */}
      <div className="flex items-center gap-3 p-4 border-b bg-card shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/chat")}
          className="md:hidden"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{otherUser?.full_name || "משתמש"}</h3>
        </div>
      </div>

      {/* Messages - row 2 (1fr) */}
      <div className="overflow-y-auto p-4">
        {loading ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground">טוען הודעות...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">אין הודעות עדיין. התחל שיחה!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
                isMine={message.sender_id === userId}
                timestamp={message.created_at}
                userId={userId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - row 3 (auto) */}
      <ChatInput onSend={handleSendMessage} disabled={loading} />
    </div>
  );
};
