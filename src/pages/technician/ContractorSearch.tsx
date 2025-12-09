import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Star, 
  MapPin, 
  Phone,
  Building2,
  Award
} from "lucide-react";

interface ContractorProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  specializations: string[];
  license_type: string | null;
  rating: number;
  total_ratings: number;
  is_verified: boolean;
  bio: string | null;
  profile?: {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

const ContractorSearch = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadContractors();
    }
  }, [user]);

  const loadContractors = async () => {
    setLoading(true);
    try {
      const { data: contractorData, error } = await supabase
        .from("contractor_profiles")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;

      // Get profiles for each contractor
      const userIds = contractorData?.map(c => c.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .in("id", userIds);

      const contractorsWithProfiles = (contractorData || []).map(contractor => ({
        ...contractor,
        profile: profiles?.find(p => p.id === contractor.user_id)
      }));

      setContractors(contractorsWithProfiles);
    } catch (error) {
      console.error("Error loading contractors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContractors = contractors.filter(contractor => 
    !searchTerm ||
    contractor.profile?.full_name?.includes(searchTerm) ||
    contractor.company_name?.includes(searchTerm) ||
    contractor.specializations?.some(s => s.includes(searchTerm))
  );

  const getInitials = (name: string | undefined) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'KB';
  };

  if (authLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="w-full min-h-screen bg-background p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            חיפוש קבלנים
          </h1>
          <p className="text-muted-foreground mt-1">
            צפה בקבלנים פעילים במערכת
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Search */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="חפש לפי שם, חברה או תחום התמחות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 h-12 text-base rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contractors Grid */}
        {filteredContractors.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold mb-2">לא נמצאו קבלנים</h3>
              <p className="text-muted-foreground">
                נסה לחפש עם מילות מפתח אחרות
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContractors.map((contractor) => (
              <Card 
                key={contractor.id} 
                className="rounded-2xl hover:shadow-lg transition-all cursor-pointer border-border hover:border-primary/50"
                onClick={() => navigate(`/customer/contractor/${contractor.user_id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={contractor.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(contractor.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground truncate">
                          {contractor.profile?.full_name || "קבלן"}
                        </h3>
                        {contractor.is_verified && (
                          <Award className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                      {contractor.company_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {contractor.company_name}
                        </p>
                      )}
                      {contractor.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold text-sm">{contractor.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({contractor.total_ratings} דירוגים)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {contractor.specializations?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {contractor.specializations.slice(0, 3).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {contractor.specializations.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{contractor.specializations.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {contractor.profile?.phone && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span dir="ltr">{contractor.profile.phone}</span>
                    </div>
                  )}

                  {contractor.license_type && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Award className="h-4 w-4" />
                      <span>{contractor.license_type}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </TechnicianLayout>
  );
};

export default ContractorSearch;
