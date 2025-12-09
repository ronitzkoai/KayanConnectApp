import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WorkerLayout } from "@/components/WorkerLayout";

const WorkerSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultAvailability, setDefaultAvailability] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    
    if (profileData) {
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");
    }

    const { data: workerData } = await supabase
      .from("worker_profiles")
      .select("is_available")
      .eq("user_id", user?.id)
      .single();
    
    if (workerData) {
      setDefaultAvailability(workerData.is_available || true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
      })
      .eq("id", user?.id);

    if (profileError) {
      toast.error("שגיאה בשמירת פרטים");
      setLoading(false);
      return;
    }

    const { error: workerError } = await supabase
      .from("worker_profiles")
      .update({
        is_available: defaultAvailability,
      })
      .eq("user_id", user?.id);

    if (workerError) {
      toast.error("שגיאה בעדכון זמינות");
    } else {
      toast.success("ההגדרות נשמרו בהצלחה");
    }
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <WorkerLayout>
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">נהל את החשבון שלך</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Personal Details */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">פרטים אישיים</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm">שם מלא</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm">טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שומר...
                  </>
                ) : (
                  "שמור"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">העדפות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="defaultAvailability" className="text-sm font-medium">זמינות ברירת מחדל</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  להיות זמין אוטומטית לקריאות
                </p>
              </div>
              <Switch
                id="defaultAvailability"
                checked={defaultAvailability}
                onCheckedChange={setDefaultAvailability}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">חשבון</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full h-10 justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              התנתק מהמערכת
            </Button>
          </CardContent>
        </Card>
      </main>
    </WorkerLayout>
  );
};

export default WorkerSettings;
