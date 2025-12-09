import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  is_read: boolean;
}

export const useMessages = (conversationId: string | undefined, userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId || !userId) {
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(`
            *,
            profiles!messages_sender_id_fkey (
              full_name
            )
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        setMessages((data || []).map((msg: any) => ({
          ...msg,
          sender_name: msg.profiles?.full_name || "משתמש לא ידוע"
        })));

        // Mark messages as read
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("is_read", false)
          .neq("sender_id", userId);

        // Update last_read_at for current user
        await supabase
          .from("conversation_participants")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    const channel: RealtimeChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender name
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMessage.sender_id)
            .single()
            .then(({ data }) => {
              setMessages((prev) => [...prev, {
                ...newMessage,
                sender_name: data?.full_name || "משתמש לא ידוע"
              }]);
            });
          
          // Auto-mark as read if it's not from current user
          if (newMessage.sender_id !== userId) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMessage.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
      });

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return { messages, loading, sendMessage };
};
