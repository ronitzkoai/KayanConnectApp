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
import { toast } from "sonner";
import { Loader2, FileText, Banknote, Clock, Calendar, User, CheckCircle, X } from "lucide-react";

interface Quote {
  id: string;
  provider_id: string;
  price: number;
  estimated_duration: string | null;
  availability: string | null;
  description: string | null;
  status: string;
  created_at: string;
  provider_name?: string;
}

interface ViewQuotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  equipmentInfo: string;
  onQuoteAccepted?: () => void;
}

export const ViewQuotesModal = ({ 
  open, 
  onOpenChange, 
  requestId,
  equipmentInfo,
  onQuoteAccepted
}: ViewQuotesModalProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open && requestId) {
      loadQuotes();
    }
  }, [open, requestId]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("maintenance_quotes")
        .select("*")
        .eq("request_id", requestId)
        .order("price", { ascending: true });

      if (error) throw error;

      // Fetch provider names
      const quotesWithNames = await Promise.all(
        (data || []).map(async (quote) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", quote.provider_id)
            .single();
          return {
            ...quote,
            provider_name: profile?.full_name || "ספק",
          };
        })
      );

      setQuotes(quotesWithNames);
    } catch (error) {
      toast.error("שגיאה בטעינת הצעות");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    setActionLoading(quoteId);
    try {
      // Accept this quote
      await supabase
        .from("maintenance_quotes")
        .update({ status: "accepted" })
        .eq("id", quoteId);

      // Reject all other quotes
      await supabase
        .from("maintenance_quotes")
        .update({ status: "rejected" })
        .eq("request_id", requestId)
        .neq("id", quoteId);

      // Update request status
      await supabase
        .from("maintenance_requests")
        .update({ status: "in_progress" })
        .eq("id", requestId);

      toast.success("ההצעה אושרה! הספק יקבל התראה.");
      onOpenChange(false);
      onQuoteAccepted?.();
    } catch (error) {
      toast.error("שגיאה באישור ההצעה");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    setActionLoading(quoteId);
    try {
      await supabase
        .from("maintenance_quotes")
        .update({ status: "rejected" })
        .eq("id", quoteId);

      toast.success("ההצעה נדחתה");
      loadQuotes();
    } catch (error) {
      toast.error("שגיאה בדחיית ההצעה");
    } finally {
      setActionLoading(null);
    }
  };

  const getDurationLabel = (duration: string | null) => {
    const labels: Record<string, string> = {
      "1_hour": "עד שעה",
      "2_hours": "2-3 שעות",
      "half_day": "חצי יום",
      "full_day": "יום עבודה",
      "multiple_days": "מספר ימים",
    };
    return duration ? labels[duration] || duration : "";
  };

  const getAvailabilityLabel = (availability: string | null) => {
    const labels: Record<string, string> = {
      "immediate": "זמין מיד",
      "today": "היום",
      "tomorrow": "מחר",
      "this_week": "השבוע",
      "next_week": "שבוע הבא",
      "custom": "לפי תיאום",
    };
    return availability ? labels[availability] || availability : "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            הצעות מחיר
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {equipmentInfo}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">עדיין לא התקבלו הצעות מחיר</p>
              <p className="text-sm text-muted-foreground mt-1">
                ספקים יוכלו לראות את הקריאה ולהגיש הצעות
              </p>
            </div>
          ) : (
            quotes.map((quote, index) => (
              <Card 
                key={quote.id} 
                className={`${
                  quote.status === "accepted" 
                    ? "border-green-500 bg-green-50/50 dark:bg-green-900/10" 
                    : quote.status === "rejected"
                    ? "border-red-300 opacity-60"
                    : index === 0 ? "border-primary" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{quote.provider_name}</span>
                        {index === 0 && quote.status === "pending" && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            הזול ביותר
                          </Badge>
                        )}
                        {quote.status === "accepted" && (
                          <Badge className="bg-green-600">אושר</Badge>
                        )}
                        {quote.status === "rejected" && (
                          <Badge variant="destructive">נדחה</Badge>
                        )}
                      </div>
                      
                      <div className="text-3xl font-bold text-primary flex items-center gap-1">
                        <Banknote className="h-6 w-6" />
                        ₪{quote.price.toLocaleString()}
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {quote.estimated_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getDurationLabel(quote.estimated_duration)}
                          </span>
                        )}
                        {quote.availability && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {getAvailabilityLabel(quote.availability)}
                          </span>
                        )}
                      </div>

                      {quote.description && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {quote.description}
                        </p>
                      )}
                    </div>

                    {quote.status === "pending" && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptQuote(quote.id)}
                          disabled={actionLoading === quote.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === quote.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 ml-1" />
                              אשר
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectQuote(quote.id)}
                          disabled={actionLoading === quote.id}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4 ml-1" />
                          דחה
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
