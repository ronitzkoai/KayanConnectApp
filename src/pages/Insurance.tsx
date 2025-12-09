import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Star, 
  Phone, 
  MessageCircle, 
  Search,
  Wrench,
  CheckCircle,
  Award,
  Users,
  Building2,
  Briefcase,
  FileCheck,
  Menu,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Demo insurance agents data
const demoAgents = [
  {
    id: "1",
    name: "יוסי כהן",
    company: "ביטוח ישיר לקבלנים",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    specializations: ["ביטוח עבודות קבלניות", "ביטוח ציוד כבד", "ביטוח צד ג׳"],
    rating: 4.9,
    totalReviews: 127,
    yearsExperience: 15,
    phone: "050-1234567",
    isVerified: true,
    description: "מתמחה בביטוח פרויקטים קבלניים מזה 15 שנה. מציע פתרונות מקיפים לקבלנים מכל הסוגים.",
    features: ["מענה תוך 24 שעות", "ליווי אישי בתביעות", "מחירים תחרותיים"]
  },
  {
    id: "2",
    name: "רונית לוי",
    company: "ביטוח פלוס",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    specializations: ["ביטוח אחריות מקצועית", "ביטוח עובדים", "ביטוח רכוש"],
    rating: 4.8,
    totalReviews: 89,
    yearsExperience: 12,
    phone: "052-9876543",
    isVerified: true,
    description: "סוכנת ביטוח עם התמחות בענף הבנייה והתשתיות. מעניקה שירות אישי ומקצועי.",
    features: ["פוליסות מותאמות אישית", "ייעוץ חינם", "הנחות לחברי הפטריוטים"]
  },
  {
    id: "3",
    name: "אבי מזרחי",
    company: "ביטוח הקבלן",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    specializations: ["ביטוח קבלני משנה", "ביטוח כל הסיכונים", "ביטוח אחריות מעבידים"],
    rating: 4.7,
    totalReviews: 156,
    yearsExperience: 20,
    phone: "054-5551234",
    isVerified: true,
    description: "20 שנות ניסיון בביטוח ענף הבנייה. מומחה בפתרונות ביטוח מורכבים לפרויקטים גדולים.",
    features: ["מומחיות בפרויקטים גדולים", "קשרים עם כל חברות הביטוח", "טיפול מהיר בתביעות"]
  },
  {
    id: "4",
    name: "מיכל ברק",
    company: "שומרי הביטוח",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    specializations: ["ביטוח ציוד", "ביטוח תאונות עבודה", "ביטוח אש ורעידת אדמה"],
    rating: 4.9,
    totalReviews: 73,
    yearsExperience: 8,
    phone: "053-7778888",
    isVerified: true,
    description: "מתמחה בביטוח ציוד כבד ותאונות עבודה. גישה צעירה ודינמית עם שירות מעולה.",
    features: ["זמינות 24/7", "אפליקציה לניהול פוליסות", "תהליך הצטרפות מהיר"]
  },
  {
    id: "5",
    name: "דוד פרץ",
    company: "ביטוח בונים",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    specializations: ["ביטוח עבודות בנייה", "ביטוח הנדסי", "ביטוח אחריות מוצר"],
    rating: 4.6,
    totalReviews: 201,
    yearsExperience: 25,
    phone: "050-2223333",
    isVerified: true,
    description: "הסוכן הוותיק ביותר בתחום ביטוח הבנייה. ניסיון עשיר בליווי פרויקטים לאומיים.",
    features: ["ניסיון בפרויקטים לאומיים", "קשרים בכירים בענף", "מחירים מיוחדים לקבלנים גדולים"]
  },
  {
    id: "6",
    name: "שירה גולן",
    company: "ביטוח חכם",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    specializations: ["ביטוח דיגיטלי", "ביטוח סייבר", "ביטוח עסקי כללי"],
    rating: 4.8,
    totalReviews: 45,
    yearsExperience: 5,
    phone: "058-4445555",
    isVerified: false,
    description: "מביאה גישה חדשנית לעולם הביטוח. מתמחה בפתרונות דיגיטליים וביטוח סייבר לקבלנים.",
    features: ["הכל דיגיטלי", "ללא ניירת", "מחירים שקופים"]
  }
];

const insuranceTypes = [
  { 
    icon: Building2, 
    title: "ביטוח עבודות קבלניות", 
    description: "כיסוי מקיף לכל סוגי העבודות" 
  },
  { 
    icon: Briefcase, 
    title: "ביטוח ציוד כבד", 
    description: "הגנה על הציוד היקר שלך" 
  },
  { 
    icon: Users, 
    title: "ביטוח עובדים", 
    description: "ביטוח אחריות מעבידים ותאונות" 
  },
  { 
    icon: FileCheck, 
    title: "ביטוח אחריות מקצועית", 
    description: "כיסוי לטעויות מקצועיות" 
  }
];

const Insurance = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allSpecializations = [...new Set(demoAgents.flatMap(agent => agent.specializations))];

  const filteredAgents = demoAgents.filter(agent => {
    const matchesSearch = agent.name.includes(searchQuery) || 
                         agent.company.includes(searchQuery) ||
                         agent.specializations.some(s => s.includes(searchQuery));
    const matchesSpecialization = !selectedSpecialization || 
                                  agent.specializations.includes(selectedSpecialization);
    return matchesSearch && matchesSpecialization;
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
              <Wrench className="h-6 w-6" />
              <span>הפטריוטים</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                ראשי
              </Link>
              <Link to="/marketplace" className="text-muted-foreground hover:text-primary transition-colors">
                שוק הציוד
              </Link>
              <Link to="/insurance" className="text-foreground font-medium">
                ביטוח לפרויקטים
              </Link>
              <Link to="/auth?role=customer" className="text-green-600 hover:text-green-700 transition-colors font-medium">
                מחפש קבלן? (חינם!)
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                כניסה
              </Button>
              <Button onClick={() => navigate("/auth")}>
                הרשמה
              </Button>
            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <nav className="flex flex-col gap-4">
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  ראשי
                </Link>
                <Link to="/marketplace" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  שוק הציוד
                </Link>
                <Link to="/insurance" className="text-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>
                  ביטוח לפרויקטים
                </Link>
                <Link to="/auth?role=customer" className="text-green-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
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

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        
        <div className="relative container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>שותפות עם סוכני הביטוח המובילים</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
              ביטוח לפרויקטים
              <span className="block text-blue-200">בקליק אחד</span>
            </h1>
            
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              מצא את סוכן הביטוח המושלם לפרויקט שלך. 
              השווה מחירים, קרא ביקורות, וקבל הצעה מותאמת אישית.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="חפש סוכן ביטוח או סוג ביטוח..."
                  className="h-14 pr-12 text-lg bg-white border-0 shadow-2xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">50+</div>
                <div className="text-sm text-blue-200">סוכני ביטוח</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">10,000+</div>
                <div className="text-sm text-blue-200">פוליסות פעילות</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">₪50M+</div>
                <div className="text-sm text-blue-200">בתביעות ששולמו</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </div>

      {/* Insurance Types */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {insuranceTypes.map((type, index) => (
            <Card 
              key={index}
              className="hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer group"
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <type.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{type.title}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSpecialization === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSpecialization(null)}
          >
            הכל
          </Button>
          {allSpecializations.slice(0, 6).map((spec) => (
            <Button
              key={spec}
              variant={selectedSpecialization === spec ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSpecialization(spec)}
            >
              {spec}
            </Button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="container mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <Card 
              key={agent.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-2 hover:border-primary/30"
            >
              {/* Card Header with gradient */}
              <div className="relative h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%20fill-rule%3D%22evenodd%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%223%22%2F%3E%3Ccircle%20cx%3D%2213%22%20cy%3D%2213%22%20r%3D%223%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
                
                {agent.isVerified && (
                  <Badge className="absolute top-3 left-3 bg-green-500 hover:bg-green-600">
                    <Award className="h-3 w-3 ml-1" />
                    סוכן מאומת
                  </Badge>
                )}
              </div>

              {/* Avatar */}
              <div className="relative px-6 -mt-12">
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-24 h-24 rounded-2xl border-4 border-background shadow-lg object-cover"
                />
              </div>

              <CardHeader className="pt-4 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{agent.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{agent.company}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-yellow-700 dark:text-yellow-400">{agent.rating}</span>
                    <span className="text-xs text-muted-foreground">({agent.totalReviews})</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {agent.yearsExperience} שנות ניסיון
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {agent.specializations.slice(0, 2).map((spec) => (
                    <Badge key={spec} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                  {agent.specializations.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.specializations.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-1 pt-2 border-t border-border">
                  {agent.features.slice(0, 2).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 gap-2" size="sm">
                    <Phone className="h-4 w-4" />
                    התקשר
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" size="sm">
                    <MessageCircle className="h-4 w-4" />
                    צ׳אט
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">אתה סוכן ביטוח?</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            הצטרף לרשת סוכני הביטוח של הפטריוטים וקבל גישה לאלפי קבלנים ועובדים
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-10 h-12">
            הצטרף כסוכן
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Insurance;
