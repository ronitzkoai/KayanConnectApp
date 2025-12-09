import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ContractorLayout } from "@/components/ContractorLayout";

const ContractorSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    
    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
      })
      .eq("id", user?.id);

    if (error) {
      toast.error("שגיאה בשמירת פרטים");
    } else {
      toast.success("הפרטים נשמרו בהצלחה");
    }
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <ContractorLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 space-y-3">
          <h1 className="text-4xl font-bold">הגדרות קבלן</h1>
          <p className="text-xl text-muted-foreground">נהל את הפרופיל, העדפות והגדרות החשבון שלך</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">פרטים אישיים</CardTitle>
              <CardDescription className="text-base">מידע בסיסי על הקבלן</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-base font-semibold">שם מלא</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-base font-semibold">טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-semibold">אימייל</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  dir="ltr"
                  className="bg-muted h-12 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  לא ניתן לשנות את כתובת האימייל
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">פרטי חברה</CardTitle>
              <CardDescription className="text-base">מידע על העסק שלך (אופציונלי)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="companyName" className="text-base font-semibold">שם החברה</Label>
                <Input
                  id="companyName"
                  placeholder="לדוגמה: בניית כהן בע״מ"
                  className="h-12 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  השם יופיע בקריאות ובחשבוניות
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="businessNumber" className="text-base font-semibold">ח.פ / ע.מ</Label>
                <Input
                  id="businessNumber"
                  placeholder="000000000"
                  dir="ltr"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">אזורי פעילות</CardTitle>
              <CardDescription className="text-base">האזורים שבהם אתה פעיל</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-base text-muted-foreground">
                עובדים באזורים אלה יוכלו לראות את הקריאות שלך
              </p>
              <Input
                placeholder="לדוגמה: תל אביב, המרכז, השרון"
                className="h-12 text-base"
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-14 text-lg" size="lg" disabled={loading}>
            {loading ? "שומר..." : "💾 שמור את כל השינויים"}
          </Button>
        </form>

        <Card className="mt-8 border-destructive border-2">
          <CardHeader>
            <CardTitle className="text-destructive text-2xl">אבטחה ופעולות מתקדמות</CardTitle>
            <CardDescription className="text-base">פעולות בלתי הפיכות - שימו לב!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">התנתקות מהמערכת</h4>
              <p className="text-base text-muted-foreground">
                התנתק מהמכשיר הנוכחי
              </p>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="w-full h-12 text-base"
              >
                התנתק עכשיו
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">מחיקת חשבון</h4>
              <p className="text-base text-muted-foreground">
                מחיקת החשבון תמחק את כל הנתונים, הקריאות וההיסטוריה שלך לצמיתות.
                <br />
                <strong>פעולה זו לא ניתנת לביטול!</strong>
              </p>
              <Button
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-12 text-base"
                onClick={() => toast.error("פיצ'ר זה יהיה זמין בקרוב")}
              >
                מחק חשבון לצמיתות
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContractorLayout>
  );
};

export default ContractorSettings;
