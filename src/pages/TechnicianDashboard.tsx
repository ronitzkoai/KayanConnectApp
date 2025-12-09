import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { ServiceRequestCard } from "@/components/maintenance/ServiceRequestCard";
import { SubmitQuoteModal } from "@/components/SubmitQuoteModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, 
  Search, 
  TrendingUp, 
  Star, 
  CheckCircle,
  Clock,
  Banknote,
  FileText
} from "lucide-react";
import { toast } from "sonner";

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

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<any>(null);
  const [technicianProfile, setTechnicianProfile] = useState<any>(null);
  const [openRequests, setOpenRequests] = useState<MaintenanceRequest[]>([]);
  const [myQuotes, setMyQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Quote modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "technician") {
      toast.error("אין לך הרשאה לגשת לעמוד זה");
      navigate("/");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadProfiles(), loadOpenRequests(), loadMyQuotes()]);
    setLoading(false);
  };

  const loadProfiles = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(profileData);

    const { data: techData } = await supabase
      .from("technician_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (techData) {
      setTechnicianProfile(techData);
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

      // Get contractor names
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
      console.error("Error loading requests:", error);
    }
  };

  const loadMyQuotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("maintenance_quotes")
        .select(`
          *,
          maintenance_requests (
            equipment_type,
            maintenance_type,
            location,
            status
          )
        `)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyQuotes(data || []);
    } catch (error) {
      console.error("Error loading quotes:", error);
    }
  };

  const handleSubmitQuote = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setQuoteModalOpen(true);
  };

  // Calculate stats
  const acceptedQuotes = myQuotes.filter(q => q.status === "accepted").length;
  const pendingQuotes = myQuotes.filter(q => q.status === "pending").length;
  const totalEarnings = myQuotes
    .filter(q => q.status === "accepted")
    .reduce((sum, q) => sum + (q.price || 0), 0);

  // Filter requests by search
  const filteredRequests = openRequests.filter(req => 
    !searchTerm || 
    req.equipment_type?.includes(searchTerm) ||
    req.maintenance_type?.includes(searchTerm) ||
    req.location?.includes(searchTerm) ||
    req.description?.includes(searchTerm)
  );

  const firstName = profile?.full_name?.split(' ')[0] || profile?.full_name;

  if (authLoading || roleLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="w-full min-h-screen bg-background p-4 sm:p-6">
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
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                שלום, {firstName}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                פאנל פועל טכנאי
              </p>
            </div>
            {technicianProfile && (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-lg">{technicianProfile.rating || 0}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/50 dark:to-teal-900/30 border-teal-200/50 rounded-xl sm:rounded-2xl">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-teal-500/20">
                  <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-teal-700 dark:text-teal-300 font-medium truncate">הצעות שהוגשו</p>
                  <p className="text-lg sm:text-2xl font-bold text-teal-900 dark:text-teal-100">{myQuotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 rounded-xl sm:rounded-2xl">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-500/20">
                  <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium truncate">הצעות שהתקבלו</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100">{acceptedQuotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50 rounded-xl sm:rounded-2xl">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-amber-500/20">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium truncate">ממתינות</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingQuotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200/50 rounded-xl sm:rounded-2xl">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-purple-500/20">
                  <Banknote className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium truncate">הכנסות</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100">₪{totalEarnings.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quotes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              ההצעות האחרונות שלי
            </h2>
            <Button 
              variant="outline" 
              onClick={() => navigate("/technician/requests")}
              className="rounded-xl"
            >
              צפה בכל הקריאות
            </Button>
          </div>

          {myQuotes.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-bold mb-2">עוד לא הגשת הצעות</h3>
                <p className="text-muted-foreground mb-4">
                  עבור לעמוד קריאות השירות כדי להגיש הצעות מחיר
                </p>
                <Button 
                  onClick={() => navigate("/technician/requests")}
                  className="rounded-xl"
                >
                  צפה בקריאות שירות
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myQuotes.slice(0, 3).map((quote) => (
                <Card key={quote.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge 
                        variant={quote.status === "accepted" ? "default" : quote.status === "rejected" ? "destructive" : "secondary"}
                        className="rounded-lg"
                      >
                        {quote.status === "accepted" ? "התקבלה" : quote.status === "rejected" ? "נדחתה" : "ממתינה"}
                      </Badge>
                      <span className="font-bold text-lg">₪{quote.price?.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {quote.maintenance_requests?.equipment_type} - {quote.maintenance_requests?.maintenance_type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {quote.maintenance_requests?.location}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* CTA to view all requests */}
        <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <Wrench className="h-12 w-12 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">יש {openRequests.length} קריאות שירות פתוחות</h3>
            <p className="text-muted-foreground mb-4">
              צפה בכל הקריאות והגש הצעות מחיר
            </p>
            <Button 
              size="lg"
              onClick={() => navigate("/technician/requests")}
              className="rounded-xl"
            >
              צפה בקריאות שירות
            </Button>
          </CardContent>
        </Card>
      </main>
    </TechnicianLayout>
  );
};

export default TechnicianDashboard;
