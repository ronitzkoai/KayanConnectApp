import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  workerId: string;
  contractorId: string;
  workerName: string;
}

export const RatingDialog = ({
  open,
  onOpenChange,
  jobId,
  workerId,
  contractorId,
  workerName,
}: RatingDialogProps) => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("נא לבחור דירוג");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ratings").insert({
        job_id: jobId,
        worker_id: workerId,
        contractor_id: contractorId,
        rating,
        review: review.trim() || null,
      });

      if (error) throw error;

      toast.success("הדירוג נשמר בהצלחה");
      onOpenChange(false);
      navigate("/contractor/jobs");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("שגיאה בשמירת הדירוג");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">דרג את {workerName}</DialogTitle>
          <DialogDescription className="text-right">
            איך היתה העבודה? הדירוג שלך יעזור לעובדים אחרים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-right block">
              ביקורת (אופציונלי)
            </label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="ספר לנו על החוויה שלך..."
              className="min-h-24 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitting || rating === 0}
            >
              שלח דירוג
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
