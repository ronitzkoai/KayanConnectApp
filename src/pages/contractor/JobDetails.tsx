import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Star, MapPin, Calendar, Clock, AlertCircle, CheckCircle2, Truck } from "lucide-react";
import { toast } from "sonner";
import { RatingDialog } from "@/components/RatingDialog";
import { ContractorLayout } from "@/components/ContractorLayout";

interface JobDetails {
  id: string;
  work_type: string;
  location: string;
  work_date: string;
  urgency: string;
  status: string;
  notes: string | null;
  created_at: string;
  accepted_by: string | null;
  service_type: string;
  worker_profiles: {
    id: string;
    rating: number;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  } | null;
}

const JobDetails = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  useEffect(() => {
    if (user && jobId) {
      loadJobDetails();
    }
  }, [user, jobId]);

  const loadJobDetails = async () => {
    const { data, error } = await supabase
      .from("job_requests")
      .select(`
        *,
        worker_profiles:accepted_by (
          id,
          rating,
          user_id,
          profiles:user_id (
            full_name,
            phone
          )
        )
      `)
      .eq("id", jobId)
      .eq("contractor_id", user?.id)
      .single();
    
    if (error) {
      toast.error("שגיאה בטעינת פרטי קריאה");
      navigate("/contractor/jobs");
      return;
    }
    
    if (data) setJob(data as any);
  };

  const markAsCompleted = async () => {
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "completed" })
      .eq("id", jobId);

    if (error) {
      toast.error("שגיאה בעדכון סטטוס");
    } else {
      toast.success("הקריאה סומנה כהושלמה");
      await loadJobDetails();
      setShowRatingDialog(true);
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

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: "פתוח",
      accepted: "התקבל",
      completed: "הושלם",
      cancelled: "בוטל",
    };
    return labels[status] || status;
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels: { [key: string]: string } = {
      low: "נמוכה",
      medium: "רגילה",
      high: "גבוהה",
      urgent: "דחוף",
    };
    return labels[urgency] || urgency;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      operator_with_equipment: "מפעיל + כלי",
      equipment_only: "רק כלי",
      operator_only: "רק מפעיל",
    };
    return labels[type] || type;
  };

  if (!job) {
    return (
      <ContractorLayout>
        <div className="container mx-auto px-4 py-8">
          <p>טוען...</p>
        </div>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">פרטי קריאה</h1>
          <div className="flex items-center gap-3">
            <Badge 
              variant={job.status === "completed" ? "secondary" : "default"}
              className="text-lg px-4 py-2"
            >
              {getStatusLabel(job.status)}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {getUrgencyLabel(job.urgency)}
            </Badge>
          </div>
        </div>

        {/* Worker Card (if assigned) - FIRST PRIORITY */}
        {job.worker_profiles && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-900/20 border-2 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span>עובד ששובץ לקריאה</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">
                  {job.worker_profiles.profiles.full_name}
                </h3>
                <div className="flex items-center gap-3 text-base">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg">{job.worker_profiles.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">דירוג</span>
                </div>
                <p className="text-base text-muted-foreground">
                  {getWorkTypeLabel(job.work_type)}
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => window.location.href = `tel:${job.worker_profiles?.profiles.phone}`}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  <Phone className="ml-2 h-5 w-5" />
                  התקשר לעובד: {job.worker_profiles.profiles.phone}
                </Button>

                <Button
                  onClick={() => navigate(`/contractor/workers/${job.worker_profiles?.user_id}`)}
                  className="w-full h-14 text-lg"
                  variant="outline"
                  size="lg"
                >
                  צפה בפרופיל המלא של העובד
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Info Block */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">פרטי העבודה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-base text-muted-foreground font-medium">סוג עבודה</p>
                <p className="font-bold text-2xl">{getWorkTypeLabel(job.work_type)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-base text-muted-foreground font-medium">סוג שירות</p>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {getServiceTypeLabel(job.service_type)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-base text-muted-foreground font-medium">רמת דחיפות</p>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {getUrgencyLabel(job.urgency)}
                </Badge>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground font-medium">מיקום</p>
                  <p className="font-semibold text-lg">{job.location}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-base text-muted-foreground font-medium">תאריך</p>
                    <p className="font-semibold text-lg">
                      {new Date(job.work_date).toLocaleDateString("he-IL", {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-base text-muted-foreground font-medium">שעה</p>
                    <p className="font-semibold text-lg">
                      {new Date(job.work_date).toLocaleTimeString("he-IL", { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {job.notes && (() => {
              try {
                const parsedNotes = JSON.parse(job.notes);
                if (parsedNotes.type === "sand_delivery") {
                  return (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2 mb-3">
                          <Truck className="h-5 w-5 text-amber-600" />
                          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">פרטי משלוח חול</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">כמות משאיות</p>
                            <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{parsedNotes.quantity}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">סוג חול</p>
                            <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{parsedNotes.sandType}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                }
              } catch (e) {
                // Not JSON or not sand delivery, show as regular notes
              }
              return (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <p className="text-base text-muted-foreground font-medium">הערות נוספות</p>
                    <p className="text-base leading-relaxed p-4 bg-muted rounded-lg">{job.notes}</p>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Status Message */}
        {job.status === "open" && !job.accepted_by && (
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-900/20 border-2">
            <CardContent className="flex items-start gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg text-orange-900 dark:text-orange-100">
                  מחכים לעובד שיאשר את הקריאה
                </p>
                <p className="text-base text-orange-800 dark:text-orange-200">
                  עובדים זמינים יכולים לראות את הקריאה ולאשר אותה. תקבל התראה כשעובד יאשר.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mark as Completed Action */}
        {job.status === "accepted" && job.accepted_by && (
          <Card className="border-green-300 border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">סיום העבודה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-base text-muted-foreground">
                העבודה הושלמה? סמן את הקריאה כהושלמה ודרג את העובד
              </p>
              <Button
                onClick={markAsCompleted}
                className="w-full h-16 text-xl"
                size="lg"
              >
                🟢 סמן קריאה כהושלמה
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rating Dialog */}
        {showRatingDialog && job.accepted_by && job.worker_profiles && (
          <RatingDialog
            open={showRatingDialog}
            onOpenChange={setShowRatingDialog}
            jobId={job.id}
            workerId={job.accepted_by}
            contractorId={user!.id}
            workerName={job.worker_profiles.profiles.full_name}
          />
        )}
      </div>
    </ContractorLayout>
  );
};

export default JobDetails;
