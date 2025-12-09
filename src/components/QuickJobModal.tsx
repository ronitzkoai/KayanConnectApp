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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { Loader2, MapPin, Calendar } from "lucide-react";

interface QuickJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workType: string;
  workTypeLabel: string;
  serviceType: 'operator_with_equipment' | 'equipment_only' | 'operator_only';
  onSuccess?: () => void;
}

export const QuickJobModal = ({ open, onOpenChange, workType, workTypeLabel, serviceType, onSuccess }: QuickJobModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [workDate, setWorkDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !workDate) {
      toast.error("אנא מלא את כל השדות");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("job_requests").insert([{
        contractor_id: user?.id as string,
        work_type: workType as any,
        location,
        work_date: workDate,
        urgency: "medium" as any,
        notes: null,
        service_type: serviceType,
      }]);

      if (error) throw error;

      toast.success("🎉 הקריאה נפתחה בהצלחה!");
      setLocation("");
      setWorkDate("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "שגיאה ביצירת קריאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {serviceType === 'operator_with_equipment' && `צריך ${workTypeLabel} עם מפעיל?`}
            {serviceType === 'operator_only' && `צריך מפעיל ${workTypeLabel}?`}
            {serviceType === 'equipment_only' && `צריך ${workTypeLabel}?`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label htmlFor="location" className="text-base font-semibold">
              <MapPin className="inline h-4 w-4 ml-1" />
              איפה?
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="לדוגמה: תל אביב, רחוב הרצל 123"
              className="text-base h-12"
              required
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="workDate" className="text-base font-semibold">
              <Calendar className="inline h-4 w-4 ml-1" />
              מתי?
            </Label>
            <DateTimePicker
              value={workDate}
              onChange={setWorkDate}
              placeholder="בחר תאריך ושעה"
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
                "שלח קריאה"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-12"
            >
              סגור
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            נוכל להוסיף פרטים נוספים אחר כך
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
