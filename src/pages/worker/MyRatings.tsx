import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Clock } from "lucide-react";
import { WorkerLayout } from "@/components/WorkerLayout";

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface WorkerStats {
  rating: number;
  total_ratings: number;
}

const WorkerMyRatings = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<WorkerStats>({ rating: 0, total_ratings: 0 });

  useEffect(() => {
    if (user) {
      loadRatings();
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    const { data } = await supabase
      .from("worker_profiles")
      .select("rating, total_ratings")
      .eq("user_id", user?.id)
      .single();
    
    if (data) {
      setStats({
        rating: data.rating || 0,
        total_ratings: data.total_ratings || 0,
      });
    }
  };

  const loadRatings = async () => {
    const { data: workerData } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (workerData) {
      const { data } = await supabase
        .from("ratings")
        .select(`
          *,
          profiles:contractor_id (
            full_name
          )
        `)
        .eq("worker_id", workerData.id)
        .order("created_at", { ascending: false });
      
      if (data) setRatings(data as any);
    }
  };

  return (
    <WorkerLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">דירוגים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">המשוב שקיבלת מקבלנים</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <span className="text-2xl font-bold text-foreground">{stats.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">דירוג ממוצע</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground mb-1">{stats.total_ratings}</div>
              <p className="text-xs text-muted-foreground">סה״כ דירוגים</p>
            </CardContent>
          </Card>
        </div>

        {/* Ratings List */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">דירוגים ({ratings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">אין דירוגים עדיין</p>
                <p className="text-sm text-muted-foreground mt-1">
                  השלם עבודות כדי לקבל דירוגים
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">
                        {rating.profiles.full_name}
                      </p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {rating.review && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mb-2">
                        "{rating.review}"
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(rating.created_at).toLocaleDateString("he-IL", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </WorkerLayout>
  );
};

export default WorkerMyRatings;
