import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Briefcase, Phone, MapPin, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { WorkerLayout } from "@/components/WorkerLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface JobRequest {
  id: string;
  work_type: string;
  location: string;
  work_date: string;
  urgency: string;
  status: string;
  contractor_id: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const WorkerMyJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [availableJobs, setAvailableJobs] = useState<JobRequest[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<JobRequest[]>([]);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const defaultTab = searchParams.get("tab") === "accepted" ? "accepted" : "available";

  useEffect(() => {
    if (user) {
      loadWorkerProfile();
    }
  }, [user]);

  useEffect(() => {
    if (workerProfile) {
      loadJobs();
    }
  }, [workerProfile]);

  const loadWorkerProfile = async () => {
    const { data } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    
    if (data) setWorkerProfile(data);
  };

  const loadJobs = async () => {
    if (!workerProfile) return;
    setIsLoading(true);

    const { data: available } = await supabase
      .from("job_requests")
      .select(`
        *,
        profiles:contractor_id (full_name, phone)
      `)
      .eq("status", "open")
      .or(`work_type.eq.${workerProfile.work_type},work_type.eq.laborer`)
      .order("created_at", { ascending: false });
    
    if (available) setAvailableJobs(available as any);

    const { data: accepted } = await supabase
      .from("job_requests")
      .select(`
        *,
        profiles:contractor_id (full_name, phone)
      `)
      .eq("accepted_by", workerProfile?.id)
      .in("status", ["accepted", "completed"])
      .order("created_at", { ascending: false });
    
    if (accepted) setAcceptedJobs(accepted as any);
    setIsLoading(false);
  };

  const handleAcceptJob = async (jobId: string) => {
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
      loadJobs();
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
      mini_excavator: "מיני מחפר",
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  const JobCard = ({ job, showAcceptButton = false }: { job: JobRequest; showAcceptButton?: boolean }) => {
    const isUrgent = job.urgency === 'urgent' || job.urgency === 'high';
    
    return (
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-all border-border",
          isUrgent && showAcceptButton && "border-warning/50 bg-warning/5"
        )}
        onClick={() => navigate(`/worker/jobs/${job.id}`)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  isUrgent && showAcceptButton ? "bg-warning/20" : "bg-muted"
                )}>
                  <Briefcase className={cn(
                    "h-5 w-5",
                    isUrgent && showAcceptButton ? "text-warning" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">
                      {getWorkTypeLabel(job.work_type)}
                    </h3>
                    {isUrgent && showAcceptButton && (
                      <Badge variant="outline" className="text-[10px] h-5 border-warning text-warning">
                        דחוף
                      </Badge>
                    )}
                  </div>
                  {!showAcceptButton && (
                    <Badge variant={getStatusVariant(job.status)} className="text-xs mt-1">
                      {getStatusLabel(job.status)}
                    </Badge>
                  )}
                </div>
              </div>
              
              {showAcceptButton && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptJob(job.id);
                  }}
                  disabled={!workerProfile?.is_available}
                  size="sm"
                  className="h-9 shrink-0"
                >
                  <CheckCircle className="ml-1.5 h-4 w-4" />
                  אשר
                </Button>
              )}
            </div>
            
            {/* Details */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(job.work_date).toLocaleDateString("he-IL")}
              </span>
            </div>
            
            {/* Contractor */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {job.profiles.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{job.profiles.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono" dir="ltr">{job.profiles.phone}</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${job.profiles.phone}`);
                }}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <Card className="border-dashed border-border">
      <CardContent className="py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <WorkerLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">עבודות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">קריאות זמינות והעבודות שלך</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue={defaultTab} dir="rtl" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted">
            <TabsTrigger 
              value="available" 
              className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              זמינות ({availableJobs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="accepted" 
              className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              שלי ({acceptedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-0 space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : availableJobs.length === 0 ? (
              <EmptyState 
                title="אין קריאות זמינות כרגע" 
                subtitle="נודיע לך כשיהיו הזדמנויות חדשות" 
              />
            ) : (
              availableJobs.map((job) => (
                <JobCard key={job.id} job={job} showAcceptButton />
              ))
            )}
          </TabsContent>

          <TabsContent value="accepted" className="mt-0 space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : acceptedJobs.length === 0 ? (
              <EmptyState 
                title="אין עבודות פעילות" 
                subtitle="בדוק את הקריאות הזמינות" 
              />
            ) : (
              acceptedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </WorkerLayout>
  );
};

export default WorkerMyJobs;
