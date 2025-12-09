import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowRight, 
  Star, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Award, 
  Calendar,
  Briefcase,
  FileText,
  Wrench,
  Home
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ContractorData {
  id: string;
  user_id: string;
  license_type: string | null;
  license_number: string | null;
  specializations: string[];
  years_experience: number;
  company_name: string | null;
  service_areas: string[];
  rating: number;
  total_ratings: number;
  is_verified: boolean;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  contractor_name?: string;
}

const ContractorProfile = () => {
  const { contractorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contractor, setContractor] = useState<ContractorData | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contractorId) {
      loadContractor();
      loadRatings();
    }
  }, [contractorId]);

  const loadContractor = async () => {
    try {
      const { data: contractorProfile, error } = await supabase
        .from("contractor_profiles")
        .select("*")
        .eq("id", contractorId)
        .single();

      if (error) throw error;

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", contractorProfile.user_id)
        .single();

      setContractor({
        ...contractorProfile,
        profile: profile || { full_name: "קבלן", phone: null, avatar_url: null }
      });
    } catch (error) {
      toast.error("שגיאה בטעינת פרופיל הקבלן");
      navigate("/customer");
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    // Note: This would need a ratings table with contractor ratings
    // For now, we'll show placeholder data
    setRatings([]);
  };

  const handleContact = () => {
    if (contractor?.profile?.phone) {
      window.open(`tel:${contractor.profile.phone}`, "_blank");
    } else {
      toast.info("מספר טלפון לא זמין");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>קבלן לא נמצא</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
              <Wrench className="h-6 w-6" />
              <span>הפטריוטים</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/customer" className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-2">
                <Home className="h-4 w-4" />
                ראשי
              </Link>
              <Link to="/marketplace" className="text-muted-foreground hover:text-primary transition-colors">
                שוק הציוד
              </Link>
              <Link to="/insurance" className="text-muted-foreground hover:text-primary transition-colors">
                ביטוח לפרויקטים
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowRight className="ml-2 h-4 w-4" />
          חזרה
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar className="h-28 w-28 border-4 border-primary/20">
                    <AvatarImage src={contractor.profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                      {contractor.profile?.full_name?.charAt(0) || "ק"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold">
                          {contractor.profile?.full_name || "קבלן"}
                        </h1>
                        {contractor.is_verified && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Award className="h-3 w-3 ml-1" />
                            מאומת
                          </Badge>
                        )}
                      </div>
                      {contractor.company_name && (
                        <p className="text-lg text-muted-foreground mt-1">
                          {contractor.company_name}
                        </p>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= Math.round(contractor.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold">{contractor.rating?.toFixed(1) || "0.0"}</span>
                      <span className="text-muted-foreground">({contractor.total_ratings || 0} ביקורות)</span>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-3">
                      <Button size="lg" onClick={handleContact}>
                        <Phone className="ml-2 h-5 w-5" />
                        התקשר עכשיו
                      </Button>
                      <Button size="lg" variant="outline" onClick={() => navigate("/chat")}>
                        <MessageCircle className="ml-2 h-5 w-5" />
                        שלח הודעה
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  פרטים מקצועיים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Specializations */}
                <div>
                  <h3 className="font-semibold mb-3">תחומי התמחות</h3>
                  <div className="flex flex-wrap gap-2">
                    {contractor.specializations?.map((spec, i) => (
                      <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Service Areas */}
                {contractor.service_areas?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      אזורי שירות
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {contractor.service_areas.map((area, i) => (
                        <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {contractor.years_experience > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">שנות ניסיון</p>
                        <p className="font-semibold">{contractor.years_experience} שנים</p>
                      </div>
                    </div>
                  )}
                  {contractor.license_type && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">רישיון</p>
                        <p className="font-semibold">{contractor.license_type}</p>
                        {contractor.license_number && (
                          <p className="text-xs text-muted-foreground">מס׳ {contractor.license_number}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  ביקורות ({contractor.total_ratings || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ratings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    אין ביקורות עדיין
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ratings.map((rating) => (
                      <div key={rating.id} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= rating.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(rating.created_at), "dd/MM/yyyy", { locale: he })}
                          </span>
                        </div>
                        {rating.review && <p className="text-sm">{rating.review}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>יצירת קשר</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full h-12 text-base" onClick={handleContact}>
                  <Phone className="ml-2 h-5 w-5" />
                  {contractor.profile?.phone || "התקשר"}
                </Button>
                <Button variant="outline" className="w-full h-12 text-base" onClick={() => navigate("/chat")}>
                  <MessageCircle className="ml-2 h-5 w-5" />
                  שלח הודעה
                </Button>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    פעיל מאז {format(new Date(contractor.created_at), "MMMM yyyy", { locale: he })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorProfile;