import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type JobRequest = Database["public"]["Tables"]["job_requests"]["Row"];

interface AdminJobsTabProps {
  onUpdate: () => void;
}

const workTypeLabels: Record<string, string> = {
  backhoe: "באגר",
  bobcat: "בובקט",
  truck: "משאית",
  grader: "מפלסת",
  loader: "שופל",
  excavator: "מחפרון",
  mini_backhoe: "מיני באגר",
  wheeled_backhoe: "באגר גלגלים",
  telescopic_loader: "מעמיס טלסקופי",
  laborer: "פועל",
  breaker: "פטישון",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "פתוח", variant: "default" },
  accepted: { label: "מאושר", variant: "secondary" },
  completed: { label: "הושלם", variant: "outline" },
  cancelled: { label: "בוטל", variant: "destructive" },
};

const AdminJobsTab = ({ onUpdate }: AdminJobsTabProps) => {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("job_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: "open" | "accepted" | "completed" | "cancelled") => {
    try {
      const { error } = await supabase
        .from("job_requests")
        .update({ status: newStatus })
        .eq("id", jobId);

      if (error) throw error;
      
      toast.success("סטטוס עודכן בהצלחה");
      fetchJobs();
      onUpdate();
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm("האם למחוק את הקריאה?")) return;
    
    try {
      const { error } = await supabase
        .from("job_requests")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
      
      toast.success("הקריאה נמחקה");
      fetchJobs();
      onUpdate();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("שגיאה במחיקת הקריאה");
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.location?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>קריאות עבודה ({filteredJobs.length})</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי מיקום..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סנן לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="open">פתוחות</SelectItem>
              <SelectItem value="accepted">מאושרות</SelectItem>
              <SelectItem value="completed">הושלמו</SelectItem>
              <SelectItem value="cancelled">בוטלו</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">סוג עבודה</TableHead>
                <TableHead className="text-right">מיקום</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {workTypeLabels[job.work_type] || job.work_type}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {job.location}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(job.work_date), "dd/MM/yyyy HH:mm")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={job.status || "open"}
                      onValueChange={(value) => updateJobStatus(job.id, value as "open" | "accepted" | "completed" | "cancelled")}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <Badge variant={statusLabels[job.status || "open"]?.variant}>
                          {statusLabels[job.status || "open"]?.label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">פתוח</SelectItem>
                        <SelectItem value="accepted">מאושר</SelectItem>
                        <SelectItem value="completed">הושלם</SelectItem>
                        <SelectItem value="cancelled">בוטל</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteJob(job.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    לא נמצאו קריאות
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminJobsTab;
