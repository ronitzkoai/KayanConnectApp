import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useReactions } from "@/hooks/useReactions";
import { EmojiPicker } from "./EmojiPicker";
import { MessageReactions } from "./MessageReactions";

interface ChatMessageProps {
  id: string;
  content: string;
  isMine: boolean;
  timestamp: string;
  senderName?: string;
  userId: string | null;
}

export const ChatMessage = ({ id, content, isMine, timestamp, senderName, userId }: ChatMessageProps) => {
  const { reactionCounts, toggleReaction } = useReactions(id, userId);

  return (
    <div className={cn("flex mb-3 group", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
        <div className="flex items-center gap-1">
          {!isMine && <EmojiPicker onSelect={toggleReaction} />}
          <div
            className={cn(
              "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
              isMine
                ? "bg-primary text-primary-foreground rounded-bl-sm"
                : "bg-muted text-foreground rounded-br-sm"
            )}
          >
            {!isMine && senderName && (
              <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>
            )}
            <p className="text-sm leading-relaxed break-words">{content}</p>
            <span
              className={cn(
                "text-[10px] mt-1 block",
                isMine ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {format(new Date(timestamp), "HH:mm", { locale: he })}
            </span>
          </div>
          {isMine && <EmojiPicker onSelect={toggleReaction} />}
        </div>
        <MessageReactions reactions={reactionCounts} onToggle={toggleReaction} />
      </div>
    </div>
  );
};
