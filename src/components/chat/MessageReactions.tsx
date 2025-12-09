import { cn } from "@/lib/utils";

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions: ReactionCount[];
  onToggle: (emoji: string) => void;
}

export const MessageReactions = ({ reactions, onToggle }: MessageReactionsProps) => {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(({ emoji, count, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors",
            hasReacted
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted/50 hover:bg-muted border border-transparent"
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
};
