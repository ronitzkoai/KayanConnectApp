import { useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useState } from "react";
import { NewChatDialog } from "./NewChatDialog";

interface ChatListProps {
  userId: string;
  currentConversationId?: string;
}

export const ChatList = ({ userId, currentConversationId }: ChatListProps) => {
  const navigate = useNavigate();
  const { conversations, loading } = useConversations(userId);
  const [showNewChat, setShowNewChat] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">טוען שיחות...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background border-l">
        {/* Header */}
        <div className="p-4 border-b bg-card shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">הצ׳אטים שלי</h2>
            <Button size="icon" variant="outline" onClick={() => setShowNewChat(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-muted-foreground mb-4">אין לך שיחות עדיין</p>
              <Button onClick={() => setShowNewChat(true)}>
                <Plus className="h-4 w-4 ml-2" />
                התחל שיחה חדשה
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                  className={cn(
                    "w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-right",
                    currentConversationId === conversation.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={conversation.other_user.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">
                        {conversation.other_user.full_name}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <Badge variant="default" className="shrink-0 mr-2">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {conversation.last_message?.content || "אין הודעות"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {conversation.last_message?.created_at &&
                        format(new Date(conversation.last_message.created_at), "dd/MM/yy HH:mm", {
                          locale: he,
                        })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        currentUserId={userId}
      />
    </>
  );
};
