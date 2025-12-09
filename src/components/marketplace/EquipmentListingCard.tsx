import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Heart } from "lucide-react";
import { useState } from "react";

interface EquipmentListingCardProps {
  item: any;
  type: "sale" | "rent";
}

export const EquipmentListingCard = ({ item, type }: EquipmentListingCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const price = type === "sale" 
    ? `₪${item.price?.toLocaleString()}`
    : `₪${item.daily_rate?.toLocaleString()}/יום`;

  const imageUrl = item.image_url || "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400";

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground group-hover:text-orange-600 transition-colors line-clamp-1">
                {item.equipment_type} {item.brand} {item.model}
              </h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {item.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {item.year}
                  </span>
                )}
                {type === "sale" && item.hours_used && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.hours_used.toLocaleString()} שעות
                  </span>
                )}
                {item.condition && (
                  <span>• {item.condition}</span>
                )}
              </div>
            </div>

            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorite(!isFavorite);
              }}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Heart
                className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
              />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{item.location}</span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {type === "sale" && !item.is_sold && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                זמין
              </Badge>
            )}
            {type === "rent" && item.is_available && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
                זמין להשכרה
              </Badge>
            )}
            {item.brand && (
              <Badge variant="outline">
                {item.brand}
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="pt-2">
            <div className="text-2xl font-bold text-orange-600">
              {price}
            </div>
            {type === "rent" && (
              <div className="text-xs text-muted-foreground mt-1">
                {item.weekly_rate && `שבועי: ₪${item.weekly_rate.toLocaleString()} `}
                {item.monthly_rate && `• חודשי: ₪${item.monthly_rate.toLocaleString()}`}
              </div>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="w-32 md:w-48 shrink-0">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={`${item.equipment_type} ${item.brand}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
