import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  contractor_id: string;
  contractor_name?: string;
  request_id: string;
}

const TechnicianRatings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [techProfile, setTechProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "technician") {
      toast.error("אין לך הרשאה לגשת לעמוד זה");
      navigate("/");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Get technician profile
    const { data: techData } = await supabase
      .from("technician_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (techData) {
      setTechProfile(techData);

      // Get ratings
      const { data: ratingsData, error } = await supabase
        .from("technician_ratings")
        .select("*")
        .eq("technician_id", techData.id)
        .order("created_at", { ascending: false });

      if (!error && ratingsData) {
        // Get contractor names
        const contractorIds = [...new Set(ratingsData.map(r => r.contractor_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", contractorIds);

        const ratingsWithNames = ratingsData.map(r => ({
          ...r,
          contractor_name: profiles?.find(p => p.id === r.contractor_id)?.full_name || "קבלן"
        }));

        setRatings(ratingsWithNames);
      }
    }

    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  if (authLoading || roleLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="w-full min-h-screen bg-background p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </TechnicianLayout>
    );
  }

  const avgRating = techProfile?.rating || 0;
  const totalRatings = techProfile?.total_ratings || 0;

  return (
    <TechnicianLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">הדירוגים שלי</h1>
          <p className="text-muted-foreground mt-1">צפה בביקורות שקיבלת מקבלנים</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Summary Card */}
        <Card className="rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-100/50 dark:from-yellow-950/30 dark:to-amber-900/20 border-yellow-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">דירוג ממוצע</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-amber-900 dark:text-amber-100">{avgRating.toFixed(1)}</span>
                  <div>
                    {renderStars(Math.round(avgRating))}
                    <p className="text-sm text-muted-foreground mt-1">{totalRatings} ביקורות</p>
                  </div>
                </div>
              </div>
              <Star className="h-16 w-16 text-yellow-500 fill-yellow-500/20" />
            </div>
          </CardContent>
        </Card>

        {/* Ratings List */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">כל הביקורות</h2>

          {ratings.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-bold mb-2">אין ביקורות עדיין</h3>
                <p className="text-muted-foreground">
                  כשתשלים עבודות ותקבל דירוגים מקבלנים, הם יופיעו כאן
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <Card key={rating.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{rating.contractor_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(rating.created_at), "d בMMMM yyyy", { locale: he })}
                          </div>
                        </div>
                      </div>
                      {renderStars(rating.rating)}
                    </div>

                    {rating.review && (
                      <p className="text-muted-foreground text-sm bg-muted/50 rounded-xl p-4">
                        "{rating.review}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </TechnicianLayout>
  );
};

export default TechnicianRatings;
