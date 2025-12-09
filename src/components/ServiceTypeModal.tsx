import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ServiceTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (serviceType: 'operator_with_equipment' | 'equipment_only' | 'operator_only') => void;
  workTypeLabel: string;
}

export const ServiceTypeModal = ({ 
  open, 
  onOpenChange, 
  onSelect,
  workTypeLabel 
}: ServiceTypeModalProps) => {
  const options = [
    {
      type: 'operator_with_equipment' as const,
      icon: '👷‍♂️🚜',
      title: 'מפעיל + כלי',
      description: 'מצאו לכם עובד מקצועי עם הכלי המבוקש',
      isPrimary: true,
    },
    {
      type: 'equipment_only' as const,
      icon: '🚜',
      title: 'רק הכלי',
      description: 'למי שיש כבר מפעיל',
      isPrimary: false,
    },
    {
      type: 'operator_only' as const,
      icon: '👷‍♂️',
      title: 'רק מפעיל',
      description: 'למי שיש כבר כלי באתר',
      isPrimary: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-4 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-3xl font-bold text-center">
            מה אתה צריך?
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            בחר את סוג השירות עבור {workTypeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 pt-4">
          {options.map((option) => (
            <Card
              key={option.type}
              className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-lg",
                option.isPrimary && "border-2 border-primary bg-primary/5"
              )}
              onClick={() => {
                onSelect(option.type);
                onOpenChange(false);
              }}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="text-5xl">{option.icon}</div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-bold">{option.title}</h3>
                  <p className="text-muted-foreground">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-sm text-center text-muted-foreground pt-2">
          המערכת תציג רק עובדים/כלים שמתאימים לבחירה שלכם
        </p>
      </DialogContent>
    </Dialog>
  );
};