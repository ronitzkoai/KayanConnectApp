import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, HardHat, ArrowLeft, CheckCircle, Sparkles, Zap, Home, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { role } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      if (role === "contractor") {
        navigate("/contractor");
      } else if (role === "worker") {
        navigate("/worker");
      } else if (role === "technician") {
        navigate("/technician");
      } else if (role === "customer") {
        navigate("/customer");
      }
    }
  }, [user, loading, role, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
              <Wrench className="h-6 w-6" />
              <span>הפטריוטים</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                ראשי
              </Link>
              <Link 
                to="/marketplace" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                שוק הציוד
              </Link>
              <Link 
                to="/insurance" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                ביטוח לפרויקטים
              </Link>
              <Link 
                to="/auth?role=customer" 
                className="text-green-600 hover:text-green-700 transition-colors font-medium"
              >
                מחפש קבלן? (חינם!)
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                כניסה
              </Button>
              <Button onClick={() => navigate("/auth")}>
                הרשמה
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <nav className="flex flex-col gap-4">
                <Link 
                  to="/" 
                  className="text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ראשי
                </Link>
                <Link 
                  to="/marketplace" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  שוק הציוד
                </Link>
                <Link 
                  to="/insurance" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ביטוח לפרויקטים
                </Link>
                <Link 
                  to="/auth?role=customer" 
                  className="text-green-600 hover:text-green-700 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  מחפש קבלן? (חינם!)
                </Link>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                    כניסה
                  </Button>
                  <Button onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                    הרשמה
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with Background Video */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-40"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-l from-background/85 via-background/80 to-background/70" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center justify-center">
            <div className="space-y-8 text-center max-w-4xl">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium animate-fade-in">
                <Zap className="h-4 w-4" />
                <span>הפטריוטים - הפלטפורמה המובילה בישראל</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
                חיבור מהיר בין
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_100%]">
                  קבלנים לעובדים
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                מצא מפעילי ציוד כבד ועובדים מקצועיים תוך דקות. 
                <span className="text-foreground font-semibold"> מהיר, פשוט ואמין.</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button
                  size="lg"
                  className="text-lg px-10 h-14 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                  onClick={() => navigate("/auth")}
                >
                  התחל עכשיו
                  <ArrowLeft className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 h-14 border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                  onClick={() => navigate("/auth")}
                >
                  כניסה למערכת
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">קבלנים פעילים</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">2000+</div>
                  <div className="text-sm text-muted-foreground">עובדים מקצועיים</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
                  <div className="text-sm text-muted-foreground">שביעות רצון</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-bold text-foreground">איך זה עובד?</h2>
          <p className="text-lg text-muted-foreground">בחר את סוג החשבון המתאים לך</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Customer Card - NEW */}
          <Card 
            className="hover:shadow-lg hover:border-green-500 transition-all duration-300 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" 
            onClick={() => navigate("/auth?role=customer")}
          >
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <Home className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-green-700 dark:text-green-400">לקוח</CardTitle>
                <span className="text-sm font-bold text-green-600">חינם!</span>
              </div>
              <CardDescription className="text-base">
                מחפש קבלן או שירותי שיפוץ?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "חפש קבלנים לפי תחום",
                "קבל הצעות מחיר",
                "צפה בדירוגים וביקורות",
                "ללא עלות!"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contractor Card */}
          <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer" onClick={() => navigate("/auth")}>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">קבלן</CardTitle>
              <CardDescription className="text-base">
                פתח קריאות עבודה ומצא עובדים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "פתח קריאה חדשה בקלות",
                "קבל הצעות מעובדים זמינים",
                "חפש במאגר עובדים",
                "דרג עובדים ושמור היסטוריה"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Worker Card */}
          <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer" onClick={() => navigate("/auth?role=worker")}>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <HardHat className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">פועל</CardTitle>
              <CardDescription className="text-base">
                קבל קריאות עבודה והגדל הכנסות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "קבל התראות על קריאות רלוונטיות",
                "אשר עבודה במהירות",
                "בנה פרופיל מקצועי",
                "נהל זמינות וקבל עבודות"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Equipment Marketplace Card */}
          <Card className="hover:shadow-lg hover:border-orange-500 transition-all duration-300 cursor-pointer bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20" onClick={() => navigate("/marketplace")}>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-orange-700 dark:text-orange-400">שוק הציוד</CardTitle>
              <CardDescription className="text-base">
                קנה או השכר ציוד כבד
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "מודעות למכירה והשכרה",
                "מגוון רחב של ציוד",
                "חיפוש וסינון מתקדם",
                "פרסם מודעות בקלות"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 border-t border-border">
        <div className="container mx-auto px-6 py-20 text-center space-y-8">
          <h2 className="text-4xl font-bold text-foreground">מוכנים להתחיל?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            הצטרף לאלפי קבלנים ועובדים שכבר משתמשים בהפטריוטים
          </p>
          <Button size="lg" className="text-lg px-10 h-12" onClick={() => navigate("/auth")}>
            הירשם חינם
            <ArrowLeft className="mr-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
