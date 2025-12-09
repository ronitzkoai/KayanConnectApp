import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CreditCard, User } from "lucide-react";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

interface SubscriptionWithProfile extends Subscription {
  profile?: { full_name: string; phone: string | null };
  role?: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  trial: { label: "ניסיון", variant: "default" },
  active: { label: "פעיל", variant: "secondary" },
  cancelled: { label: "בוטל", variant: "destructive" },
  expired: { label: "פג תוקף", variant: "outline" },
};

const AdminSubscriptionsTab = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;

      // Get profiles and roles for all users
      const userIds = subs?.map((s) => s.user_id) || [];
      
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("*").in("id", userIds),
        supabase.from("user_roles").select("*").in("user_id", userIds),
      ]);

      const subsWithProfiles = subs?.map((sub) => {
        const profile = profilesResult.data?.find((p) => p.id === sub.user_id);
        const role = rolesResult.data?.find((r) => r.user_id === sub.user_id);
        return {
          ...sub,
          profile: profile ? { full_name: profile.full_name, phone: profile.phone } : undefined,
          role: role?.role,
        };
      }) || [];

      setSubscriptions(subsWithProfiles);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    return statusFilter === "all" || sub.status === statusFilter;
  });

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      contractor: "קבלן",
      worker: "עובד",
    };
    return labels[role || ""] || role || "-";
  };

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
        <CardTitle>מנויים ({filteredSubscriptions.length})</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סנן לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="trial">ניסיון</SelectItem>
              <SelectItem value="active">פעילים</SelectItem>
              <SelectItem value="cancelled">מבוטלים</SelectItem>
              <SelectItem value="expired">פג תוקף</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">משתמש</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="text-right">תוכנית</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">סיום ניסיון</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {sub.profile?.full_name || "ללא שם"}
                    </span>
                  </TableCell>
                  <TableCell>{getRoleLabel(sub.role)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      {sub.plan_type === "monthly" ? "חודשי" : "שנתי"}
                    </span>
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    ₪{Number(sub.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {sub.trial_ends_at ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(sub.trial_ends_at), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[sub.status]?.variant}>
                      {statusLabels[sub.status]?.label || sub.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    לא נמצאו מנויים
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

export default AdminSubscriptionsTab;
