import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Star, 
  Clock, 
  MessageSquare, 
  Phone, 
  CheckCircle,
  Banknote,
  Wrench
} from "lucide-react";

interface TechnicianQuote {
  id: string;
  provider_id: string;
  price: number;
  description: string | null;
  availability: string | null;
  estimated_duration: string | null;
  arrival_time: string | null;
  status: string;
  created_at: string;
  provider?: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
  rating?: number;
  total_ratings?: number;
  specializations?: string[];
}

interface TechnicianQuoteCardProps {
  quote: TechnicianQuote;
  onSelect: () => void;
  onChat: () => void;
  onCall: () => void;
  isSelected?: boolean;
}

export const TechnicianQuoteCard = ({
  quote,
  onSelect,
  onChat,
  onCall,
  isSelected = false,
}: TechnicianQuoteCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card 
      className={`rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${
        isSelected 
          ? "border-2 border-teal-500 bg-teal-50/50 dark:bg-teal-950/20" 
          : "border-border/50"
      }`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Technician Info Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-white shadow-md">
            <AvatarImage src={quote.provider?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-teal-400 to-emerald-500 text-white font-bold text-lg">
              {quote.provider?.full_name ? getInitials(quote.provider.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg truncate">
              {quote.provider?.full_name || "טכנאי"}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {quote.rating ? (
                <>
                  {renderStars(quote.rating)}
                  <span className="text-sm text-muted-foreground">
                    ({quote.total_ratings || 0})
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">טכנאי חדש</span>
              )}
            </div>
          </div>
          {quote.status === "accepted" && (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="h-3 w-3 ml-1" />
              נבחר
            </Badge>
          )}
        </div>

        {/* Specializations */}
        {quote.specializations && quote.specializations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quote.specializations.slice(0, 3).map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                <Wrench className="h-3 w-3 ml-1" />
                {spec}
              </Badge>
            ))}
            {quote.specializations.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{quote.specializations.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Quote Description */}
        {quote.description && (
          <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-xl">
            "{quote.description}"
          </p>
        )}

        {/* Price & Timing */}
        <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-l from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 rounded-xl">
          <div>
            <p className="text-sm text-muted-foreground">מחיר</p>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              ₪{quote.price.toLocaleString()}
            </p>
          </div>
          {quote.arrival_time && (
            <div className="text-left">
              <p className="text-sm text-muted-foreground">זמן הגעה</p>
              <p className="font-semibold flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {quote.arrival_time}
              </p>
            </div>
          )}
        </div>

        {/* Duration */}
        {quote.estimated_duration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>משך עבודה משוער: {quote.estimated_duration}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={onSelect}
            className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-xl"
            disabled={quote.status === "accepted"}
          >
            <CheckCircle className="ml-2 h-4 w-4" />
            בחר טכנאי
          </Button>
          <Button 
            onClick={onChat}
            variant="outline"
            size="icon"
            className="rounded-xl"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          {quote.provider?.phone && (
            <Button 
              onClick={onCall}
              variant="outline"
              size="icon"
              className="rounded-xl"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
