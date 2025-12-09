import { useState, useEffect } from "react";
import { ContractorLayout } from "@/components/ContractorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ContractorProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    email: "",
    avatar_url: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: user.email || "",
        avatar_url: data.avatar_url || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("שגיאה בטעינת הפרופיל");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("הפרופיל עודכן בהצלחה");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("שגיאה בשמירת הפרופיל");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ContractorLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">הפרופיל שלי</h1>
          <p className="text-muted-foreground mt-1">ערוך את הפרטים האישיים שלך</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload */}
          <Card>
            <CardHeader>
              <CardTitle>תמונת פרופיל</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={profile.avatar_url}
                userId={userId}
                onAvatarUpdate={(url) => setProfile({ ...profile, avatar_url: url })}
              />
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">שם מלא</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input id="email" type="email" value={profile.email} disabled />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        </form>
      </div>
    </ContractorLayout>
  );
}
