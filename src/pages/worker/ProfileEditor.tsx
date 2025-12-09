import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { WorkerLayout } from "@/components/WorkerLayout";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Loader2 } from "lucide-react";

interface WorkerProfile {
  id: string;
  work_type: string;
  location: string | null;
  experience_years: number;
  is_available: boolean;
}

interface Profile {
  full_name: string;
  phone: string;
}

const WorkerProfileEditor = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "" });
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    
    if (profileData) {
      setProfile({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
      });
      setAvatarUrl(profileData.avatar_url || "");
    }

    const { data: workerData } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    
    if (workerData) {
      setWorkerProfile(workerData);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq("id", user?.id);

    if (profileError) {
      toast.error("שגיאה בשמירת פרטים אישיים");
      setLoading(false);
      return;
    }

    if (workerProfile) {
      const { error: workerError } = await supabase
        .from("worker_profiles")
        .update({
          work_type: workerProfile.work_type as any,
          location: workerProfile.location,
          experience_years: workerProfile.experience_years,
          is_available: workerProfile.is_available,
        })
        .eq("user_id", user?.id);

      if (workerError) {
        toast.error("שגיאה בשמירת פרופיל עובד");
      } else {
        toast.success("הפרופיל נשמר בהצלחה");
      }
    } else {
      const { error: createError } = await supabase
        .from("worker_profiles")
        .insert({
          user_id: user?.id as string,
          work_type: "laborer" as any,
          location: "",
          experience_years: 0,
          is_available: true,
        });

      if (createError) {
        toast.error("שגיאה ביצירת פרופיל עובד");
      } else {
        toast.success("הפרופיל נוצר בהצלחה");
        loadProfiles();
      }
    }

    setLoading(false);
  };

  return (
    <WorkerLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">פרופיל</h1>
          <p className="text-sm text-muted-foreground mt-0.5">עדכן את הפרטים שלך</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar */}
          <Card className="border-border">
            <CardContent className="py-6 flex justify-center">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                userId={user?.id || ""}
                onAvatarUpdate={setAvatarUrl}
              />
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm">שם מלא</Label>
                <Input
                  id="fullName"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm">טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="h-10"
                  required
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">אימייל</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  dir="ltr"
                  className="h-10 bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Info */}
          {workerProfile && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">פרטים מקצועיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="workType" className="text-sm">תפקיד</Label>
                  <Select
                    value={workerProfile.work_type}
                    onValueChange={(value) =>
                      setWorkerProfile({ ...workerProfile, work_type: value })
                    }
                  >
                    <SelectTrigger id="workType" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backhoe">באגר</SelectItem>
                      <SelectItem value="loader">שופל</SelectItem>
                      <SelectItem value="bobcat">בובקט</SelectItem>
                      <SelectItem value="grader">מפלסת</SelectItem>
                      <SelectItem value="excavator">מחפרון</SelectItem>
                      <SelectItem value="mini_excavator">מיני מחפרון</SelectItem>
                      <SelectItem value="mini_backhoe">מיני באגר</SelectItem>
                      <SelectItem value="wheeled_backhoe">באגר גלגלים</SelectItem>
                      <SelectItem value="telescopic_loader">מעמיס טלסקופי</SelectItem>
                      <SelectItem value="breaker">פטישון</SelectItem>
                      <SelectItem value="full_trailer">פול טריילר</SelectItem>
                      <SelectItem value="semi_trailer">סמי טריילר</SelectItem>
                      <SelectItem value="bathtub">אמבטיה</SelectItem>
                      <SelectItem value="double">דאבל</SelectItem>
                      <SelectItem value="flatbed">רמסע</SelectItem>
                      <SelectItem value="laborer">פועל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-sm">אזורי עבודה</Label>
                  <Input
                    id="location"
                    value={workerProfile.location || ""}
                    onChange={(e) =>
                      setWorkerProfile({
                        ...workerProfile,
                        location: e.target.value,
                      })
                    }
                    placeholder="למשל: מרכז, צפון"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experience" className="text-sm">שנות ניסיון</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    max="50"
                    value={workerProfile.experience_years}
                    onChange={(e) =>
                      setWorkerProfile({
                        ...workerProfile,
                        experience_years: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-10"
                  />
                </div>

              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                שומר...
              </>
            ) : (
              "שמור שינויים"
            )}
          </Button>
        </form>
      </main>
    </WorkerLayout>
  );
};

export default WorkerProfileEditor;
