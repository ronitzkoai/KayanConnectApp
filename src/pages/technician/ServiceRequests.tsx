import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { ServiceRequestCard } from "@/components/maintenance/ServiceRequestCard";
import { SubmitQuoteModal } from "@/components/SubmitQuoteModal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, 
  Search, 
  FileText,
  CheckCircle
} from "lucide-react";

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
  contractor_name?: string;
}

const ServiceRequests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [openRequests, setOpenRequests] = useState<MaintenanceRequest[]>([]);
  const [myQuotedRequests, setMyQuotedRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  
  // Quote modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadOpenRequests(), loadMyQuotedRequests()]);
    setLoading(false);
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

  const loadMyQuotedRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("maintenance_quotes")
        .select("request_id")
        .eq("provider_id", user.id);

      if (error) throw error;
      setMyQuotedRequests((data || []).map(q => q.request_id));
    } catch (error) {
      console.error("Error loading my quotes:", error);
    }
  };

  const handleSubmitQuote = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setQuoteModalOpen(true);
  };

  // Filter requests
  const filteredRequests = openRequests.filter(req => 
    !searchTerm || 
    req.equipment_type?.includes(searchTerm) ||
    req.maintenance_type?.includes(searchTerm) ||
    req.location?.includes(searchTerm) ||
    req.description?.includes(searchTerm)
  );

  const newRequests = filteredRequests.filter(req => !myQuotedRequests.includes(req.id));
  const quotedRequests = filteredRequests.filter(req => myQuotedRequests.includes(req.id));

  if (authLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="w-full min-h-screen bg-background p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-14 w-full rounded-xl" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            קריאות שירות
          </h1>
          <p className="text-muted-foreground mt-1">
            צפה בקריאות שירות והגש הצעות מחיר
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Search */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="חפש לפי ציוד, מיקום או תיאור..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 h-12 text-base rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 h-14 rounded-xl">
            <TabsTrigger 
              value="open" 
              className="text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
            >
              <FileText className="ml-2 h-5 w-5" />
              קריאות חדשות
              {newRequests.length > 0 && (
                <Badge className="mr-2 bg-teal-500 text-white">{newRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="quoted" 
              className="text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
            >
              <CheckCircle className="ml-2 h-5 w-5" />
              הגשתי הצעה
              {quotedRequests.length > 0 && (
                <Badge className="mr-2 bg-blue-500 text-white">{quotedRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-6">
            {newRequests.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-12 text-center">
                  <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-bold mb-2">אין קריאות חדשות</h3>
                  <p className="text-muted-foreground">
                    כבר הגשת הצעות לכל הקריאות הפתוחות
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newRequests.map((request) => (
                  <ServiceRequestCard
                    key={request.id}
                    request={request}
                    isOwner={false}
                    onSubmitQuote={() => handleSubmitQuote(request)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quoted" className="space-y-6">
            {quotedRequests.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-bold mb-2">עדיין לא הגשת הצעות</h3>
                  <p className="text-muted-foreground">
                    הגש הצעות מחיר לקריאות שירות כדי לזכות בעבודות
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotedRequests.map((request) => (
                  <ServiceRequestCard
                    key={request.id}
                    request={request}
                    isOwner={false}
                    onSubmitQuote={() => handleSubmitQuote(request)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      {selectedRequest && (
        <SubmitQuoteModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          requestId={selectedRequest.id}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </TechnicianLayout>
  );
};

export default ServiceRequests;
