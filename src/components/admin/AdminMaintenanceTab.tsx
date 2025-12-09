import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type MaintenanceRequest = Database["public"]["Tables"]["maintenance_requests"]["Row"];

interface AdminMaintenanceTabProps {
  onUpdate: () => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "פתוח", variant: "default" },
  in_progress: { label: "בטיפול", variant: "secondary" },
  completed: { label: "הושלם", variant: "outline" },
  cancelled: { label: "בוטל", variant: "destructive" },
};

const urgencyLabels: Record<string, { label: string; color: string }> = {
  low: { label: "נמוכה", color: "text-green-600" },
  medium: { label: "בינונית", color: "text-yellow-600" },
  high: { label: "גבוהה", color: "text-red-600" },
};

const AdminMaintenanceTab = ({ onUpdate }: AdminMaintenanceTabProps) => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;
      
      toast.success("סטטוס עודכן בהצלחה");
      fetchRequests();
      onUpdate();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const filteredRequests = requests.filter((request) => {
    return statusFilter === "all" || request.status === statusFilter;
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
        <CardTitle>בקשות תחזוקה ({filteredRequests.length})</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סנן לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="open">פתוחות</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
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
                <TableHead className="text-right">סוג תחזוקה</TableHead>
                <TableHead className="text-right">ציוד</TableHead>
                <TableHead className="text-right">מיקום</TableHead>
                <TableHead className="text-right">דחיפות</TableHead>
                <TableHead className="text-right">תאריך מועדף</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3 text-muted-foreground" />
                      {request.maintenance_type}
                    </span>
                  </TableCell>
                  <TableCell>{request.equipment_name || request.equipment_type}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {request.location}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 ${urgencyLabels[request.urgency || "medium"]?.color}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {urgencyLabels[request.urgency || "medium"]?.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {request.preferred_date ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.preferred_date), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={request.status || "open"}
                      onValueChange={(value) => updateRequestStatus(request.id, value)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <Badge variant={statusLabels[request.status || "open"]?.variant}>
                          {statusLabels[request.status || "open"]?.label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">פתוח</SelectItem>
                        <SelectItem value="in_progress">בטיפול</SelectItem>
                        <SelectItem value="completed">הושלם</SelectItem>
                        <SelectItem value="cancelled">בוטל</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    לא נמצאו בקשות תחזוקה
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

export default AdminMaintenanceTab;
