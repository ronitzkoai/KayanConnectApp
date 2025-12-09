import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

const GLOBAL_CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";

interface Conversation {
  id: string;
  last_message_at: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  } | null;
  unread_count: number;
}

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadConversations = async () => {
      try {
        const { data: participations, error } = await supabase
          .from("conversation_participants")
          .select(`
            conversation_id,
            conversations (
              id,
              last_message_at,
              conversation_participants (
                user_id,
                profiles (
                  id,
                  full_name,
                  avatar_url
                )
              )
            )
          `)
          .eq("user_id", userId);

        if (error) throw error;

        const conversationsData = await Promise.all(
          (participations || []).map(async (p: any) => {
            const conv = p.conversations;
            const otherParticipant = conv.conversation_participants.find(
              (cp: any) => cp.user_id !== userId
            );

            const { data: messages } = await supabase
              .from("messages")
              .select("content, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("is_read", false)
              .neq("sender_id", userId);

            return {
              id: conv.id,
              last_message_at: conv.last_message_at,
              other_user: {
                id: otherParticipant?.profiles?.id || "",
                full_name: otherParticipant?.profiles?.full_name || "משתמש לא ידוע",
                avatar_url: otherParticipant?.profiles?.avatar_url || null,
              },
              last_message: messages?.[0] || null,
              unread_count: unreadCount || 0,
            };
          })
        );

        // Filter out global chat from private conversations
        const filteredConversations = conversationsData
          .filter(c => c.id !== GLOBAL_CONVERSATION_ID)
          .sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
          
        setConversations(filteredConversations);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();

    const channel: RealtimeChannel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { conversations, loading };
};
