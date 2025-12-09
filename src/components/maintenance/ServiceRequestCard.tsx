import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Calendar, 
  Wrench, 
  MessageSquare, 
  Eye, 
  Send,
  AlertTriangle,
  Clock,
  User,
  X,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface MaintenanceRequest {
  id: string;
  contractor_id: string;
  equipment_type: string;
  equipment_name: string | null;
  maintenance_type: string;
  description: string | null;
  location: string;
  preferred_date: string | null;
  urgency: string;
  status: string;
  budget_range: string | null;
  created_at: string;
  quotes_count?: number;
  images?: string[];
  manufacturer?: string;
  model?: string;
  contractor_name?: string;
}

interface ServiceRequestCardProps {
  request: MaintenanceRequest;
  isOwner: boolean;
  onViewQuotes?: () => void;
  onSubmitQuote?: () => void;
  onCancel?: () => void;
}

const equipmentLabels: Record<string, string> = {
  backhoe: "באגר",
  loader: "שופל",
  bobcat: "בובקט",
  grader: "מפלסת",
  truck: "משאית",
  excavator: "מחפרון",
  mini_backhoe: "מיני באגר",
  crane: "מנוף",
  compressor: "קומפרסור",
  generator: "גנרטור",
  other: "אחר",
};

const maintenanceLabels: Record<string, string> = {
  oil_change: "החלפת שמן",
  tire_service: "צמיגים",
  filter_change: "החלפת פילטר",
  hydraulic_service: "מערכת הידראולית",
  engine_service: "טיפול מנוע",
  cooling_system: "מערכת קירור",
  brake_service: "בלמים",
  electrical: "מערכת חשמל",
  transmission: "תיבת הילוכים",
  inspection: "בדיקה תקופתית",
  general_service: "טיפול כללי",
  repair: "תיקון",
};

export const ServiceRequestCard = ({
  request,
  isOwner,
  onViewQuotes,
  onSubmitQuote,
  onCancel,
}: ServiceRequestCardProps) => {
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return { label: "מיידי!", color: "bg-red-500 text-white", icon: AlertTriangle };
      case "high":
        return { label: "דחוף", color: "bg-orange-500 text-white", icon: AlertTriangle };
      case "medium":
        return { label: "בינוני", color: "bg-yellow-500 text-white", icon: Clock };
      case "low":
        return { label: "נמוך", color: "bg-green-500 text-white", icon: Clock };
      default:
        return { label: "בינוני", color: "bg-gray-500 text-white", icon: Clock };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return { label: "ממתין להצעות", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" };
      case "in_progress":
        return { label: "בתהליך", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" };
      case "completed":
        return { label: "נסגר", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" };
      case "cancelled":
        return { label: "בוטל", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  const urgencyConfig = getUrgencyConfig(request.urgency);
  const statusConfig = getStatusConfig(request.status);
  const UrgencyIcon = urgencyConfig.icon;

  return (
    <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group">
      {/* Header with equipment type */}
      <div className="bg-gradient-to-l from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 border-b border-border/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10">
              <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {maintenanceLabels[request.maintenance_type] || request.maintenance_type}
              </h3>
              <p className="text-sm text-muted-foreground">
                {equipmentLabels[request.equipment_type] || request.equipment_type}
                {request.equipment_name && ` - ${request.equipment_name}`}
              </p>
            </div>
          </div>
          <Badge className={urgencyConfig.color}>
            <UrgencyIcon className="h-3 w-3 ml-1" />
            {urgencyConfig.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Location & Date */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 text-teal-500" />
            {request.location}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4 text-teal-500" />
            {format(new Date(request.created_at), "dd/MM/yyyy", { locale: he })}
          </span>
        </div>

        {/* Description */}
        {request.description && (
          <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
            {request.description}
          </p>
        )}

        {/* Images Preview */}
        {request.images && request.images.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="h-4 w-4" />
            <span>{request.images.length} תמונות</span>
          </div>
        )}

        {/* Owner Info */}
        {!isOwner && request.contractor_name && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
              {request.contractor_name.charAt(0)}
            </div>
            <span className="text-muted-foreground">נפתח ע"י</span>
            <span className="font-medium">{request.contractor_name}</span>
          </div>
        )}

        {/* Quotes Count & Status */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <Badge className={statusConfig.color} variant="secondary">
            {statusConfig.label}
          </Badge>
          {(request.quotes_count || 0) > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
              <MessageSquare className="h-4 w-4" />
              {request.quotes_count} הצעות
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 sm:p-4 pt-0 gap-2">
        {isOwner ? (
          <>
            <Button 
              onClick={onViewQuotes} 
              className="flex-1 bg-teal-500 hover:bg-teal-600 rounded-xl min-h-[44px] text-sm sm:text-base"
              disabled={!request.quotes_count}
            >
              <Eye className="ml-1 sm:ml-2 h-4 w-4" />
              <span className="hidden sm:inline">הצג הצעות</span>
              <span className="sm:hidden">הצעות</span>
              <span className="mr-1">({request.quotes_count || 0})</span>
            </Button>
            {request.status === "open" && (
              <Button 
                onClick={onCancel} 
                variant="outline" 
                size="icon"
                className="rounded-xl text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <Button 
            onClick={onSubmitQuote} 
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-xl min-h-[44px] text-sm sm:text-base"
          >
            <Send className="ml-1 sm:ml-2 h-4 w-4" />
            הגש הצעת מחיר
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
