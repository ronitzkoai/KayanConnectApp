import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, User, MapPin, Phone, Briefcase, Star, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const SPECIALIZATIONS = [
  { value: "hydraulics", label: "הידראוליקה" },
  { value: "electrical", label: "חשמל" },
  { value: "engines", label: "מנועים" },
  { value: "transmissions", label: "תיבות הילוכים" },
  { value: "air_conditioning", label: "מיזוג אוויר" },
  { value: "brakes", label: "בלמים" },
  { value: "welding", label: "ריתוך" },
  { value: "tires", label: "צמיגים" },
  { value: "general", label: "כללי" },
];

const TechnicianProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<any>(null);
  const [techProfile, setTechProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [specializations, setSpecializations] = useState<string[]>([]);

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
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");
      setAvatarUrl(profileData.avatar_url || "");
    }

    const { data: techData } = await supabase
      .from("technician_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (techData) {
      setTechProfile(techData);
      setLocation(techData.location || "");
      setBio(techData.bio || "");
      setYearsExperience(techData.years_experience || 0);
      setSpecializations(techData.specializations || []);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update technician_profiles table
      const { error: techError } = await supabase
        .from("technician_profiles")
        .update({
          location,
          bio,
          years_experience: yearsExperience,
          specializations,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (techError) throw techError;

      toast.success("הפרופיל עודכן בהצלחה");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("שגיאה בשמירת הפרופיל");
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setSpecializations(prev =>
      prev.includes(spec)
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  if (authLoading || roleLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="w-full min-h-screen bg-background p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">הפרופיל שלי</h1>
          <p className="text-muted-foreground mt-1">עדכן את הפרטים האישיים והמקצועיים שלך</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Avatar & Basic Info */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              פרטים אישיים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                onAvatarUpdate={setAvatarUrl}
                userId={user?.id || ""}
              />
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">שם מלא</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="הכנס שם מלא"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  טלפון
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-0000000"
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  מיקום
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="עיר / אזור"
                  className="rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Info */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              פרטים מקצועיים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>שנות ניסיון</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className="rounded-xl w-32"
              />
            </div>

            <div className="space-y-3">
              <Label>התמחויות</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((spec) => (
                  <Badge
                    key={spec.value}
                    variant={specializations.includes(spec.value) ? "default" : "outline"}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-sm"
                    onClick={() => toggleSpecialization(spec.value)}
                  >
                    {specializations.includes(spec.value) && (
                      <CheckCircle className="h-3 w-3 ml-1" />
                    )}
                    {spec.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">אודות</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="ספר על עצמך, הניסיון שלך והשירותים שאתה מציע..."
                className="rounded-xl min-h-[120px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-left">{bio.length}/1000</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        {techProfile && (
          <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-2xl font-bold">{techProfile.rating || 0}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">דירוג</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{techProfile.completed_services || 0}</p>
                  <p className="text-sm text-muted-foreground">שירותים</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{techProfile.total_ratings || 0}</p>
                  <p className="text-sm text-muted-foreground">ביקורות</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl h-12"
        >
          <Save className="h-5 w-5 ml-2" />
          {saving ? "שומר..." : "שמור שינויים"}
        </Button>
      </main>
    </TechnicianLayout>
  );
};

export default TechnicianProfile;
