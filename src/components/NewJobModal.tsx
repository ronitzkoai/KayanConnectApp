import { useState } from "react";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MapPin, Calendar, MessageSquare, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SERVICE_TYPES = [
  {
    type: 'operator_with_equipment' as const,
    icon: '👷‍♂️🚜',
    label: 'מפעיל + כלי',
    description: 'עובד מקצועי עם הכלי שלו',
  },
  {
    type: 'operator_only' as const,
    icon: '👷‍♂️',
    label: 'רק מפעיל',
    description: 'יש לי כלי, צריך מפעיל',
  },
  {
    type: 'equipment_only' as const,
    icon: '🚜',
    label: 'רק כלי',
    description: 'יש לי מפעיל, צריך כלי',
  },
];

const WORK_TYPES = [
  { id: "backhoe", label: "באגר", icon: "🚜" },
  { id: "bobcat", label: "בובקט", icon: "🏗️" },
  { id: "loader", label: "שופל", icon: "⚙️" },
  { id: "grader", label: "מפלסת", icon: "📐" },
  { id: "mini_excavator", label: "מיני מחפרון", icon: "🔧" },
  { id: "excavator", label: "מחפרון", icon: "⛏️" },
  { id: "mini_backhoe", label: "מיני באגר", icon: "🏗️" },
  { id: "wheeled_backhoe", label: "באגר גלגלים", icon: "🚜" },
  { id: "telescopic_loader", label: "מעמיס טלסקופי", icon: "📦" },
  { id: "truck_driver", label: "נהג משאית", icon: "🚛" },
  { id: "semi_trailer", label: "סמיטריילר", icon: "🚚" },
  { id: "full_trailer", label: "פול טריילר", icon: "🚛" },
  { id: "bathtub", label: "אמבטיה", icon: "🛁" },
  { id: "double", label: "דאבל", icon: "🚛" },
  { id: "flatbed", label: "רמסע", icon: "📋" },
  { id: "laborer", label: "פועל", icon: "👷" },
];

export const NewJobModal = ({ open, onOpenChange, onSuccess }: NewJobModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form state
  const [serviceType, setServiceType] = useState<'operator_with_equipment' | 'equipment_only' | 'operator_only' | ''>('');
  const [workType, setWorkType] = useState<string>("");
  const [location, setLocation] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setStep(1);
    setServiceType('');
    setWorkType("");
    setLocation("");
    setWorkDate("");
    setNotes("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const handleServiceSelect = (type: typeof serviceType) => {
    setServiceType(type);
    setTimeout(() => setStep(2), 200);
  };

  const handleWorkTypeSelect = (type: string) => {
    setWorkType(type);
    setTimeout(() => setStep(3), 200);
  };

  const handleSubmit = async () => {
    if (!location.trim()) {
      toast.error("הזן מיקום");
      return;
    }
    if (!workDate) {
      toast.error("בחר תאריך ושעה");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("job_requests").insert([{
        contractor_id: user?.id as string,
        work_type: workType as any,
        service_type: serviceType as any,
        location: location.trim(),
        work_date: workDate,
        urgency: "medium" as any,
        notes: notes.trim() || null,
      }]);

      if (error) throw error;

      toast.success("🎉 הקריאה נפתחה בהצלחה!");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "שגיאה ביצירת קריאה");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "w-3 h-3 rounded-full transition-all duration-300",
            step >= s ? "bg-primary scale-110" : "bg-muted"
          )}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">מה אתה צריך?</h2>
        <p className="text-muted-foreground">בחר את סוג השירות</p>
      </div>

      <div className="grid gap-3 pt-2">
        {SERVICE_TYPES.map((service) => (
          <button
            key={service.type}
            type="button"
            onClick={() => handleServiceSelect(service.type)}
            className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-right",
              "hover:border-primary hover:bg-primary/5 hover:scale-[1.02]",
              serviceType === service.type
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            )}
          >
            <span className="text-4xl">{service.icon}</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{service.label}</h3>
              <p className="text-sm text-muted-foreground">{service.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <button
        type="button"
        onClick={() => setStep(1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה
      </button>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">איזה כלי?</h2>
        <p className="text-muted-foreground">בחר את סוג העבודה</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {WORK_TYPES.map((work) => (
          <button
            key={work.id}
            type="button"
            onClick={() => handleWorkTypeSelect(work.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition-all min-h-[100px]",
              "hover:border-primary hover:bg-primary/5 hover:scale-105",
              workType === work.id
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            )}
          >
            <span className="text-4xl">{work.icon}</span>
            <span className="font-bold">{work.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const selectedService = SERVICE_TYPES.find(s => s.type === serviceType);
    const selectedWork = WORK_TYPES.find(w => w.id === workType);

    return (
      <div className="space-y-5 animate-fade-in">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>

        {/* Summary */}
        <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <span className="text-3xl">{selectedWork?.icon}</span>
          <div className="text-center">
            <p className="font-bold text-lg">{selectedWork?.label}</p>
            <p className="text-sm text-muted-foreground">{selectedService?.label}</p>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            איפה העבודה?
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="לדוגמה: תל אביב, רחוב הרצל 123"
            className="h-14 text-lg"
            autoFocus
          />
        </div>

        {/* Date & Time */}
        <div className="space-y-2">
          <label className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            מתי?
          </label>
          <Input
            type="datetime-local"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="h-14 text-lg"
          />
        </div>

        {/* Notes (Optional) */}
        <div className="space-y-2">
          <label className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            הערות
            <span className="text-xs text-muted-foreground font-normal">(לא חובה)</span>
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="פרטים נוספים..."
            className="resize-none"
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit}
          className="w-full h-14 text-lg font-bold"
          disabled={loading || !location.trim() || !workDate}
        >
          {loading ? (
            <>
              <Loader2 className="ml-2 h-6 w-6 animate-spin" />
              שולח...
            </>
          ) : (
            <>
              <Check className="ml-2 h-6 w-6" />
              פתח קריאה
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-6 gap-0">
        {renderStepIndicator()}
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </DialogContent>
    </Dialog>
  );
};
