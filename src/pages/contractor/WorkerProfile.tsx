import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Phone, Star, CheckCircle, Briefcase } from "lucide-react";

interface WorkerProfile {
  id: string;
  user_id: string;
  work_type: string;
  location: string | null;
  rating: number;
  total_ratings: number;
  experience_years: number;
  is_verified: boolean;
  profiles: {
    full_name: string;
    phone: string;
  };
}

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

const WorkerProfile = () => {
  const navigate = useNavigate();
  const { workerId } = useParams();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    if (workerId) {
      loadWorkerProfile();
      loadRatings();
    }
  }, [workerId]);

  const loadWorkerProfile = async () => {
    const { data } = await supabase
      .from("worker_profiles")
      .select(`
        *,
        profiles:user_id (
          full_name,
          phone
        )
      `)
      .eq("user_id", workerId)
      .single();
    
    if (data) setWorker(data as any);
  };

  const loadRatings = async () => {
    const { data: workerData } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", workerId)
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
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) setRatings(data as any);
    }
  };

  const getWorkTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      backhoe: "באגר",
      loader: "שופל",
      bobcat: "בובקט",
      grader: "מפלסת",
      truck_driver: "נהג משאית",
      semi_trailer: "סמי טריילר",
      laborer: "פועל",
    };
    return labels[type] || type;
  };

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/contractor/workers")}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">פרופיל עובד</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-3xl font-bold">{worker.profiles.full_name}</h2>
                    {worker.is_verified && (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground">
                    {getWorkTypeLabel(worker.work_type)}
                  </p>
                </div>
                <Button onClick={() => window.open(`tel:${worker.profiles.phone}`)}>
                  <Phone className="ml-2 h-4 w-4" />
                  התקשר
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-accent/30 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                    <span className="text-2xl font-bold">{worker.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">דירוג ממוצע</p>
                </div>
                <div className="p-4 bg-accent/30 rounded-lg">
                  <div className="text-2xl font-bold mb-1">{worker.total_ratings}</div>
                  <p className="text-sm text-muted-foreground">דירוגים</p>
                </div>
                <div className="p-4 bg-accent/30 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Briefcase className="h-5 w-5" />
                    <span className="text-2xl font-bold">{worker.experience_years}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">שנות ניסיון</p>
                </div>
              </div>

              {worker.location && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">אזורי עבודה</p>
                    <Badge variant="outline">{worker.location}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>פעולות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate("/contractor/new-job")}
              >
                פתח קריאה חדשה לעובד זה
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`tel:${worker.profiles.phone}`)}
              >
                <Phone className="ml-2 h-4 w-4" />
                {worker.profiles.phone}
              </Button>
            </CardContent>
          </Card>

          {/* Ratings Card */}
          <Card>
            <CardHeader>
              <CardTitle>דירוגים ({ratings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {ratings.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  אין דירוגים עדיין
                </p>
              ) : (
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{rating.profiles.full_name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < rating.rating
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rating.review && (
                        <p className="text-sm text-muted-foreground">{rating.review}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(rating.created_at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WorkerProfile;
