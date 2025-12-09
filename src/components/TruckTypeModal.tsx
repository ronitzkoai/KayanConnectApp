import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, ArrowRight } from "lucide-react";

interface TruckType {
  type: string;
  label: string;
}

const truckTypes: TruckType[] = [
  { type: "full_trailer", label: "פול טריילר" },
  { type: "semi_trailer", label: "סמיטריילר" },
  { type: "bathtub", label: "אמבטיה" },
  { type: "double", label: "דאבל" },
  { type: "flatbed", label: "רמסע" },
];

interface TruckTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: string, label: string) => void;
}

export const TruckTypeModal = ({ open, onOpenChange, onSelect }: TruckTypeModalProps) => {
  const handleSelect = (truckType: TruckType) => {
    onSelect(truckType.type, truckType.label);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 h-8 w-8 p-0"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl font-bold text-center pt-4">
            בחר סוג משאית
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-3 py-4">
          {truckTypes.map((truckType) => (
            <Card
              key={truckType.type}
              className="group cursor-pointer transition-all duration-300 bg-card border border-border/50 hover:border-primary/40 hover:shadow-md overflow-hidden"
              onClick={() => handleSelect(truckType)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-lg font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                  {truckType.label}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
