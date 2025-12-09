import { useState } from "react";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, FileText, Banknote } from "lucide-react";

interface SubmitQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  equipmentInfo?: string;
  onSuccess?: () => void;
}

const AVAILABILITY_OPTIONS = [
  { value: "immediate", label: "זמין מיד" },
  { value: "today", label: "היום" },
  { value: "tomorrow", label: "מחר" },
  { value: "this_week", label: "השבוע" },
  { value: "next_week", label: "שבוע הבא" },
  { value: "custom", label: "לפי תיאום" },
];

const DURATION_OPTIONS = [
  { value: "1_hour", label: "עד שעה" },
  { value: "2_hours", label: "2-3 שעות" },
  { value: "half_day", label: "חצי יום" },
  { value: "full_day", label: "יום עבודה" },
  { value: "multiple_days", label: "מספר ימים" },
];

export const SubmitQuoteModal = ({ 
  open, 
  onOpenChange, 
  requestId,
  equipmentInfo,
  onSuccess 
}: SubmitQuoteModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [availability, setAvailability] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) {
      toast.error("אנא הזן מחיר");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("maintenance_quotes").insert([{
        request_id: requestId,
        provider_id: user?.id as string,
        price: parseFloat(price),
        estimated_duration: estimatedDuration || null,
        availability: availability || null,
        description: description || null,
      }]);

      if (error) throw error;

      toast.success("הצעת המחיר נשלחה בהצלחה!");
      setPrice("");
      setEstimatedDuration("");
      setAvailability("");
      setDescription("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "שגיאה בשליחת ההצעה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            הגש הצעת מחיר
          </DialogTitle>
          {equipmentInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              {equipmentInfo}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Price */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              <Banknote className="inline h-4 w-4 ml-1" />
              מחיר (₪) *
            </Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="הזן מחיר כולל"
              className="text-base h-12 text-xl font-bold"
              required
            />
          </div>

          {/* Estimated Duration */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">משך עבודה משוער</Label>
            <Select value={estimatedDuration} onValueChange={setEstimatedDuration}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="כמה זמן ייקח?" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Availability */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">זמינות</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="מתי אתה זמין?" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {AVAILABILITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">פרטים נוספים</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="מה כולל המחיר? פרטים על הניסיון שלך..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שולח...
                </>
              ) : (
                "שלח הצעה"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-12"
            >
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
