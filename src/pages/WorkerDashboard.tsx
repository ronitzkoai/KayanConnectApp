import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Briefcase, MapPin, Calendar, Clock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { WorkerLayout } from "@/components/WorkerLayout";
import { MiniChatPanel } from "@/components/MiniChatPanel";
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
  service_type: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const similarFields: Record<string, string[]> = {
  backhoe: ['mini_excavator', 'loader'],
  mini_excavator: ['backhoe', 'bobcat'],
  loader: ['backhoe', 'bobcat'],
  bobcat: ['mini_excavator', 'loader'],
  grader: ['loader'],
  truck_driver: ['semi_trailer'],
  semi_trailer: ['truck_driver'],
  laborer: [],
};

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [availableJobs, setAvailableJobs] = useState<JobRequest[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<JobRequest[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'nearby' | 'myField' | 'today'>('all');
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && workerProfile) {
      loadAvailableJobs();
      loadAcceptedJobs();
    }
  }, [user, workerProfile]);

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(profileData);

    const { data: workerData } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (workerData) {
      setWorkerProfile(workerData);
    }
  };

  useEffect(() => {
    if (!roleLoading && role && role !== "worker") {
      toast.error("אין לך הרשאה לגשת לעמוד זה");
      navigate("/");
    }
  }, [role, roleLoading, navigate]);

  const loadAvailableJobs = async () => {
    if (!workerProfile) return;
    setIsLoadingJobs(true);

    const { data } = await supabase
      .from("job_requests")
      .select(`
        *,
        profiles:contractor_id (full_name, phone)
      `)
      .eq("status", "open")
      .or(`work_type.eq.${workerProfile.work_type},work_type.eq.laborer`)
      .order("created_at", { ascending: false });
    
    if (data) setAvailableJobs(data as any);
    setIsLoadingJobs(false);
  };

  const loadAcceptedJobs = async () => {
    if (!workerProfile) return;

    const { data } = await supabase
      .from("job_requests")
      .select(`
        *,
        profiles:contractor_id (full_name, phone)
      `)
      .eq("accepted_by", workerProfile.id)
      .eq("status", "accepted")
      .gte("work_date", new Date().toISOString())
      .order("work_date", { ascending: true })
      .limit(3);

    if (data) setAcceptedJobs(data as any);
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
      loadAvailableJobs();
      loadAcceptedJobs();
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

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return "היום";
    if (date.getTime() === tomorrow.getTime()) return "מחר";
    
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  };

  const isSimilarField = (jobWorkType: string) => {
    if (!workerProfile) return false;
    const workerType = workerProfile.work_type;
    return similarFields[workerType]?.includes(jobWorkType) || false;
  };

  const getFilteredJobs = () => {
    let filtered = availableJobs;
    
    if (workerProfile) {
      filtered = filtered.filter(job => {
        if (workerProfile.has_own_equipment) {
          return job.service_type === 'operator_with_equipment';
        } else {
          return job.service_type === 'operator_only' || job.service_type === 'operator_with_equipment';
        }
      });
    }
    
    if (filter === 'myField' && workerProfile) {
      filtered = filtered.filter(job => 
        job.work_type === workerProfile.work_type ||
        isSimilarField(job.work_type)
      );
    } else if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.work_date);
        jobDate.setHours(0, 0, 0, 0);
        return jobDate.getTime() === today.getTime();
      });
    }
    
    return filtered;
  };

  const firstName = profile?.full_name?.split(' ')[0] || profile?.full_name;

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">טוען...</div>
      </div>
    );
  };

  const filteredJobs = getFilteredJobs();

  return (
    <WorkerLayout>
      {/* Clean Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              שלום, {firstName}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">מה נעשה היום?</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
        {/* Accepted Jobs */}
        {acceptedJobs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">העבודות שלך</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/worker/jobs?tab=accepted")}
                className="text-primary text-sm h-9"
              >
                הכל
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {acceptedJobs.map(job => (
                <Card 
                  key={job.id} 
                  className="cursor-pointer hover:shadow-lg transition-all border-border hover:border-primary/50"
                  onClick={() => navigate(`/worker/jobs/${job.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-base">
                            {getWorkTypeLabel(job.work_type)}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <Calendar className="h-4 w-4" />
                            {formatRelativeDate(job.work_date)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">פעיל</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Available Jobs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              עבודות זמינות
              <span className="text-muted-foreground font-normal mr-2">({filteredJobs.length})</span>
            </h2>
          </div>

          {/* Filters */}
          <div className="flex gap-2 sm:gap-3">
            {[
              { key: 'all', label: 'הכל' },
              { key: 'myField', label: 'בתחום שלי' },
              { key: 'today', label: 'להיום' },
            ].map((f) => (
              <Button 
                key={f.key}
                variant={filter === f.key ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter(f.key as any)}
                className="h-9 sm:h-10 text-sm sm:text-base px-4 sm:px-6"
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Job Cards */}
          {isLoadingJobs ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground text-lg">אין עבודות זמינות כרגע</p>
                <p className="text-muted-foreground mt-2">נודיע לך כשיהיו הזדמנויות חדשות</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.slice(0, 6).map((job) => {
                const isUrgent = job.urgency === 'urgent' || job.urgency === 'high';
                
                return (
                  <Card 
                    key={job.id} 
                    className={cn(
                      "cursor-pointer hover:shadow-lg transition-all border-border hover:border-primary/50",
                      isUrgent && "border-warning/50 bg-warning/5"
                    )}
                    onClick={() => navigate(`/worker/jobs/${job.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                            isUrgent ? "bg-warning/20" : "bg-muted"
                          )}>
                            <Briefcase className={cn(
                              "h-6 w-6",
                              isUrgent ? "text-warning" : "text-muted-foreground"
                            )} />
                          </div>
                          {isUrgent && (
                            <Badge variant="outline" className="text-xs border-warning text-warning bg-warning/10">
                              דחוף
                            </Badge>
                          )}
                        </div>
                        
                        <div>
                          <p className="font-semibold text-foreground text-base">
                            {getWorkTypeLabel(job.work_type)}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1.5">
                            <MapPin className="h-4 w-4 shrink-0" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <Calendar className="h-4 w-4" />
                            {formatRelativeDate(job.work_date)}
                          </div>
                        </div>
                        
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptJob(job.id);
                          }}
                          className="w-full h-11 text-base"
                        >
                          <CheckCircle className="h-5 w-5 ml-2" />
                          אשר עבודה
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredJobs.length > 6 && (
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => navigate("/worker/jobs")}
            >
              צפה בכל העבודות ({filteredJobs.length})
              <ChevronLeft className="h-5 w-5 mr-2" />
            </Button>
          )}
        </section>
      </main>

      <MiniChatPanel />
    </WorkerLayout>
  );
};

export default WorkerDashboard;
