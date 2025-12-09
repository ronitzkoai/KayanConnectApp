import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractorLayout } from "@/components/ContractorLayout";
import { Clock, Users, CheckCircle2, List } from "lucide-react";

interface JobRequest {
  id: string;
  work_type: string;
  location: string;
  work_date: string;
  urgency: string;
  status: string;
  created_at: string;
  accepted_by: string | null;
  worker_profiles: {
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  } | null;
}

const MyJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRequest[]>([]);

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user]);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("job_requests")
      .select(`
        *,
        worker_profiles:accepted_by (
          user_id,
          profiles:user_id (
            full_name,
            phone
          )
        )
      `)
      .eq("contractor_id", user?.id)
      .order("work_date", { ascending: false });
    
    if (data) setJobs(data as any);
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
      accepted: "שובץ",
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

  const getUrgencyColor = (urgency: string) => {
    const colors: { [key: string]: string } = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[urgency] || colors.medium;
  };

  const openJobs = jobs.filter(j => j.status === "open" && !j.accepted_by);
  const assignedJobs = jobs.filter(j => j.status === "accepted" || (j.status === "open" && j.accepted_by));
  const completedJobs = jobs.filter(j => j.status === "completed");

  const renderJobCard = (job: JobRequest) => (
    <Card
      key={job.id}
      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
      onClick={() => navigate(`/contractor/jobs/${job.id}`)}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-bold">{getWorkTypeLabel(job.work_type)}</h3>
              <Badge className={getUrgencyColor(job.urgency)}>
                {getUrgencyLabel(job.urgency)}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-base text-muted-foreground flex items-center gap-2">
                <span className="font-semibold">📍 אזור:</span>
                {job.location}
              </p>
              <p className="text-base text-muted-foreground flex items-center gap-2">
                <span className="font-semibold">📅 תאריך:</span>
                {new Date(job.work_date).toLocaleDateString("he-IL")}
              </p>
              <p className="text-base text-muted-foreground flex items-center gap-2">
                <span className="font-semibold">⏰ שעה:</span>
                {new Date(job.work_date).toLocaleTimeString("he-IL", { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            <div className="pt-2">
              <Badge 
                variant={job.status === "completed" ? "secondary" : "default"}
                className="text-sm px-3 py-1"
              >
                {getStatusLabel(job.status)}
              </Badge>
            </div>
          </div>
        </div>

        {job.worker_profiles && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200">
            <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5" />
              עובד ששובץ: {job.worker_profiles.profiles.full_name}
            </p>
          </div>
        )}

        <Button variant="default" size="lg" className="w-full mt-4">
          ⚡ צפה בפרטים
        </Button>
      </CardContent>
    </Card>
  );

  const tabs = [
    { value: "open", label: "פתוחות", count: openJobs.length, icon: Clock, jobs: openJobs },
    { value: "assigned", label: "שובצו", count: assignedJobs.length, icon: Users, jobs: assignedJobs },
    { value: "completed", label: "הושלמו", count: completedJobs.length, icon: CheckCircle2, jobs: completedJobs },
  ];

  return (
    <ContractorLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 space-y-2">
          <h1 className="text-4xl font-bold">הקריאות שלי</h1>
          <p className="text-xl text-muted-foreground">ניהול וצפייה בכל קריאות העבודה שלך</p>
        </div>

        <Tabs defaultValue="open" dir="rtl" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-4 text-base font-semibold"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {tab.count}
                    </Badge>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4 mt-6">
              {tab.jobs.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                      <List className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">אין קריאות ב{tab.label}</h3>
                    <p className="text-muted-foreground mb-6 text-lg">
                      {tab.value === "open" ? "כל הקריאות כבר שובצו או הושלמו" : "טרם נוספו קריאות בקטגוריה זו"}
                    </p>
                    {tab.value === "open" && (
                      <Button 
                        onClick={() => navigate("/contractor/new-job")}
                        size="lg"
                        className="px-8"
                      >
                        פתח קריאה חדשה
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {tab.jobs.map(renderJobCard)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </ContractorLayout>
  );
};

export default MyJobs;
