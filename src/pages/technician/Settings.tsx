import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Eye, 
  LogOut, 
  Shield, 
  Smartphone,
  Mail,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";

const TechnicianSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [techProfile, setTechProfile] = useState<any>(null);

  // Settings state
  const [isAvailable, setIsAvailable] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

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
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);

    const { data: techData } = await supabase
      .from("technician_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (techData) {
      setTechProfile(techData);
      setIsAvailable(techData.is_available ?? true);
    }

    setLoading(false);
  };

  const handleAvailabilityChange = async (value: boolean) => {
    setIsAvailable(value);
    
    if (!user) return;

    const { error } = await supabase
      .from("technician_profiles")
      .update({ is_available: value, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      toast.error("שגיאה בעדכון הסטטוס");
      setIsAvailable(!value);
    } else {
      toast.success(value ? "אתה כעת זמין לעבודה" : "אתה כעת לא זמין");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("התנתקת בהצלחה");
    navigate("/");
  };

  if (authLoading || roleLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="w-full min-h-screen bg-background p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">הגדרות</h1>
          <p className="text-muted-foreground mt-1">נהל את העדפות החשבון שלך</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Availability */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              זמינות
            </CardTitle>
            <CardDescription>
              הגדר את הסטטוס שלך כדי שקבלנים ידעו אם אתה זמין
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">זמין לעבודה</Label>
                <p className="text-sm text-muted-foreground">
                  כשמופעל, הפרופיל שלך יוצג לקבלנים המחפשים טכנאים
                </p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={handleAvailabilityChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              התראות
            </CardTitle>
            <CardDescription>
              הגדר כיצד תקבל עדכונים על קריאות חדשות והצעות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-base font-medium">התראות אימייל</Label>
                  <p className="text-sm text-muted-foreground">קבל עדכונים במייל</p>
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-base font-medium">התראות פוש</Label>
                  <p className="text-sm text-muted-foreground">קבל התראות במכשיר</p>
                </div>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              חשבון
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div>
                <p className="font-medium">כתובת אימייל</p>
                <p className="text-sm text-muted-foreground" dir="ltr">{user?.email}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 rounded-xl"
              onClick={() => navigate("/technician/profile")}
            >
              <HelpCircle className="h-5 w-5" />
              עריכת פרופיל
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="destructive"
          size="lg"
          className="w-full rounded-xl h-12"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 ml-2" />
          התנתק
        </Button>
      </main>
    </TechnicianLayout>
  );
};

export default TechnicianSettings;
