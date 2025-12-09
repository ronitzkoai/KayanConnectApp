import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, Package, Fuel, Wrench, ShoppingCart, CreditCard, Shield } from "lucide-react";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminJobsTab from "@/components/admin/AdminJobsTab";
import AdminMaterialsTab from "@/components/admin/AdminMaterialsTab";
import AdminFuelTab from "@/components/admin/AdminFuelTab";
import AdminMaintenanceTab from "@/components/admin/AdminMaintenanceTab";
import AdminMarketplaceTab from "@/components/admin/AdminMarketplaceTab";
import AdminSubscriptionsTab from "@/components/admin/AdminSubscriptionsTab";

interface Stats {
  totalUsers: number;
  contractors: number;
  workers: number;
  customers: number;
  openJobs: number;
  completedJobs: number;
  pendingMaterials: number;
  pendingFuel: number;
  openMaintenance: number;
  marketplaceItems: number;
  activeSubscriptions: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error || !data) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchStats();
    };

    checkAdminRole();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const [
        usersResult,
        rolesResult,
        jobsResult,
        materialsResult,
        fuelResult,
        maintenanceResult,
        marketplaceResult,
        subscriptionsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("job_requests").select("status"),
        supabase.from("materials_orders").select("status"),
        supabase.from("fuel_orders").select("status"),
        supabase.from("maintenance_requests").select("status"),
        supabase.from("equipment_marketplace").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("status"),
      ]);

      const roles = rolesResult.data || [];
      const jobs = jobsResult.data || [];
      const materials = materialsResult.data || [];
      const fuel = fuelResult.data || [];
      const maintenance = maintenanceResult.data || [];
      const subscriptions = subscriptionsResult.data || [];

      setStats({
        totalUsers: usersResult.count || 0,
        contractors: roles.filter((r) => r.role === "contractor").length,
        workers: roles.filter((r) => r.role === "worker").length,
        customers: roles.filter((r) => r.role === "customer").length,
        openJobs: jobs.filter((j) => j.status === "open").length,
        completedJobs: jobs.filter((j) => j.status === "completed").length,
        pendingMaterials: materials.filter((m) => m.status === "pending").length,
        pendingFuel: fuel.filter((f) => f.status === "pending").length,
        openMaintenance: maintenance.filter((m) => m.status === "open").length,
        marketplaceItems: marketplaceResult.count || 0,
        activeSubscriptions: subscriptions.filter((s) => s.status === "active" || s.status === "trial").length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen bg-background p-6" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-primary/10 border-b border-primary/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">לוח בקרה - מנהל</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                משתמשים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.contractors} קבלנים • {stats?.workers} עובדים • {stats?.customers} לקוחות
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                קריאות עבודה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.openJobs}</div>
              <p className="text-xs text-muted-foreground">פתוחות • {stats?.completedJobs} הושלמו</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                הזמנות חומרים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingMaterials}</div>
              <p className="text-xs text-muted-foreground">ממתינות לטיפול</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                הזמנות דלק
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingFuel}</div>
              <p className="text-xs text-muted-foreground">ממתינות לטיפול</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                בקשות תחזוקה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.openMaintenance}</div>
              <p className="text-xs text-muted-foreground">פתוחות</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                מרקטפלייס
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.marketplaceItems}</div>
              <p className="text-xs text-muted-foreground">פריטים למכירה</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                מנויים פעילים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">משלמים / ניסיון</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-2 bg-muted/50 p-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              משתמשים
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              קריאות עבודה
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              הזמנות חומרים
            </TabsTrigger>
            <TabsTrigger value="fuel" className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              הזמנות דלק
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              תחזוקה
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              מרקטפלייס
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              מנויים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <AdminUsersTab />
          </TabsContent>
          <TabsContent value="jobs" className="mt-4">
            <AdminJobsTab onUpdate={fetchStats} />
          </TabsContent>
          <TabsContent value="materials" className="mt-4">
            <AdminMaterialsTab onUpdate={fetchStats} />
          </TabsContent>
          <TabsContent value="fuel" className="mt-4">
            <AdminFuelTab onUpdate={fetchStats} />
          </TabsContent>
          <TabsContent value="maintenance" className="mt-4">
            <AdminMaintenanceTab onUpdate={fetchStats} />
          </TabsContent>
          <TabsContent value="marketplace" className="mt-4">
            <AdminMarketplaceTab onUpdate={fetchStats} />
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-4">
            <AdminSubscriptionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
