import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Phone, Search } from "lucide-react";
import { toast } from "sonner";

interface EquipmentSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workType: string;
  workTypeLabel: string;
}

interface EquipmentRental {
  id: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  location: string;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  image_url: string | null;
  owner_id: string;
}

export const EquipmentSearchModal = ({
  open,
  onOpenChange,
  workType,
  workTypeLabel,
}: EquipmentSearchModalProps) => {
  const [loading, setLoading] = useState(false);
  const [rentals, setRentals] = useState<EquipmentRental[]>([]);
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (open) {
      searchEquipment();
    }
  }, [open, workType]);

  const searchEquipment = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("equipment_rentals")
        .select("*")
        .eq("equipment_type", workType)
        .eq("is_available", true);

      if (location.trim()) {
        query = query.ilike("location", `%${location}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRentals(data || []);
    } catch (error: any) {
      toast.error("שגיאה בחיפוש ציוד");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            חיפוש {workTypeLabel} להשכרה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="location">איזור</Label>
              <Input
                id="location"
                placeholder="לדוגמה: תל אביב"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={searchEquipment} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Search className="h-4 w-4 ml-2" />
                )}
                חפש
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rentals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg font-medium mb-2">לא נמצא ציוד זמין</p>
                <p className="text-muted-foreground mb-4">
                  אין כרגע {workTypeLabel} זמין להשכרה באזור שלך
                </p>
                <Button
                  onClick={() => {
                    toast.info("בקרוב נוסיף אפשרות לפרסם בקשה");
                    onOpenChange(false);
                  }}
                >
                  רוצה שנחפש בשבילך?
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rentals.map((rental) => (
                <Card key={rental.id} className="hover:border-primary transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">
                            {rental.brand || ''} {rental.model || workTypeLabel}
                          </h3>
                          <Badge variant="secondary">זמין</Badge>
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {rental.location}
                        </div>
                        
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">יומי: </span>
                            <span className="font-semibold">₪{rental.daily_rate}</span>
                          </div>
                          {rental.weekly_rate && (
                            <div>
                              <span className="text-muted-foreground">שבועי: </span>
                              <span className="font-semibold">₪{rental.weekly_rate}</span>
                            </div>
                          )}
                          {rental.monthly_rate && (
                            <div>
                              <span className="text-muted-foreground">חודשי: </span>
                              <span className="font-semibold">₪{rental.monthly_rate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => {
                          toast.success("יצירת קשר עם המשכיר בקרוב");
                        }}
                      >
                        <Phone className="h-4 w-4 ml-2" />
                        צור קשר
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};