import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface EquipmentFiltersProps {
  filters: {
    minPrice: number;
    maxPrice: number;
    minYear: number;
    maxYear: number;
    location: string;
    brand: string;
  };
  onFiltersChange: (filters: any) => void;
}

export const EquipmentFilters = ({ filters, onFiltersChange }: EquipmentFiltersProps) => {
  const resetFilters = () => {
    onFiltersChange({
      minPrice: 0,
      maxPrice: 1000000,
      minYear: 2000,
      maxYear: new Date().getFullYear(),
      location: "",
      brand: "",
    });
  };

  return (
    <Card className="sticky top-32">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">סינון</CardTitle>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
          <X className="h-4 w-4" />
          אפס
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label>טווח מחירים</Label>
          <Slider
            value={[filters.minPrice, filters.maxPrice]}
            min={0}
            max={1000000}
            step={10000}
            onValueChange={([min, max]) =>
              onFiltersChange({ ...filters, minPrice: min, maxPrice: max })
            }
            className="py-4"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>₪{filters.minPrice.toLocaleString()}</span>
            <span>-</span>
            <span>₪{filters.maxPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Year Range */}
        <div className="space-y-3">
          <Label>שנת ייצור</Label>
          <Slider
            value={[filters.minYear, filters.maxYear]}
            min={2000}
            max={new Date().getFullYear()}
            step={1}
            onValueChange={([min, max]) =>
              onFiltersChange({ ...filters, minYear: min, maxYear: max })
            }
            className="py-4"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{filters.minYear}</span>
            <span>-</span>
            <span>{filters.maxYear}</span>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">מיקום</Label>
          <Input
            id="location"
            placeholder="הזן עיר או אזור"
            value={filters.location}
            onChange={(e) =>
              onFiltersChange({ ...filters, location: e.target.value })
            }
          />
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <Label htmlFor="brand">יצרן</Label>
          <Input
            id="brand"
            placeholder="CAT, Volvo, Komatsu..."
            value={filters.brand}
            onChange={(e) =>
              onFiltersChange({ ...filters, brand: e.target.value })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};
