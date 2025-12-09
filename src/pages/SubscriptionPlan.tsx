import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Crown, Gift, Loader2, ArrowRight, Clock, Users, MessageCircle, Headphones } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const SubscriptionPlan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") || "contractor";
  const { role } = useUserRole();
  const { createTrialSubscription, createPaidSubscription, loading: subLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [processing, setProcessing] = useState(false);

  const userRole = role || roleParam;
  const isContractor = userRole === "contractor";

  const pricing = {
    contractor: {
      monthly: 249,
      yearly: 190,
      yearlyTotal: 2280,
    },
    worker: {
      monthly: 89,
      yearly: 70,
      yearlyTotal: 840,
    },
  };

  const currentPricing = isContractor ? pricing.contractor : pricing.worker;
  const savingsPercent = Math.round((1 - currentPricing.yearly / currentPricing.monthly) * 100);

  const features = isContractor
    ? [
        { icon: Users, text: "גישה מלאה למאגר עובדים מקצועיים" },
        { icon: MessageCircle, text: "צ'אט ישיר עם עובדים" },
        { icon: Check, text: "פתיחת קריאות ללא הגבלה" },
        { icon: Headphones, text: "תמיכה מועדפת 24/7" },
      ]
    : [
        { icon: Check, text: "גישה לכל הקריאות הזמינות" },
        { icon: MessageCircle, text: "צ'אט ישיר עם קבלנים" },
        { icon: Users, text: "פרופיל מקצועי מוצג לקבלנים" },
        { icon: Headphones, text: "תמיכה טכנית" },
      ];

  const handleStartTrial = async () => {
    setProcessing(true);
    try {
      const planType = `${userRole}_trial`;
      const { error } = await createTrialSubscription(planType);
      
      if (error) {
        toast.error("שגיאה בהפעלת תקופת הניסיון");
        return;
      }

      toast.success("תקופת הניסיון הופעלה בהצלחה!");
      navigate(isContractor ? "/contractor" : "/worker");
    } catch (error) {
      toast.error("שגיאה בהפעלת תקופת הניסיון");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectPlan = async (planType: "monthly" | "yearly") => {
    setProcessing(true);
    try {
      const fullPlanType = `${userRole}_${planType}`;
      const amount = planType === "yearly" ? currentPricing.yearlyTotal : currentPricing.monthly;
      
      const { error } = await createPaidSubscription(fullPlanType, amount);
      
      if (error) {
        toast.error("שגיאה בבחירת המנוי");
        return;
      }

      toast.success("המנוי הופעל בהצלחה!");
      navigate(isContractor ? "/contractor" : "/worker");
    } catch (error) {
      toast.error("שגיאה בבחירת המנוי");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4 text-sm px-4 py-1">
            {isContractor ? "מנוי קבלן" : "מנוי עובד"}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            בחר את התוכנית שלך
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            התחל עם 14 ימי ניסיון בחינם - ללא צורך בכרטיס אשראי
          </p>
        </div>

        {/* Plan Toggle */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={selectedPlan === "monthly" ? "default" : "outline"}
            onClick={() => setSelectedPlan("monthly")}
            className="min-w-28"
          >
            חודשי
          </Button>
          <Button
            variant={selectedPlan === "yearly" ? "default" : "outline"}
            onClick={() => setSelectedPlan("yearly")}
            className="min-w-28 gap-2"
          >
            <Crown className="h-4 w-4" />
            שנתי
            <Badge variant="secondary" className="mr-1 text-xs">
              חסכון {savingsPercent}%
            </Badge>
          </Button>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Trial Card */}
          <Card className={cn(
            "relative border-2 transition-all",
            "border-green-500/50 bg-green-500/5"
          )}>
            <div className="absolute -top-3 right-4">
              <Badge className="bg-green-500 text-white px-3 py-1">
                <Gift className="h-3 w-3 ml-1" />
                מומלץ להתחלה
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                14 ימי ניסיון
              </CardTitle>
              <CardDescription>
                התנסה בכל התכונות בחינם
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold text-green-600">חינם</span>
                <span className="text-muted-foreground mr-2">/ 14 ימים</span>
              </div>
              
              <ul className="space-y-3 mb-6">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <feature.icon className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                onClick={handleStartTrial}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    התחל ניסיון בחינם
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-3">
                ללא צורך בכרטיס אשראי
              </p>
            </CardContent>
          </Card>

          {/* Paid Plan Card */}
          <Card className={cn(
            "relative border-2 transition-all",
            selectedPlan === "yearly" ? "border-primary" : "border-border"
          )}>
            {selectedPlan === "yearly" && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  <Crown className="h-3 w-3 ml-1" />
                  הכי משתלם
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">
                {selectedPlan === "yearly" ? "מנוי שנתי" : "מנוי חודשי"}
              </CardTitle>
              <CardDescription>
                גישה מלאה לכל התכונות
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ₪{selectedPlan === "yearly" ? currentPricing.yearly : currentPricing.monthly}
                </span>
                <span className="text-muted-foreground mr-2">/ חודש</span>
                {selectedPlan === "yearly" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ₪{currentPricing.yearlyTotal} לשנה (חיסכון של ₪{(currentPricing.monthly - currentPricing.yearly) * 12})
                  </p>
                )}
              </div>
              
              <ul className="space-y-3 mb-6">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <feature.icon className="h-4 w-4 text-primary shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full h-12 text-base"
                onClick={() => handleSelectPlan(selectedPlan)}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    בחר תוכנית {selectedPlan === "yearly" ? "שנתית" : "חודשית"}
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground">
          <p>ניתן לבטל בכל עת. ללא התחייבות.</p>
          <p className="mt-1">
            יש לך שאלות?{" "}
            <a href="#" className="text-primary hover:underline">
              צור קשר עם התמיכה
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
