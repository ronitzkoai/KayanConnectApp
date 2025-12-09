import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Phone, CheckCircle, MapPin, Calendar, AlertCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { WorkerLayout } from "@/components/WorkerLayout";
import { cn } from "@/lib/utils";

interface JobDetails {
  id: string;
  work_type: string;
  location: string;
  work_date: string;
  urgency: string;
  status: string;
  notes: string | null;
  created_at: string;
  service_type: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const WorkerJobDetails = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [completingJob, setCompletingJob] = useState(false);

  useEffect(() => {
    if (user && jobId) {
      loadWorkerProfile();
      loadJobDetails();
    }
  }, [user, jobId]);

  const loadWorkerProfile = async () => {
    const { data } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    
    if (data) setWorkerProfile(data);
  };

  const loadJobDetails = async () => {
    const { data, error } = await supabase
      .from("job_requests")
      .select(`
        *,
        profiles:contractor_id (
          full_name,
          phone
        )
      `)
      .eq("id", jobId)
      .single();
    
    if (error) {
      toast.error("שגיאה בטעינת פרטי קריאה");
      navigate("/worker/jobs");
      return;
    }
    
    if (data) setJob(data as any);
  };

  const handleAcceptJob = async () => {
    if (!workerProfile) {
      toast.error("נדרש להשלים פרופיל עובד");
      return;
    }

    const { error } = await supabase
      .from("job_requests")
      .update({
        status: "accepted",
        accepted_by: workerProfile.id,
      })
      .eq("id", jobId)
      .eq("status", "open");

    if (error) {
      toast.error("הקריאה כבר נלקחה או שגיאה אחרת");
    } else {
      toast.success("אישרת את העבודה בהצלחה!");
      loadJobDetails();
    }
  };

  const handleCompleteJob = async () => {
    if (!workerProfile) return;
    
    setCompletingJob(true);
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "completed" })
      .eq("id", jobId)
      .eq("accepted_by", workerProfile.id);

    if (error) {
      toast.error("שגיאה בסיום העבודה");
    } else {
      toast.success("העבודה סומנה כהושלמה!");
      loadJobDetails();
    }
    setCompletingJob(false);
  };

  const getWorkTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      backhoe: "באגר",
      loader: "שופל",
      bobcat: "בובקט",
      grader: "מפלסת",
      excavator: "מחפרון",
      mini_excavator: "מיני מחפרון",
      mini_backhoe: "מיני באגר",
      wheeled_backhoe: "באגר גלגלים",
      telescopic_loader: "מעמיס טלסקופי",
      breaker: "פטישון",
      full_trailer: "פול טריילר",
      semi_trailer: "סמי טריילר",
      bathtub: "אמבטיה",
      double: "דאבל",
      flatbed: "רמסע",
      laborer: "פועל",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: "פתוח",
      accepted: "פעיל",
      completed: "הושלם",
      cancelled: "בוטל",
    };
    return labels[status] || status;
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
      <WorkerLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">טוען...</div>
        </div>
      </WorkerLayout>
    );
  }

  const isUrgent = job.urgency === 'urgent' || job.urgency === 'high';

  return (
    <WorkerLayout>
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/worker/jobs")}
              className="h-9 w-9"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{getWorkTypeLabel(job.work_type)}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">{getStatusLabel(job.status)}</Badge>
                {isUrgent && (
                  <Badge variant="outline" className="text-xs border-warning text-warning">דחוף</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Main Info */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs">מיקום</span>
                </div>
                <p className="font-medium text-foreground">{job.location}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">תאריך</span>
                </div>
                <p className="font-medium text-foreground">
                  {new Date(job.work_date).toLocaleDateString("he-IL")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-border rounded-lg">
                <span className="text-xs text-muted-foreground">סוג שירות</span>
                <p className="text-sm font-medium mt-0.5">{getServiceTypeLabel(job.service_type)}</p>
              </div>
              <div className="p-3 border border-border rounded-lg">
                <span className="text-xs text-muted-foreground">פורסם</span>
                <p className="text-sm font-medium mt-0.5">
                  {new Date(job.created_at).toLocaleDateString("he-IL")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {job.notes && (
          <Card className="border-border">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground">הערות</span>
              <p className="text-sm text-foreground mt-1">{job.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Contractor */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{job.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground font-mono" dir="ltr">
                    {job.profiles.phone}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => window.open(`tel:${job.profiles.phone}`)}
              >
                <Phone className="h-4 w-4 ml-1.5" />
                התקשר
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action */}
        {job.status === "open" && (
          <Button
            onClick={handleAcceptJob}
            className="w-full h-14 text-lg font-semibold"
            disabled={!workerProfile}
          >
            <CheckCircle className="ml-2 h-6 w-6" />
            אשר את העבודה
          </Button>
        )}

        {job.status === "accepted" && (
          <div className="space-y-3">
            <Button
              onClick={handleCompleteJob}
              className="w-full h-14 text-lg font-semibold bg-success hover:bg-success/90"
              disabled={completingJob}
            >
              <CheckCircle className="ml-2 h-6 w-6" />
              סיים עבודה
            </Button>
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4 text-center">
                <p className="font-medium text-success">אישרת עבודה זו</p>
                <p className="text-sm text-success/80 mt-0.5">לחץ על "סיים עבודה" כשתסיים</p>
              </CardContent>
            </Card>
          </div>
        )}

        {job.status === "completed" && (
          <Card className="border-border bg-muted/50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-foreground">העבודה הושלמה</p>
              <p className="text-sm text-muted-foreground mt-1">תודה על השירות!</p>
            </CardContent>
          </Card>
        )}
      </main>
    </WorkerLayout>
  );
};

export default WorkerJobDetails;
