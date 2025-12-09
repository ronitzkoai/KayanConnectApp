import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const useReactions = (messageId: string, userId: string | null) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!messageId) return;

    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId);

      if (!error && data) {
        setReactions(data);
      }
      setLoading(false);
    };

    fetchReactions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const getReactionCounts = (): ReactionCount[] => {
    const counts: Record<string, { count: number; hasReacted: boolean }> = {};
    
    reactions.forEach((r) => {
      if (!counts[r.emoji]) {
        counts[r.emoji] = { count: 0, hasReacted: false };
      }
      counts[r.emoji].count++;
      if (r.user_id === userId) {
        counts[r.emoji].hasReacted = true;
      }
    });

    return Object.entries(counts).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  };

  const toggleReaction = async (emoji: string) => {
    if (!userId) return;

    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.user_id === userId
    );

    if (existingReaction) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existingReaction.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
    }
  };

  return {
    reactions,
    reactionCounts: getReactionCounts(),
    loading,
    toggleReaction,
  };
};
