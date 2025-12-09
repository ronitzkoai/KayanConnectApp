import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/supabase-context";

interface AddListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddListingModal = ({ open, onOpenChange }: AddListingModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipment_type: "",
    brand: "",
    model: "",
    year: "",
    location: "",
    price: "",
    daily_rate: "",
    weekly_rate: "",
    monthly_rate: "",
    hours_used: "",
    condition: "",
    description: "",
    image_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "שגיאה",
        description: "עליך להיות מחובר כדי לפרסם מודעה",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (listingType === "sale") {
        const { error } = await supabase.from("equipment_marketplace").insert({
          equipment_type: formData.equipment_type,
          brand: formData.brand || null,
          model: formData.model || null,
          year: formData.year ? parseInt(formData.year) : null,
          location: formData.location,
          price: parseFloat(formData.price),
          hours_used: formData.hours_used ? parseInt(formData.hours_used) : null,
          condition: formData.condition || null,
          description: formData.description || null,
          image_url: formData.image_url || null,
          seller_id: user.id,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipment_rentals").insert({
          equipment_type: formData.equipment_type,
          brand: formData.brand || null,
          model: formData.model || null,
          year: formData.year ? parseInt(formData.year) : null,
          location: formData.location,
          daily_rate: parseFloat(formData.daily_rate),
          weekly_rate: formData.weekly_rate ? parseFloat(formData.weekly_rate) : null,
          monthly_rate: formData.monthly_rate ? parseFloat(formData.monthly_rate) : null,
          description: formData.description || null,
          image_url: formData.image_url || null,
          owner_id: user.id,
        });

        if (error) throw error;
      }

      toast({
        title: "מודעה פורסמה בהצלחה!",
        description: "המודעה שלך מופיעה עכשיו בשוק הציוד",
      });
      onOpenChange(false);
      setFormData({
        equipment_type: "",
        brand: "",
        model: "",
        year: "",
        location: "",
        price: "",
        daily_rate: "",
        weekly_rate: "",
        monthly_rate: "",
        hours_used: "",
        condition: "",
        description: "",
        image_url: "",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בפרסום המודעה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>פרסם מודעה חדשה</DialogTitle>
          <DialogDescription>
            מלא את הפרטים על הציוד שברצונך למכור או להשכיר
          </DialogDescription>
        </DialogHeader>

        <Tabs value={listingType} onValueChange={(v) => setListingType(v as "sale" | "rent")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sale">למכירה</TabsTrigger>
            <TabsTrigger value="rent">להשכרה</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <TabsContent value="sale" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="equipment_type">סוג הציוד *</Label>
                <Select
                  value={formData.equipment_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, equipment_type: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג ציוד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backhoe">באגר</SelectItem>
                    <SelectItem value="bobcat">בובקט</SelectItem>
                    <SelectItem value="truck">משאית</SelectItem>
                    <SelectItem value="grader">מפלסת</SelectItem>
                    <SelectItem value="loader">שופל</SelectItem>
                    <SelectItem value="semi-trailer">טריילר</SelectItem>
                    <SelectItem value="excavator">חופר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">יצרן</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="CAT, Volvo, Komatsu..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">דגם</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="320D, S650..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">שנת ייצור</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    placeholder="2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours_used">שעות עבודה</Label>
                  <Input
                    id="hours_used"
                    type="number"
                    value={formData.hours_used}
                    onChange={(e) =>
                      setFormData({ ...formData, hours_used: e.target.value })
                    }
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">מחיר (₪) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="450000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">מצב</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) =>
                      setFormData({ ...formData, condition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מצב" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="חדש">חדש</SelectItem>
                      <SelectItem value="משומש - מצב מעולה">משומש - מצב מעולה</SelectItem>
                      <SelectItem value="משומש - מצב טוב">משומש - מצב טוב</SelectItem>
                      <SelectItem value="משומש - מצב סביר">משומש - מצב סביר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">מיקום *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="תל אביב, חיפה..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="פרטים נוספים על הציוד..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">קישור לתמונה</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </TabsContent>

            <TabsContent value="rent" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="equipment_type_rent">סוג הציוד *</Label>
                <Select
                  value={formData.equipment_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, equipment_type: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג ציוד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backhoe">באגר</SelectItem>
                    <SelectItem value="bobcat">בובקט</SelectItem>
                    <SelectItem value="truck">משאית</SelectItem>
                    <SelectItem value="grader">מפלסת</SelectItem>
                    <SelectItem value="loader">שופל</SelectItem>
                    <SelectItem value="semi-trailer">טריילר</SelectItem>
                    <SelectItem value="excavator">חופר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_rent">יצרן</Label>
                  <Input
                    id="brand_rent"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="CAT, Volvo, Komatsu..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model_rent">דגם</Label>
                  <Input
                    id="model_rent"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="320D, S650..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year_rent">שנת ייצור</Label>
                <Input
                  id="year_rent"
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  placeholder="2020"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_rate">יומי (₪) *</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, daily_rate: e.target.value })
                    }
                    placeholder="800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly_rate">שבועי (₪)</Label>
                  <Input
                    id="weekly_rate"
                    type="number"
                    value={formData.weekly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, weekly_rate: e.target.value })
                    }
                    placeholder="4500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_rate">חודשי (₪)</Label>
                  <Input
                    id="monthly_rate"
                    type="number"
                    value={formData.monthly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, monthly_rate: e.target.value })
                    }
                    placeholder="15000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_rent">מיקום *</Label>
                <Input
                  id="location_rent"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="תל אביב, חיפה..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_rent">תיאור</Label>
                <Textarea
                  id="description_rent"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="פרטים נוספים על הציוד..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url_rent">קישור לתמונה</Label>
                <Input
                  id="image_url_rent"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </TabsContent>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "מפרסם..." : "פרסם מודעה"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
