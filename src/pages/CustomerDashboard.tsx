import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Search, 
  Star, 
  MapPin, 
  Phone, 
  MessageCircle, 
  LogOut, 
  Wrench,
  Home,
  User,
  Filter,
  Award,
  Calendar,
  FileText,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  X
} from "lucide-react";
import { toast } from "sonner";

interface ContractorProfile {
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
  profile?: {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

const SPECIALIZATION_OPTIONS = [
  "ריצוף ואריחים",
  "אינסטלציה",
  "חשמל",
  "גבס ותקרות",
  "צבע וטיח",
  "שיפוצים כלליים",
  "בנייה",
  "עבודות עפר",
  "איטום",
  "אלומיניום וזכוכית"
];

const LICENSE_TYPES = [
  "קבלן רשום",
  "קבלן מוסמך",
  "קבלן על",
  "בעל מקצוע",
];

const EXPERIENCE_OPTIONS = [
  { value: "0", label: "כל הניסיון" },
  { value: "1", label: "1-3 שנים" },
  { value: "3", label: "3-5 שנים" },
  { value: "5", label: "5-10 שנים" },
  { value: "10", label: "10+ שנים" },
];

const SORT_OPTIONS = [
  { value: "rating-desc", label: "דירוג - גבוה לנמוך" },
  { value: "rating-asc", label: "דירוג - נמוך לגבוה" },
  { value: "reviews-desc", label: "הכי הרבה ביקורות" },
  { value: "experience-desc", label: "הכי הרבה ניסיון" },
  { value: "newest", label: "חדשים ראשון" },
];

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [filteredContractors, setFilteredContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");
  const [minRating, setMinRating] = useState(0);
  const [selectedExperience, setSelectedExperience] = useState("0");
  const [selectedLicense, setSelectedLicense] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating-desc");
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    filterAndSortContractors();
  }, [searchQuery, selectedSpecialization, minRating, selectedExperience, selectedLicense, verifiedOnly, sortBy, contractors]);

  const loadContractors = async () => {
    setLoading(true);
    try {
      const { data: contractorProfiles, error } = await supabase
        .from("contractor_profiles")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;

      const contractorsWithProfiles = await Promise.all(
        (contractorProfiles || []).map(async (contractor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, avatar_url")
            .eq("id", contractor.user_id)
            .single();
          
          return {
            ...contractor,
            profile: profile || { full_name: "קבלן", phone: null, avatar_url: null }
          };
        })
      );

      setContractors(contractorsWithProfiles);
      setFilteredContractors(contractorsWithProfiles);
    } catch (error: any) {
      toast.error("שגיאה בטעינת קבלנים");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortContractors = () => {
    let filtered = [...contractors];

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.profile?.full_name?.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query) ||
        c.service_areas?.some(area => area.toLowerCase().includes(query))
      );
    }

    // Specialization filter
    if (selectedSpecialization && selectedSpecialization !== "all") {
      filtered = filtered.filter(c => 
        c.specializations?.includes(selectedSpecialization)
      );
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(c => (c.rating || 0) >= minRating);
    }

    // Experience filter
    if (selectedExperience !== "0") {
      const minExp = parseInt(selectedExperience);
      filtered = filtered.filter(c => (c.years_experience || 0) >= minExp);
    }

    // License filter
    if (selectedLicense && selectedLicense !== "all") {
      filtered = filtered.filter(c => c.license_type === selectedLicense);
    }

    // Verified filter
    if (verifiedOnly) {
      filtered = filtered.filter(c => c.is_verified);
    }

    // Sorting
    switch (sortBy) {
      case "rating-desc":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "rating-asc":
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case "reviews-desc":
        filtered.sort((a, b) => (b.total_ratings || 0) - (a.total_ratings || 0));
        break;
      case "experience-desc":
        filtered.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0));
        break;
      case "newest":
        // Would need created_at field
        break;
    }

    setFilteredContractors(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("");
    setMinRating(0);
    setSelectedExperience("0");
    setSelectedLicense("");
    setVerifiedOnly(false);
    setSortBy("rating-desc");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleContactContractor = (contractor: ContractorProfile) => {
    if (contractor.profile?.phone) {
      window.open(`tel:${contractor.profile.phone}`, "_blank");
    } else {
      toast.info("מספר טלפון לא זמין");
    }
  };

  const activeFiltersCount = [
    selectedSpecialization && selectedSpecialization !== "all",
    minRating > 0,
    selectedExperience !== "0",
    selectedLicense && selectedLicense !== "all",
    verifiedOnly
  ].filter(Boolean).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Specialization */}
      <div className="space-y-3">
        <Label className="font-semibold">תחום התמחות</Label>
        <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
          <SelectTrigger>
            <SelectValue placeholder="כל התחומים" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">כל התחומים</SelectItem>
            {SPECIALIZATION_OPTIONS.map(spec => (
              <SelectItem key={spec} value={spec}>{spec}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min Rating */}
      <div className="space-y-3">
        <Label className="font-semibold">דירוג מינימלי: {minRating > 0 ? `${minRating}+` : "הכל"}</Label>
        <Slider
          value={[minRating]}
          onValueChange={([val]) => setMinRating(val)}
          max={5}
          step={0.5}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>הכל</span>
          <span>5 כוכבים</span>
        </div>
      </div>

      {/* Experience */}
      <div className="space-y-3">
        <Label className="font-semibold">שנות ניסיון</Label>
        <Select value={selectedExperience} onValueChange={setSelectedExperience}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {EXPERIENCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* License Type */}
      <div className="space-y-3">
        <Label className="font-semibold">סוג רישיון</Label>
        <Select value={selectedLicense} onValueChange={setSelectedLicense}>
          <SelectTrigger>
            <SelectValue placeholder="כל הרישיונות" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">כל הרישיונות</SelectItem>
            {LICENSE_TYPES.map(license => (
              <SelectItem key={license} value={license}>{license}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verified Only */}
      <div className="flex items-center justify-between">
        <Label className="font-semibold">קבלנים מאומתים בלבד</Label>
        <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="ml-2 h-4 w-4" />
          נקה פילטרים ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 sm:px-6">
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

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 ml-2" />
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">מצא את הקבלן המושלם</h1>
          <p className="text-muted-foreground mt-2">
            חפש, סנן ומצא את הקבלן הכי מתאים לפרויקט שלך
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="h-5 w-5" />
                  פילטרים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Search Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="חפש לפי שם, חברה או אזור..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 pr-10 text-base"
                    />
                  </div>
                  
                  {/* Mobile Filter Button */}
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden h-12 relative">
                        <Filter className="ml-2 h-5 w-5" />
                        פילטרים
                        {activeFiltersCount > 0 && (
                          <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle>פילטרים</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <FilterContent />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-48 h-12">
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {SORT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {filteredContractors.length} קבלנים נמצאו
              </h2>
            </div>

            {/* Results */}
            {loading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-muted"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredContractors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">לא נמצאו קבלנים</h3>
                  <p className="text-muted-foreground mb-4">נסה לשנות את פרמטרי החיפוש</p>
                  <Button variant="outline" onClick={clearFilters}>
                    נקה פילטרים
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredContractors.map((contractor) => (
                  <Card key={contractor.id} className="hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                          <Avatar className="h-20 w-20 border-2 border-primary/20">
                            <AvatarImage src={contractor.profile?.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xl">
                              {contractor.profile?.full_name?.charAt(0) || "ק"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-lg truncate">
                                {contractor.profile?.full_name || "קבלן"}
                              </h3>
                              {contractor.is_verified && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                  <Award className="h-3 w-3 ml-1" />
                                  מאומת
                                </Badge>
                              )}
                            </div>
                            {contractor.company_name && (
                              <p className="text-sm text-muted-foreground truncate">
                                {contractor.company_name}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold">{contractor.rating?.toFixed(1) || "0.0"}</span>
                              <span className="text-sm text-muted-foreground">
                                ({contractor.total_ratings || 0} ביקורות)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-4 space-y-3">
                          {/* License & Experience */}
                          <div className="flex flex-wrap gap-3 text-sm">
                            {contractor.license_type && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>{contractor.license_type}</span>
                              </div>
                            )}
                            {contractor.years_experience > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{contractor.years_experience} שנות ניסיון</span>
                              </div>
                            )}
                          </div>

                          {/* Service Areas */}
                          {contractor.service_areas?.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {contractor.service_areas.slice(0, 3).join(", ")}
                                {contractor.service_areas.length > 3 && ` +${contractor.service_areas.length - 3}`}
                              </span>
                            </div>
                          )}

                          {/* Specializations */}
                          <div className="flex flex-wrap gap-1.5">
                            {contractor.specializations?.slice(0, 3).map((spec, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {contractor.specializations?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{contractor.specializations.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="border-t border-border bg-muted/30 p-4 flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleContactContractor(contractor)}
                        >
                          <Phone className="h-4 w-4 ml-2" />
                          התקשר
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/chat`)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/customer/contractor/${contractor.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;