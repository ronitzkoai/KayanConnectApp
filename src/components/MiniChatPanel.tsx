import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send, X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase-context";

export const MiniChatPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      loadRecentMessages();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    // Get conversations where user is a participant
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      setUnreadCount(0);
      return;
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Count unread messages in those conversations
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    setUnreadCount(count || 0);
  };

  const loadRecentMessages = async () => {
    if (!user) return;

    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) return;

    const conversationIds = participations.map(p => p.conversation_id);

    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        profiles:sender_id (full_name)
      `)
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(3);

    setRecentMessages(data || []);
  };

  if (!isExpanded) {
    return (
      <button
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 bg-primary hover:bg-primary/90 cursor-pointer"
        onClick={() => navigate("/chat")}
        aria-label="פתח הודעות"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
              {unreadCount}
            </Badge>
          )}
        </div>
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 left-6 z-40 w-80 sm:w-96 bg-card border-2 border-primary shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">הודעות</h3>
          {unreadCount > 0 && (
            <Badge className="bg-destructive">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {recentMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין הודעות עדיין</p>
          </div>
        ) : (
          recentMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-3 rounded-lg bg-muted hover:bg-muted/70 cursor-pointer transition-colors"
              onClick={() => navigate("/chat")}
            >
              <div className="font-semibold text-sm text-foreground mb-1">
                {msg.profiles?.full_name || "משתמש"}
              </div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Action */}
      <div className="p-4 border-t">
        <Button
          onClick={() => navigate("/chat")}
          className="w-full"
        >
          <MessageCircle className="h-4 w-4 ml-2" />
          פתח את כל ההודעות
        </Button>
      </div>
    </Card>
  );
};
