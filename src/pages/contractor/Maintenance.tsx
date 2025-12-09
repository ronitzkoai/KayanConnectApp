import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { ContractorLayout } from "@/components/ContractorLayout";
import { CreateMaintenanceRequestModal } from "@/components/CreateMaintenanceRequestModal";
import { AddMaintenanceModal } from "@/components/AddMaintenanceModal";
import { SubmitQuoteModal } from "@/components/SubmitQuoteModal";
import { ViewQuotesModal } from "@/components/ViewQuotesModal";
import { ServiceRequestCard } from "@/components/maintenance/ServiceRequestCard";
import { TechnicianQuoteCard } from "@/components/maintenance/TechnicianQuoteCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, 
  Plus, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Banknote,
  Settings,
  Megaphone,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface MaintenanceRecord {
  id: string;
  equipment_type: string;
  equipment_name: string | null;
  maintenance_type: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  cost: number | null;
  notes: string | null;
  mileage_hours: number | null;
  created_at: string;
}

interface MaintenanceRequest {
  id: string;
  contractor_id: string;
  equipment_type: string;
  equipment_name: string | null;
  maintenance_type: string;
  description: string | null;
  location: string;
  preferred_date: string | null;
  urgency: string;
  status: string;
  budget_range: string | null;
  created_at: string;
  quotes_count?: number;
  images?: string[];
  manufacturer?: string;
  model?: string;
  contractor_name?: string;
}

const Maintenance = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [myRequests, setMyRequests] = useState<MaintenanceRequest[]>([]);
  const [openRequests, setOpenRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("marketplace");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Quote modals state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [viewQuotesOpen, setViewQuotesOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadRecords(), loadMyRequests(), loadOpenRequests()]);
    setLoading(false);
  };

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_maintenance")
        .select("*")
        .eq("contractor_id", user?.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error loading records:", error);
    }
  };

  const loadMyRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("contractor_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const requestsWithCounts = await Promise.all(
        (data || []).map(async (req) => {
          const { count } = await supabase
            .from("maintenance_quotes")
            .select("*", { count: "exact", head: true })
            .eq("request_id", req.id);
          return { ...req, quotes_count: count || 0 };
        })
      );

      setMyRequests(requestsWithCounts);
    } catch (error) {
      console.error("Error loading my requests:", error);
    }
  };

  const loadOpenRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get contractor names for each request
      const contractorIds = [...new Set(requests?.map(r => r.contractor_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", contractorIds);

      const requestsWithNames = (requests || []).map(req => ({
        ...req,
        contractor_name: profiles?.find(p => p.id === req.contractor_id)?.full_name || "משתמש"
      }));

      // Get quotes count
      const requestsWithCounts = await Promise.all(
        requestsWithNames.map(async (req) => {
          const { count } = await supabase
            .from("maintenance_quotes")
            .select("*", { count: "exact", head: true })
            .eq("request_id", req.id);
          return { ...req, quotes_count: count || 0 };
        })
      );

      setOpenRequests(requestsWithCounts);
    } catch (error) {
      console.error("Error loading open requests:", error);
    }
  };

  const handleViewQuotes = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setViewQuotesOpen(true);
  };

  const handleSubmitQuote = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setQuoteModalOpen(true);
  };

  const cancelRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
      toast.success("הקריאה בוטלה");
      loadMyRequests();
    } catch (error) {
      toast.error("שגיאה בביטול");
    }
  };

  // Calculate stats
  const upcomingCount = records.filter(r => r.status === "scheduled" || r.status === "in_progress").length;
  const completedCount = records.filter(r => r.status === "completed").length;
  const activeRequestsCount = myRequests.filter(r => r.status === "open").length;
  const monthlyExpenses = records
    .filter(r => {
      const date = new Date(r.completed_date || r.scheduled_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + (r.cost || 0), 0);

  // Filter requests by search
  const filteredOpenRequests = openRequests.filter(req => 
    !searchTerm || 
    req.equipment_type?.includes(searchTerm) ||
    req.maintenance_type?.includes(searchTerm) ||
    req.location?.includes(searchTerm) ||
    req.description?.includes(searchTerm)
  );

  if (authLoading || loading) {
    return (
      <ContractorLayout>
        <div className="w-full min-h-screen bg-gradient-to-br from-muted/30 to-background p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Hero Section */}
        <div className="bg-gradient-to-l from-teal-500/10 via-background to-emerald-500/10 border-b border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg">
                    <Settings className="h-8 w-8" />
                  </div>
                  תחזוקת ציוד
                </h1>
                <p className="text-lg text-muted-foreground">
                  נהל תחזוקות, פתח קריאות שירות ומצא טכנאים מקצועיים
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => setRequestModalOpen(true)} 
                  size="lg"
                  className="font-bold text-base bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <Megaphone className="ml-2 h-5 w-5" />
                  פתח קריאת שירות
                </Button>
                <Button 
                  onClick={() => setModalOpen(true)} 
                  variant="outline" 
                  size="lg"
                  className="font-semibold text-base"
                >
                  <FileText className="ml-2 h-5 w-5" />
                  תיעוד טיפול
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Stats Cards - Hero Style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-amber-500/20">
                    <Banknote className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium truncate">הוצאות החודש</p>
                    <p className="text-lg sm:text-2xl font-bold text-amber-900 dark:text-amber-100">₪{monthlyExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 dark:border-green-800/50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-500/20">
                    <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium truncate">טיפולים שבוצעו</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100">{completedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-500/20">
                    <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium truncate">קריאות פעילות</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{activeRequestsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200/50 dark:border-purple-800/50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-purple-500/20">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium truncate">טיפולים ממתינים</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100">{upcomingCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1 h-auto sm:h-14 rounded-xl w-full overflow-x-auto flex-nowrap">
              <TabsTrigger 
                value="marketplace" 
                className="text-xs sm:text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-6 py-2 sm:py-3 min-h-[44px] whitespace-nowrap"
              >
                <Megaphone className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">שוק קריאות שירות</span>
                <span className="sm:hidden">שוק</span>
                {openRequests.length > 0 && (
                  <Badge className="mr-1 sm:mr-2 bg-teal-500 text-white text-[10px] sm:text-xs">{openRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="my-requests" 
                className="text-xs sm:text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-6 py-2 sm:py-3 min-h-[44px] whitespace-nowrap"
              >
                <FileText className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">הקריאות שלי</span>
                <span className="sm:hidden">שלי</span>
                {activeRequestsCount > 0 && (
                  <Badge className="mr-1 sm:mr-2 bg-blue-500 text-white text-[10px] sm:text-xs">{activeRequestsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-xs sm:text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-6 py-2 sm:py-3 min-h-[44px] whitespace-nowrap"
              >
                <Calendar className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">היסטוריית טיפולים</span>
                <span className="sm:hidden">היסטוריה</span>
              </TabsTrigger>
            </TabsList>

            {/* Marketplace Tab */}
            <TabsContent value="marketplace" className="mt-6 space-y-6">
              {/* Search & Filter Bar */}
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="חפש לפי סוג ציוד, מיקום או תיאור..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 h-12 text-base rounded-xl"
                      />
                    </div>
                    <Button variant="outline" className="h-12 px-6 rounded-xl">
                      <Filter className="ml-2 h-5 w-5" />
                      סינון
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Service Requests Grid */}
              {filteredOpenRequests.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">אין קריאות שירות פתוחות</h3>
                    <p className="text-muted-foreground mb-6">
                      כרגע אין קריאות שירות פתוחות במערכת
                    </p>
                    <Button onClick={() => setRequestModalOpen(true)} size="lg" className="bg-teal-500 hover:bg-teal-600">
                      <Plus className="ml-2 h-5 w-5" />
                      פתח קריאה חדשה
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOpenRequests.map((request) => (
                    <ServiceRequestCard
                      key={request.id}
                      request={request}
                      isOwner={request.contractor_id === user?.id}
                      onViewQuotes={() => handleViewQuotes(request)}
                      onSubmitQuote={() => handleSubmitQuote(request)}
                      onCancel={() => cancelRequest(request.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Requests Tab */}
            <TabsContent value="my-requests" className="mt-6 space-y-6">
              {myRequests.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">לא פתחת קריאות שירות</h3>
                    <p className="text-muted-foreground mb-6">
                      פתח קריאה כדי לקבל הצעות מחיר מטכנאים מקצועיים
                    </p>
                    <Button onClick={() => setRequestModalOpen(true)} size="lg" className="bg-teal-500 hover:bg-teal-600">
                      <Plus className="ml-2 h-5 w-5" />
                      פתח קריאה חדשה
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myRequests.map((request) => (
                    <ServiceRequestCard
                      key={request.id}
                      request={request}
                      isOwner={true}
                      onViewQuotes={() => handleViewQuotes(request)}
                      onSubmitQuote={() => {}}
                      onCancel={() => cancelRequest(request.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6 space-y-6">
              {records.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">אין היסטוריית טיפולים</h3>
                    <p className="text-muted-foreground mb-6">
                      תעד טיפולים שבוצעו כדי לעקוב אחר תחזוקת הציוד
                    </p>
                    <Button onClick={() => setModalOpen(true)} size="lg" variant="outline">
                      <Plus className="ml-2 h-5 w-5" />
                      הוסף תיעוד
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {records.map((record) => (
                    <Card key={record.id} className="rounded-xl hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-bold text-lg">
                                {record.equipment_type}
                                {record.equipment_name && ` - ${record.equipment_name}`}
                              </h3>
                              <Badge variant={record.status === "completed" ? "secondary" : "default"}>
                                {record.status === "completed" ? "הושלם" : "מתוכנן"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Wrench className="h-4 w-4" />
                                {record.maintenance_type}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(record.scheduled_date), "dd/MM/yyyy", { locale: he })}
                              </span>
                              {record.cost && (
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                  <Banknote className="h-4 w-4" />
                                  ₪{record.cost.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <CreateMaintenanceRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        onSuccess={loadAllData}
      />

      <AddMaintenanceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadAllData}
      />

      {selectedRequest && (
        <>
          <SubmitQuoteModal
            open={quoteModalOpen}
            onOpenChange={setQuoteModalOpen}
            requestId={selectedRequest.id}
            equipmentInfo={`${selectedRequest.equipment_type} - ${selectedRequest.maintenance_type}`}
            onSuccess={loadAllData}
          />

          <ViewQuotesModal
            open={viewQuotesOpen}
            onOpenChange={setViewQuotesOpen}
            requestId={selectedRequest.id}
            equipmentInfo={`${selectedRequest.equipment_type} - ${selectedRequest.maintenance_type}`}
            onQuoteAccepted={loadAllData}
          />
        </>
      )}
    </ContractorLayout>
  );
};

export default Maintenance;
