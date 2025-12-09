import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Search } from "lucide-react";
import { toast } from "sonner";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export const NewChatDialog = ({ open, onOpenChange, currentUserId }: NewChatDialogProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", currentUserId);

      if (search.trim()) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (otherUserId: string) => {
    try {
      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (existingParticipations) {
        for (const participation of existingParticipations) {
          const { data: otherParticipation } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("conversation_id", participation.conversation_id)
            .eq("user_id", otherUserId)
            .single();

          if (otherParticipation) {
            // Conversation exists
            navigate(`/chat/${participation.conversation_id}`);
            onOpenChange(false);
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConversation.id, user_id: currentUserId },
          { conversation_id: newConversation.id, user_id: otherUserId },
        ]);

      if (participantsError) throw participantsError;

      navigate(`/chat/${newConversation.id}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("שגיאה ביצירת שיחה");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>שיחה חדשה</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חפש משתמש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">טוען...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">לא נמצאו משתמשים</p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.full_name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
