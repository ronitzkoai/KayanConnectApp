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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MapPin, Calendar, Fuel, Minus, Plus } from "lucide-react";

interface FuelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EQUIPMENT_OPTIONS = [
  { value: "backhoe", label: "באגר" },
  { value: "loader", label: "שופל" },
  { value: "bobcat", label: "בובקט" },
  { value: "grader", label: "מפלסת" },
  { value: "truck", label: "משאית" },
  { value: "generator", label: "גנרטור" },
  { value: "other", label: "אחר" },
];

export const FuelOrderModal = ({ open, onOpenChange }: FuelOrderModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(100);
  const [fuelType, setFuelType] = useState<"diesel" | "gasoline">("diesel");
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !deliveryDate || !fuelType) {
      toast.error("אנא מלא את כל השדות הנדרשים");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("fuel_orders").insert([{
        contractor_id: user?.id as string,
        fuel_type: fuelType,
        quantity,
        equipment_type: equipmentType || null,
        equipment_name: equipmentName || null,
        location,
        delivery_date: deliveryDate,
        notes: notes || null,
      }]);

      if (error) throw error;

      toast.success("הזמנת תדלוק נשלחה בהצלחה!");
      // Reset form
      setQuantity(100);
      setFuelType("diesel");
      setEquipmentType("");
      setEquipmentName("");
      setLocation("");
      setDeliveryDate("");
      setNotes("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "שגיאה ביצירת הזמנה");
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => setQuantity(Math.min(5000, quantity + 50));
  const decrementQuantity = () => setQuantity(Math.max(50, quantity - 50));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6 text-green-600" />
            הזמנת תדלוק
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Fuel Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">סוג דלק</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={fuelType === "diesel" ? "default" : "outline"}
                className="flex-1 h-12"
                onClick={() => setFuelType("diesel")}
              >
                סולר
              </Button>
              <Button
                type="button"
                variant={fuelType === "gasoline" ? "default" : "outline"}
                className="flex-1 h-12"
                onClick={() => setFuelType("gasoline")}
              >
                בנזין
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">כמות (ליטרים)</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={decrementQuantity}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold">{quantity}</span>
                <span className="text-muted-foreground mr-1">ליטר</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={incrementQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Equipment Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">לאיזה כלי?</Label>
            <Select value={equipmentType} onValueChange={setEquipmentType}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="בחר סוג כלי (אופציונלי)" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment Name */}
          {equipmentType && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">שם/מזהה הכלי</Label>
              <Input
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="לדוגמה: באגר JCB 3CX"
                className="text-base h-12"
              />
            </div>
          )}

          {/* Location */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              <MapPin className="inline h-4 w-4 ml-1" />
              כתובת למשלוח
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="לדוגמה: אתר בנייה רמת גן, רחוב ויצמן 15"
              className="text-base h-12"
              required
            />
          </div>

          {/* Delivery Date */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              <Calendar className="inline h-4 w-4 ml-1" />
              מתי?
            </Label>
            <DateTimePicker
              value={deliveryDate}
              onChange={setDeliveryDate}
              placeholder="בחר תאריך ושעה"
            />
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">הערות (אופציונלי)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שולח...
                </>
              ) : (
                "שלח הזמנה"
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
        </form>
      </DialogContent>
    </Dialog>
  );
};