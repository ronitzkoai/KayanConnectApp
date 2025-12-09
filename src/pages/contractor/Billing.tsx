import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ContractorLayout } from "@/components/ContractorLayout";

interface SubscriptionPlan {
  name: string;
  price: number;
  features: string[];
  current: boolean;
}

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>("Basic");
  const [renewalDate, setRenewalDate] = useState<string>("");
  const [status, setStatus] = useState<string>("active");

  const plans: SubscriptionPlan[] = [
    {
      name: "Basic",
      price: 99,
      features: [
        "עד 10 קריאות בחודש",
        "גישה למאגר עובדים",
        "תמיכה בסיסית",
      ],
      current: currentPlan === "Basic",
    },
    {
      name: "Pro",
      price: 249,
      features: [
        "עד 50 קריאות בחודש",
        "גישה מלאה למאגר עובדים",
        "תמיכה מועדפת",
        "ניהול צוות",
      ],
      current: currentPlan === "Pro",
    },
    {
      name: "Elite",
      price: 499,
      features: [
        "קריאות ללא הגבלה",
        "גישה מלאה + עדיפות בחיפוש",
        "תמיכה 24/7",
        "ניהול צוות מתקדם",
        "דוחות ואנליטיקס",
      ],
      current: currentPlan === "Elite",
    },
  ];

  useEffect(() => {
    // TODO: Fetch real subscription data from database
    const mockRenewalDate = new Date();
    mockRenewalDate.setMonth(mockRenewalDate.getMonth() + 1);
    setRenewalDate(mockRenewalDate.toLocaleDateString("he-IL"));
  }, [user]);

  const handleUpgrade = (planName: string) => {
    // TODO: Integrate with Stripe
    toast.success(`בקשה לשדרוג ל-${planName} נשלחה`);
  };

  const handleManagePayment = () => {
    // TODO: Integrate with Stripe customer portal
    toast.info("מעבר לניהול פרטי תשלום");
  };

  return (
    <ContractorLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">חיובים ומנוי</h1>
          <p className="text-muted-foreground">נהל את המנוי והתשלומים שלך</p>
        </div>

        <div className="space-y-8">
          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                המנוי הנוכחי שלך
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{currentPlan}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plans.find((p) => p.name === currentPlan)?.price} ₪ לחודש
                  </p>
                </div>
                <Badge
                  variant={status === "active" ? "default" : "destructive"}
                  className="h-fit"
                >
                  {status === "active" ? "פעיל" : "לא פעיל"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>תאריך חידוש: {renewalDate}</span>
              </div>

              <Button
                variant="outline"
                onClick={handleManagePayment}
                className="w-full"
              >
                נהל פרטי תשלום
              </Button>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div>
            <h2 className="text-xl font-bold mb-4">תוכניות זמינות</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={plan.current ? "border-primary border-2" : ""}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name}</span>
                      {plan.current && (
                        <Badge variant="secondary">נוכחי</Badge>
                      )}
                    </CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.price} ₪
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / חודש
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {!plan.current && (
                      <Button
                        onClick={() => handleUpgrade(plan.name)}
                        className="w-full"
                      >
                        שדרג ל-{plan.name}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית חיובים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { date: "01/12/2024", amount: 99, status: "שולם" },
                  { date: "01/11/2024", amount: 99, status: "שולם" },
                  { date: "01/10/2024", amount: 99, status: "שולם" },
                ].map((invoice, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{invoice.date}</p>
                      <p className="text-sm text-muted-foreground">
                        חיוב חודשי
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{invoice.amount} ₪</p>
                      <Badge variant="secondary" className="text-xs">
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContractorLayout>
  );
};

export default Billing;
