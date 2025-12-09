import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export const TrialBanner = () => {
  const navigate = useNavigate();
  const { subscription, isTrialActive, getDaysRemaining } = useSubscription();

  if (!subscription || !isTrialActive()) return null;

  const daysRemaining = getDaysRemaining();
  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={cn(
        "w-full py-2 px-4 flex items-center justify-center gap-3 text-sm",
        isUrgent
          ? "bg-destructive/10 text-destructive border-b border-destructive/20"
          : "bg-amber-500/10 text-amber-700 border-b border-amber-500/20"
      )}
      dir="rtl"
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>
        {isUrgent
          ? `נותרו ${daysRemaining} ימים לסיום תקופת הניסיון!`
          : `תקופת ניסיון - נותרו ${daysRemaining} ימים`}
      </span>
      <Button
        size="sm"
        variant={isUrgent ? "destructive" : "outline"}
        className="h-7 text-xs gap-1"
        onClick={() => navigate("/subscription")}
      >
        <Crown className="h-3 w-3" />
        שדרג עכשיו
      </Button>
    </div>
  );
};
