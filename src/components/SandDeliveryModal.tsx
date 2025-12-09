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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { Loader2, MapPin, Calendar, Truck, Minus, Plus } from "lucide-react";

interface SandDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SandDeliveryModal = ({ open, onOpenChange, onSuccess }: SandDeliveryModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [sandType, setSandType] = useState("");
  const [location, setLocation] = useState("");
  const [workDate, setWorkDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !workDate || !sandType) {
      toast.error("אנא מלא את כל השדות");
      return;
    }

    setLoading(true);

    try {
      const sandDeliveryData = {
        type: "sand_delivery",
        quantity,
        sandType,
      };

      const { error } = await supabase.from("job_requests").insert([{
        contractor_id: user?.id as string,
        work_type: "truck_driver" as any,
        location,
        work_date: workDate,
        urgency: "medium" as any,
        notes: JSON.stringify(sandDeliveryData),
      }]);

      if (error) throw error;

      toast.success("🎉 בקשת משלוח חול נשלחה בהצלחה!");
      setLocation("");
      setWorkDate("");
      setQuantity(1);
      setSandType("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "שגיאה ביצירת בקשה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-amber-600" />
            הזמנת משאיות חול
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Quantity */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              כמה משאיות?
            </Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold">{quantity}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sand Type */}
          <div className="space-y-3">
            <Label htmlFor="sandType" className="text-base font-semibold">
              סוג החול
            </Label>
            <Select value={sandType} onValueChange={setSandType} required>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="בחר סוג חול" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="חול מכבש">חול מכבש</SelectItem>
                <SelectItem value="חול ים">חול ים</SelectItem>
                <SelectItem value="חול דיונות">חול דיונות</SelectItem>
                <SelectItem value="חול 0-5">חול 0-5</SelectItem>
                <SelectItem value="חול בניה">חול בניה</SelectItem>
                <SelectItem value="אחר">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
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

          {/* Work Date */}
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
                "שלח בקשה"
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
            נהגים זמינים יראו את הבקשה ויוכלו להגיב
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};