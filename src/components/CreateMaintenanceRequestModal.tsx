import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, 
  Wrench, 
  MapPin, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  Truck,
  Settings,
  Zap,
  Droplets,
  Cog,
  CircleDot,
  Gauge,
  Thermometer,
  BatteryCharging,
  Search,
  Hammer,
  Camera,
  X,
  ImagePlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateMaintenanceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EQUIPMENT_OPTIONS = [
  { value: "backhoe", label: "באגר", icon: Truck },
  { value: "loader", label: "שופל", icon: Truck },
  { value: "bobcat", label: "בובקט", icon: Truck },
  { value: "grader", label: "מפלסת", icon: Truck },
  { value: "truck", label: "משאית", icon: Truck },
  { value: "mini_excavator", label: "מיני מחפרון", icon: Truck },
  { value: "generator", label: "גנרטור", icon: Zap },
  { value: "compressor", label: "מדחס", icon: Settings },
  { value: "other", label: "אחר", icon: Cog },
];

const MAINTENANCE_OPTIONS = [
  { value: "oil_change", label: "שמן", icon: Droplets },
  { value: "hydraulic_service", label: "הידראוליקה", icon: Gauge },
  { value: "engine_service", label: "מנוע", icon: Cog },
  { value: "electrical", label: "חשמל", icon: BatteryCharging },
  { value: "brake_service", label: "בלמים", icon: CircleDot },
  { value: "cooling_system", label: "קירור", icon: Thermometer },
  { value: "tire_service", label: "צמיגים", icon: CircleDot },
  { value: "inspection", label: "בדיקה", icon: Search },
  { value: "repair", label: "תיקון", icon: Hammer },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "יש זמן", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "medium", label: "רגיל", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "high", label: "דחוף", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "urgent", label: "מיידי!", color: "bg-red-100 text-red-800 border-red-300" },
];

export const CreateMaintenanceRequestModal = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreateMaintenanceRequestModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [equipmentType, setEquipmentType] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const resetForm = () => {
    setStep(1);
    setEquipmentType("");
    setMaintenanceType("");
    setLocation("");
    setUrgency("medium");
    setDescription("");
    setImages([]);
    setImagePreviews([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("ניתן להעלות עד 5 תמונות");
      return;
    }
    
    const newImages = [...images, ...files];
    setImages(newImages);
    
    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    
    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const image of images) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars") // Using existing bucket for now
          .upload(fileName, image);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrl } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
          
        uploadedUrls.push(publicUrl.publicUrl);
      }
      
      return uploadedUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    if (!equipmentType || !maintenanceType || !location) {
      toast.error("אנא מלא את כל השדות");
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      const { error } = await supabase.from("maintenance_requests").insert([{
        contractor_id: user?.id as string,
        equipment_type: equipmentType,
        maintenance_type: maintenanceType,
        location: location,
        urgency: urgency,
        description: description || null,
        images: imageUrls,
      }]);

      if (error) throw error;

      toast.success("הקריאה נפתחה! ספקים יגישו הצעות.");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "שגיאה בפתיחת הקריאה");
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = equipmentType !== "";
  const canProceedStep2 = maintenanceType !== "";
  const canProceedStep3 = location.trim() !== "";

  const getEquipmentLabel = () => EQUIPMENT_OPTIONS.find(e => e.value === equipmentType)?.label || "";
  const getMaintenanceLabel = () => MAINTENANCE_OPTIONS.find(m => m.value === maintenanceType)?.label || "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            קריאת תחזוקה
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  step >= s ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="pt-4 min-h-[280px]">
          {/* Step 1: Equipment Type */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-center text-lg font-medium text-foreground">
                איזה כלי צריך טיפול?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {EQUIPMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setEquipmentType(option.value);
                        setTimeout(() => setStep(2), 150);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        equipmentType === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      )}
                    >
                      <Icon className="h-6 w-6 mb-2 text-muted-foreground" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Maintenance Type */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-center text-lg font-medium text-foreground">
                מה צריך לעשות?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {MAINTENANCE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMaintenanceType(option.value);
                        setTimeout(() => setStep(3), 150);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        maintenanceType === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      )}
                    >
                      <Icon className="h-6 w-6 mb-2 text-muted-foreground" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Location & Urgency */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  איפה הכלי?
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="עיר או כתובת"
                  className="h-12 text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">כמה דחוף?</Label>
                <div className="grid grid-cols-4 gap-2">
                  {URGENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setUrgency(option.value)}
                      className={cn(
                        "py-2.5 px-2 rounded-lg border-2 text-sm font-medium transition-all",
                        urgency === option.value
                          ? option.color + " border-current"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
                className="w-full h-12 text-base font-semibold"
              >
                המשך
                <ChevronLeft className="mr-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 4: Summary & Submit */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">כלי:</span>
                  <span className="font-semibold">{getEquipmentLabel()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">סוג תחזוקה:</span>
                  <span className="font-semibold">{getMaintenanceLabel()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">מיקום:</span>
                  <span className="font-semibold">{location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">דחיפות:</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-sm font-medium",
                    URGENCY_OPTIONS.find(u => u.value === urgency)?.color
                  )}>
                    {URGENCY_OPTIONS.find(u => u.value === urgency)?.label}
                  </span>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  תמונות (אופציונלי)
                </Label>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`תמונה ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload Button */}
                {images.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-12 border-dashed"
                  >
                    <ImagePlus className="ml-2 h-5 w-5" />
                    הוסף תמונה ({images.length}/5)
                  </Button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">פרטים נוספים (אופציונלי)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תאר את הבעיה..."
                  className="min-h-[70px] resize-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-5 w-5" />
                    פרסם קריאה
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Back button */}
        {step > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(step - 1)}
            className="absolute top-4 left-4"
          >
            <ChevronRight className="h-4 w-4 ml-1" />
            חזור
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
