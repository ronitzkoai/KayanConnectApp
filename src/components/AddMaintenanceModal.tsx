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
import { Loader2, Wrench, Calendar } from "lucide-react";

interface AddMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EQUIPMENT_TYPES = [
  { value: "backhoe", label: "באגר" },
  { value: "loader", label: "שופל" },
  { value: "bobcat", label: "בובקט" },
  { value: "grader", label: "מפלסת" },
  { value: "truck", label: "משאית" },
  { value: "semi_trailer", label: "סמי טריילר" },
  { value: "mini_excavator", label: "מיני מחפרון" },
  { value: "generator", label: "גנרטור" },
  { value: "compressor", label: "מדחס" },
  { value: "other", label: "אחר" },
];

const MAINTENANCE_TYPES = [
  { value: "oil_change", label: "החלפת שמן" },
  { value: "tire_change", label: "צמיגים - החלפה/רוטציה" },
  { value: "filter_change", label: "החלפת פילטרים" },
  { value: "hydraulic_service", label: "מערכת הידראולית" },
  { value: "engine_service", label: "טיפול מנוע" },
  { value: "cooling_system", label: "מערכת קירור" },
  { value: "brake_service", label: "בלמים" },
  { value: "electrical", label: "מערכת חשמל" },
  { value: "transmission", label: "תיבת הילוכים" },
  { value: "inspection", label: "בדיקה תקופתית" },
  { value: "general_service", label: "טיפול כללי" },
  { value: "bucket_repair", label: "תיקון כף/להב" },
  { value: "tracks_service", label: "שירות זחלים" },
  { value: "repair", label: "תיקון אחר" },
];

export const AddMaintenanceModal = ({ open, onOpenChange, onSuccess }: AddMaintenanceModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("");
  const [mileageHours, setMileageHours] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentType || !maintenanceType || !scheduledDate) {
      toast.error("אנא מלא את כל השדות הנדרשים");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("equipment_maintenance").insert([{
        contractor_id: user?.id as string,
        equipment_type: equipmentType,
        equipment_name: equipmentName || null,
        maintenance_type: maintenanceType as "oil_change" | "tire_change" | "filter_change" | "general_service" | "repair",
        scheduled_date: scheduledDate,
        cost: cost ? parseFloat(cost) : null,
        mileage_hours: mileageHours ? parseInt(mileageHours) : null,
        notes: notes || null,
      }]);

      if (error) throw error;

      toast.success("תחזוקה נוספה בהצלחה!");
      // Reset form
      setEquipmentType("");
      setEquipmentName("");
      setMaintenanceType("");
      setScheduledDate("");
      setCost("");
      setMileageHours("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "שגיאה בהוספת תחזוקה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            תזמון תחזוקה חדשה
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Equipment Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">סוג כלי *</Label>
            <Select value={equipmentType} onValueChange={setEquipmentType} required>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="בחר סוג כלי" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {EQUIPMENT_TYPES.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment Name */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">שם/מזהה הכלי</Label>
            <Input
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              placeholder="לדוגמה: JCB 3CX, משאית מס׳ 5"
              className="text-base h-12"
            />
          </div>

          {/* Maintenance Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">סוג תחזוקה *</Label>
            <Select value={maintenanceType} onValueChange={setMaintenanceType} required>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="בחר סוג תחזוקה" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {MAINTENANCE_TYPES.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              <Calendar className="inline h-4 w-4 ml-1" />
              תאריך מתוכנן *
            </Label>
            <DateTimePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              placeholder="בחר תאריך"
            />
          </div>

          {/* Cost */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">עלות משוערת (₪)</Label>
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0"
              className="text-base h-12"
            />
          </div>

          {/* Mileage/Hours */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">שעות/ק״מ נוכחיים</Label>
            <Input
              type="number"
              value={mileageHours}
              onChange={(e) => setMileageHours(e.target.value)}
              placeholder="לדוגמה: 5000"
              className="text-base h-12"
            />
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">הערות</Label>
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
              className="flex-1 h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שומר...
                </>
              ) : (
                "הוסף תחזוקה"
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