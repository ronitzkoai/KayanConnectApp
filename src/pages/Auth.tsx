import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, User, Briefcase, Mail, Lock, Phone, UserCircle, Home, Award, Wrench, Check, ChevronRight, ChevronLeft, FileText, Shield } from "lucide-react";

type UserRole = "contractor" | "worker" | "customer" | "technician";

const SPECIALIZATIONS = [
  "ריצוף ואריחים",
  "אינסטלציה",
  "חשמל",
  "גבס ותקרות",
  "צבע וטיח",
  "שיפוצים כלליים",
  "בנייה",
  "עבודות עפר",
  "איטום",
  "אלומיניום וזכוכית"
];

const LICENSE_TYPES = [
  "קבלן רשום",
  "קבלן ראשי",
  "קבלן מורשה חשמל",
  "קבלן מורשה אינסטלציה",
  "ללא רישיון"
];

const EQUIPMENT_TYPES = [
  { id: "באגר", label: "באגר", icon: "🚜" },
  { id: "בובקט", label: "בובקט", icon: "🏗️" },
  { id: "משאית", label: "משאית", icon: "🚛" },
  { id: "טריילר", label: "טריילר", icon: "🚚" },
  { id: "מיני באגר", label: "מיני באגר", icon: "⚙️" },
  { id: "שופל", label: "שופל", icon: "🔧" },
  { id: "מפלסת", label: "מפלסת", icon: "📐" },
  { id: "JCB", label: "JCB", icon: "🦾" },
];

const MAX_BIO_WORDS = 300;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("customer");
  const [step, setStep] = useState<"role" | "details">("role");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Wizard step for worker/contractor (1-4)
  const [wizardStep, setWizardStep] = useState(1);
  
  // Common fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  
  // Contractor fields
  const [licenseType, setLicenseType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  
  // Worker fields
  const [equipmentSkills, setEquipmentSkills] = useState<string[]>([]);
  const [hasOwnEquipment, setHasOwnEquipment] = useState(false);
  const [ownedEquipment, setOwnedEquipment] = useState<string[]>([]);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  // Count words in bio
  const bioWordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0;

  // Technician fields
  const [technicianSpecializations, setTechnicianSpecializations] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");
  const [technicianLocation, setTechnicianLocation] = useState("");

  const TECHNICIAN_SPECIALIZATIONS = [
    "מנועים",
    "הידראוליקה",
    "חשמל כלי רכב",
    "צמיגים",
    "בלמים",
    "מזגנים",
    "תיבות הילוכים",
    "שמנים ופילטרים",
    "ריתוך",
    "פחחות"
  ];

  // Set role from URL params
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam && ["contractor", "worker", "customer", "technician"].includes(roleParam)) {
      setRole(roleParam as UserRole);
      setStep("details");
      setWizardStep(1);
    }
  }, [searchParams]);

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setBio("");
    setLicenseType("");
    setLicenseNumber("");
    setSpecializations([]);
    setEquipmentSkills([]);
    setHasOwnEquipment(false);
    setOwnedEquipment([]);
    setTechnicianSpecializations([]);
    setYearsExperience("");
    setTechnicianLocation("");
    setWizardStep(1);
  };

  const handleTechnicianSpecializationToggle = (spec: string) => {
    setTechnicianSpecializations(prev => 
      prev.includes(spec) 
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const handleSpecializationToggle = (spec: string) => {
    setSpecializations(prev => 
      prev.includes(spec) 
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const handleEquipmentSkillToggle = (equipment: string) => {
    setEquipmentSkills(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const handleOwnedEquipmentToggle = (equipment: string) => {
    setOwnedEquipment(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const handleCustomerSignUp = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("נא למלא שם וטלפון");
      return;
    }

    setLoading(true);
    
    try {
      const tempEmail = `${phone.replace(/\D/g, '')}@customer.hapatriotim.co.il`;
      const tempPassword = `Customer_${phone.replace(/\D/g, '')}_${Date.now()}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            role: "customer",
            full_name: fullName,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from("customer_profiles").insert({
          user_id: data.user.id,
        });
      }

      toast.success("נרשמת בהצלחה!");
      navigate("/customer");
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("מספר הטלפון כבר רשום במערכת");
      } else {
        toast.error(error.message || "שגיאה בהרשמה");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    
    if (role === "customer") {
      await handleCustomerSignUp();
      return;
    }

    if (!phone.trim()) {
      toast.error("נא למלא מספר טלפון");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("נא למלא סיסמה באורך 6 תווים לפחות");
      return;
    }

    if (role === "worker" && equipmentSkills.length === 0) {
      toast.error("נא לבחור לפחות כלי אחד שאתה יודע להפעיל");
      return;
    }

    if (role === "technician" && technicianSpecializations.length === 0) {
      toast.error("נא לבחור לפחות התמחות אחת");
      return;
    }

    // Generate email if not provided
    const finalEmail = email.trim() || `${phone.replace(/\D/g, '')}@${role}.hapatriotim.co.il`;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      if (data.user) {
        if (role === "contractor") {
          await supabase.from("contractor_profiles").insert({
            user_id: data.user.id,
            license_type: licenseType,
            license_number: licenseNumber,
            specializations,
            bio: bio.trim() || null,
          });
        } else if (role === "worker") {
          const skillToWorkType: Record<string, string> = {
            "באגר": "backhoe",
            "בובקט": "bobcat",
            "משאית": "truck_driver",
            "טריילר": "semi_trailer",
            "מיני באגר": "backhoe",
            "שופל": "loader",
            "מפלסת": "grader",
            "JCB": "backhoe"
          };
          const workType = skillToWorkType[equipmentSkills[0]] || "laborer";
          
          await supabase.from("worker_profiles").insert({
            user_id: data.user.id,
            work_type: workType as any,
            owned_equipment: hasOwnEquipment ? ownedEquipment : [],
            equipment_skills: equipmentSkills,
            has_own_equipment: hasOwnEquipment,
            bio: bio.trim() || null,
          });
        } else if (role === "technician") {
          await supabase.from("technician_profiles").insert({
            user_id: data.user.id,
            specializations: technicianSpecializations,
            years_experience: yearsExperience ? parseInt(yearsExperience) : 0,
            location: technicianLocation.trim() || null,
            bio: bio.trim() || null,
          });
        }
      }

      toast.success("נרשמת בהצלחה! מעביר אותך לבחירת מנוי...");
      setTimeout(() => {
        navigate(`/subscription?role=${role}`);
      }, 1000);
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("הטלפון או האימייל כבר רשומים במערכת");
      } else {
        toast.error(error.message || "שגיאה בהרשמה");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const loginEmail = formData.get("email") as string;
    const loginPassword = formData.get("password") as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      toast.success("התחברת בהצלחה!");
      
      if (userRole?.role === "contractor") {
        navigate("/contractor");
      } else if (userRole?.role === "worker") {
        navigate("/worker");
      } else if (userRole?.role === "technician") {
        navigate("/technician");
      } else if (userRole?.role === "customer") {
        navigate("/customer");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: "contractor" | "worker" | "customer" | "technician" | "admin") => {
    const demoEmails: Record<string, string> = {
      contractor: 'demo-contractor@hapatriotim.co.il',
      worker: 'demo-worker@hapatriotim.co.il',
      customer: 'demo-customer@hapatriotim.co.il',
      technician: 'demo-technician@hapatriotim.co.il',
      admin: 'demo-admin@hapatriotim.co.il'
    };
    const demoNames: Record<string, string> = {
      contractor: 'יוסי כהן - קבלן דמו',
      worker: 'דוד לוי - פועל דמו',
      customer: 'שרה ישראלי - לקוח דמו',
      technician: 'משה טכנאי - טכנאי דמו',
      admin: 'מנהל מערכת - אדמין'
    };
    const demoPhones: Record<string, string> = {
      contractor: '050-1234567',
      worker: '052-9876543',
      customer: '054-5551234',
      technician: '053-1112223',
      admin: '050-0000000'
    };
    const demoRoutes: Record<string, string> = {
      contractor: '/contractor',
      worker: '/worker',
      customer: '/customer',
      technician: '/technician',
      admin: '/admin'
    };
    const demoRoleLabels: Record<string, string> = {
      contractor: 'קבלן',
      worker: 'פועל',
      customer: 'לקוח',
      technician: 'טכנאי',
      admin: 'מנהל'
    };

    const demoEmail = demoEmails[demoRole];
    const demoPassword = 'Demo123456!';
    const demoName = demoNames[demoRole];
    const demoPhone = demoPhones[demoRole];

    setLoading(true);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: {
              full_name: demoName,
              phone: demoPhone,
              role: demoRole
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (signUpError) {
          toast.error("שגיאה ביצירת חשבון דמו");
          return;
        }

        // Create technician profile if needed
        if (demoRole === 'technician' && signUpData.user) {
          await supabase.from("technician_profiles").insert({
            user_id: signUpData.user.id,
            specializations: ['מנועים', 'הידראוליקה', 'חשמל כלי רכב'],
            years_experience: 10,
            location: 'מרכז',
            bio: 'טכנאי מנוסה עם התמחות בכלים כבדים',
          });
        }

        const { error: retrySignInError } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        if (retrySignInError) {
          toast.error("שגיאה בכניסה לחשבון דמו");
          return;
        }
      }

      toast.success(`כניסה כ${demoRoleLabels[demoRole]} דמו`);
      navigate(demoRoutes[demoRole]);
    } catch (error: any) {
      toast.error(error.message || "שגיאה בכניסה לדמו");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error("נא להזין כתובת אימייל");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("נשלח אימייל לאיפוס סיסמה");
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      toast.error(error.message || "שגיאה בשליחת אימייל איפוס");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep("details");
    setWizardStep(1);
    resetForm();
  };

  const getTotalSteps = () => {
    if (role === "customer") return 1;
    if (role === "technician") return 4;
    return 4;
  };

  const canProceedToNextStep = () => {
    if (role === "worker") {
      switch (wizardStep) {
        case 1: return equipmentSkills.length > 0;
        case 2: return true; // Optional step
        case 3: return fullName.trim() && phone.trim() && password.length >= 6;
        case 4: return true; // Optional step
        default: return true;
      }
    }
    if (role === "contractor") {
      switch (wizardStep) {
        case 1: return specializations.length > 0;
        case 2: return true; // License is optional
        case 3: return fullName.trim() && phone.trim() && password.length >= 6;
        case 4: return true; // Optional step
        default: return true;
      }
    }
    if (role === "technician") {
      switch (wizardStep) {
        case 1: return technicianSpecializations.length > 0;
        case 2: return true; // Experience is optional
        case 3: return fullName.trim() && phone.trim() && password.length >= 6;
        case 4: return true; // Optional step
        default: return true;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (canProceedToNextStep()) {
      if (wizardStep < getTotalSteps()) {
        setWizardStep(wizardStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    } else {
      setStep("role");
    }
  };

  // Step indicator component
  const StepIndicator = () => {
    const totalSteps = getTotalSteps();
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i + 1 === wizardStep 
                ? 'bg-primary scale-125' 
                : i + 1 < wizardStep 
                  ? 'bg-primary/50' 
                  : 'bg-muted-foreground/30'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground mr-2">
          שלב {wizardStep} מתוך {totalSteps}
        </span>
      </div>
    );
  };

  const renderRoleSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold">בחר סוג משתמש</h3>
        <p className="text-muted-foreground text-sm">לחץ על סוג החשבון המתאים לך</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button 
          type="button"
          className="relative flex flex-col items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 border-green-500/50 bg-background hover:border-green-500 hover:bg-green-500/10 hover:shadow-lg group"
          onClick={() => handleRoleSelect('customer')}
        >
          <Home className="h-10 w-10 mb-2 text-muted-foreground group-hover:text-green-600 transition-colors" />
          <span className="font-bold text-base">לקוח</span>
          <span className="text-xs text-green-600 font-semibold mt-1">הכי מהיר!</span>
        </button>
        
        <button 
          type="button"
          className="relative flex flex-col items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 border-border bg-background hover:border-primary hover:bg-primary/10 hover:shadow-lg group"
          onClick={() => handleRoleSelect('contractor')}
        >
          <Briefcase className="h-10 w-10 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="font-bold text-base">קבלן</span>
        </button>
        
        <button 
          type="button"
          className="relative flex flex-col items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 border-border bg-background hover:border-primary hover:bg-primary/10 hover:shadow-lg group"
          onClick={() => handleRoleSelect('worker')}
        >
          <User className="h-10 w-10 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="font-bold text-base">פועל</span>
        </button>

        <button 
          type="button"
          className="relative flex flex-col items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 border-orange-500/50 bg-background hover:border-orange-500 hover:bg-orange-500/10 hover:shadow-lg group"
          onClick={() => handleRoleSelect('technician')}
        >
          <Wrench className="h-10 w-10 mb-2 text-muted-foreground group-hover:text-orange-600 transition-colors" />
          <span className="font-bold text-base">טכנאי</span>
          <span className="text-xs text-orange-600 font-semibold mt-1">תיקון ציוד</span>
        </button>
      </div>
    </div>
  );

  const renderCustomerForm = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 flex items-center gap-3">
        <Home className="h-8 w-8 text-green-600" />
        <div>
          <span className="font-bold text-lg">הרשמה כלקוח</span>
          <p className="text-sm text-green-700">מהיר וקל - רק שם וטלפון!</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-base font-semibold flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            שם מלא
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="איך קוראים לך?"
            className="h-14 text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5" />
            טלפון נייד
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            placeholder="050-1234567"
            dir="ltr"
            className="h-14 text-lg text-center"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="ml-2 h-6 w-6 animate-spin" />
            נרשם...
          </>
        ) : (
          <>
            <Check className="ml-2 h-6 w-6" />
            הירשם עכשיו
          </>
        )}
      </Button>
    </div>
  );

  // Worker Wizard Steps
  const renderWorkerStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <Wrench className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">באילו כלים אתה יודע לעבוד?</h3>
        <p className="text-sm text-muted-foreground">בחר את כל הכלים שאתה מנוסה בהם</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {EQUIPMENT_TYPES.map(equip => (
          <div 
            key={equip.id}
            className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2 ${
              equipmentSkills.includes(equip.id) 
                ? 'bg-primary/20 border-primary shadow-md scale-[1.02]' 
                : 'bg-muted/30 border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
            onClick={() => handleEquipmentSkillToggle(equip.id)}
          >
            <span className="text-2xl">{equip.icon}</span>
            <span className="font-semibold flex-1">{equip.label}</span>
            {equipmentSkills.includes(equip.id) && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
        ))}
      </div>
      
      {equipmentSkills.length === 0 && (
        <p className="text-sm text-destructive text-center">* חובה לבחור לפחות כלי אחד</p>
      )}
    </div>
  );

  const renderWorkerStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <Wrench className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">יש לך ציוד בבעלותך?</h3>
        <p className="text-sm text-muted-foreground">סמן אם יש לך כלים משלך</p>
      </div>

      <div className="p-6 rounded-2xl bg-muted/50 border-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg font-bold">יש לי ציוד</Label>
            <p className="text-sm text-muted-foreground">אם יש לך כלים בבעלותך, סמן כן</p>
          </div>
          <Switch
            checked={hasOwnEquipment}
            onCheckedChange={setHasOwnEquipment}
            className="scale-150"
          />
        </div>
        
        {hasOwnEquipment && (
          <div className="mt-6 pt-4 border-t space-y-3">
            <Label className="text-base font-semibold">איזה ציוד יש לך?</Label>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_TYPES.map(equip => (
                <div 
                  key={equip.id}
                  className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                    ownedEquipment.includes(equip.id) 
                      ? 'bg-green-500/20 border-green-500' 
                      : 'bg-background border-border hover:border-green-500/50'
                  }`}
                  onClick={() => handleOwnedEquipmentToggle(equip.id)}
                >
                  <span className="text-lg">{equip.icon}</span>
                  <span className="text-sm flex-1">{equip.label}</span>
                  {ownedEquipment.includes(equip.id) && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkerStep3 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <UserCircle className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">פרטים אישיים</h3>
        <p className="text-sm text-muted-foreground">מלא את הפרטים שלך</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            שם מלא *
          </Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="איך קוראים לך?"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4" />
            טלפון נייד *
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            placeholder="050-1234567"
            dir="ltr"
            className="h-12 text-center"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            אימייל (לא חובה)
          </Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="your@email.com"
            dir="ltr"
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">אם לא תזין אימייל, ניצור לך אחד אוטומטית</p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" />
            סיסמה *
          </Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="לפחות 6 תווים"
            minLength={6}
            dir="ltr"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );

  const renderWorkerStep4 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <FileText className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">קצת על עצמך</h3>
        <p className="text-sm text-muted-foreground">ספר על הניסיון שלך (אופציונלי)</p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="ספר קצת על עצמך, הניסיון שלך, והכישורים המיוחדים שלך..."
          className="min-h-[150px] resize-none"
          maxLength={MAX_BIO_WORDS * 10}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>אופציונלי - אפשר לדלג</span>
          <span className={bioWordCount > MAX_BIO_WORDS ? 'text-destructive' : ''}>
            {bioWordCount}/{MAX_BIO_WORDS} מילים
          </span>
        </div>
      </div>

      <Button 
        type="button"
        onClick={() => handleSignUp()}
        className="w-full h-14 text-lg font-bold" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="ml-2 h-6 w-6 animate-spin" />
            נרשם...
          </>
        ) : (
          <>
            <Check className="ml-2 h-6 w-6" />
            סיום הרשמה
          </>
        )}
      </Button>
    </div>
  );

  // Contractor Wizard Steps
  const renderContractorStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <Award className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">תחומי המומחיות שלך</h3>
        <p className="text-sm text-muted-foreground">בחר את כל התחומים שאתה מתמחה בהם</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {SPECIALIZATIONS.map(spec => (
          <div 
            key={spec}
            className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border-2 ${
              specializations.includes(spec) 
                ? 'bg-primary/20 border-primary shadow-sm' 
                : 'bg-muted/30 border-border hover:border-primary/50'
            }`}
            onClick={() => handleSpecializationToggle(spec)}
          >
            <Checkbox 
              checked={specializations.includes(spec)}
              onCheckedChange={() => handleSpecializationToggle(spec)}
              className="h-5 w-5"
            />
            <span className="text-sm flex-1">{spec}</span>
          </div>
        ))}
      </div>
      
      {specializations.length === 0 && (
        <p className="text-sm text-destructive text-center">* חובה לבחור לפחות תחום אחד</p>
      )}
    </div>
  );

  const renderContractorStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <Award className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">פרטי רישיון</h3>
        <p className="text-sm text-muted-foreground">מלא את פרטי הרישיון שלך (אופציונלי)</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">סוג רישיון</Label>
          <Select value={licenseType} onValueChange={setLicenseType}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="בחר סוג רישיון" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {LICENSE_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">מספר רישיון</Label>
          <Input 
            value={licenseNumber} 
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="הזן מספר רישיון"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );

  const renderContractorStep3 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <UserCircle className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">פרטים אישיים</h3>
        <p className="text-sm text-muted-foreground">מלא את הפרטים שלך</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            שם מלא *
          </Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="איך קוראים לך?"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4" />
            טלפון נייד *
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            placeholder="050-1234567"
            dir="ltr"
            className="h-12 text-center"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            אימייל (לא חובה)
          </Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="your@email.com"
            dir="ltr"
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">אם לא תזין אימייל, ניצור לך אחד אוטומטית</p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" />
            סיסמה *
          </Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="לפחות 6 תווים"
            minLength={6}
            dir="ltr"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );

  const renderContractorStep4 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <FileText className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-xl font-bold">קצת על עצמך</h3>
        <p className="text-sm text-muted-foreground">ספר על העסק והניסיון שלך (אופציונלי)</p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="ספר קצת על העסק שלך, הניסיון, הפרויקטים הבולטים..."
          className="min-h-[150px] resize-none"
          maxLength={MAX_BIO_WORDS * 10}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>אופציונלי - אפשר לדלג</span>
          <span className={bioWordCount > MAX_BIO_WORDS ? 'text-destructive' : ''}>
            {bioWordCount}/{MAX_BIO_WORDS} מילים
          </span>
        </div>
      </div>

      <Button 
        type="button"
        onClick={() => handleSignUp()}
        className="w-full h-14 text-lg font-bold" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="ml-2 h-6 w-6 animate-spin" />
            נרשם...
          </>
        ) : (
          <>
            <Check className="ml-2 h-6 w-6" />
            סיום הרשמה
          </>
        )}
      </Button>
    </div>
  );

  const renderWorkerWizard = () => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          <span className="font-bold">הרשמה כעובד</span>
        </div>
        
        <StepIndicator />
        
        {wizardStep === 1 && renderWorkerStep1()}
        {wizardStep === 2 && renderWorkerStep2()}
        {wizardStep === 3 && renderWorkerStep3()}
        {wizardStep === 4 && renderWorkerStep4()}
        
        {wizardStep < 4 && (
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrevStep}
              className="flex-1 h-12"
            >
              <ChevronRight className="ml-1 h-5 w-5" />
              חזור
            </Button>
            <Button 
              type="button"
              onClick={handleNextStep}
              disabled={!canProceedToNextStep()}
              className="flex-1 h-12"
            >
              המשך
              <ChevronLeft className="mr-1 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderContractorWizard = () => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="font-bold">הרשמה כקבלן</span>
        </div>
        
        <StepIndicator />
        
        {wizardStep === 1 && renderContractorStep1()}
        {wizardStep === 2 && renderContractorStep2()}
        {wizardStep === 3 && renderContractorStep3()}
        {wizardStep === 4 && renderContractorStep4()}
        
        {wizardStep < 4 && (
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrevStep}
              className="flex-1 h-12"
            >
              <ChevronRight className="ml-1 h-5 w-5" />
              חזור
            </Button>
            <Button 
              type="button"
              onClick={handleNextStep}
              disabled={!canProceedToNextStep()}
              className="flex-1 h-12"
            >
              המשך
              <ChevronLeft className="mr-1 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Technician Wizard Steps
  const renderTechnicianStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <Wrench className="h-12 w-12 mx-auto text-orange-600" />
        <h3 className="text-lg font-bold">באילו תחומים אתה מתמחה?</h3>
        <p className="text-sm text-muted-foreground">בחר את ההתמחויות שלך</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TECHNICIAN_SPECIALIZATIONS.map((spec) => (
          <div 
            key={spec}
            onClick={() => handleTechnicianSpecializationToggle(spec)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              technicianSpecializations.includes(spec) 
                ? 'border-orange-500 bg-orange-500/10 text-orange-700' 
                : 'border-border hover:border-orange-300'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
              technicianSpecializations.includes(spec) 
                ? 'border-orange-500 bg-orange-500 text-white' 
                : 'border-muted-foreground'
            }`}>
              {technicianSpecializations.includes(spec) && <Check className="h-3 w-3" />}
            </div>
            <span className="text-sm font-medium">{spec}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTechnicianStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <Award className="h-12 w-12 mx-auto text-orange-600" />
        <h3 className="text-lg font-bold">ניסיון ומיקום</h3>
        <p className="text-sm text-muted-foreground">פרטים נוספים עליך</p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="yearsExperience" className="text-base font-semibold">
            שנות ניסיון
          </Label>
          <Input
            id="yearsExperience"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            type="number"
            min="0"
            placeholder="למשל: 5"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="technicianLocation" className="text-base font-semibold">
            אזור שירות
          </Label>
          <Input
            id="technicianLocation"
            value={technicianLocation}
            onChange={(e) => setTechnicianLocation(e.target.value)}
            placeholder="למשל: מרכז, השרון"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );

  const renderTechnicianStep3 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <UserCircle className="h-12 w-12 mx-auto text-orange-600" />
        <h3 className="text-lg font-bold">פרטים אישיים</h3>
        <p className="text-sm text-muted-foreground">שם, טלפון וסיסמה</p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-base font-semibold flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            שם מלא
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="השם שלך"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5" />
            טלפון נייד *
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            placeholder="050-1234567"
            dir="ltr"
            className="h-12 text-center"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            אימייל (אופציונלי)
          </Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="your@email.com"
            dir="ltr"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5" />
            סיסמה *
          </Label>
          <Input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="לפחות 6 תווים"
            dir="ltr"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );

  const renderTechnicianStep4 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <FileText className="h-12 w-12 mx-auto text-orange-600" />
        <h3 className="text-lg font-bold">ספר על עצמך</h3>
        <p className="text-sm text-muted-foreground">תיאור קצר על הניסיון והשירותים שלך</p>
      </div>
      
      <div className="space-y-2">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="ספר על הניסיון שלך, סוגי הציוד שאתה מתמחה בהם, שירותים מיוחדים..."
          className="min-h-[150px] resize-none"
          maxLength={MAX_BIO_WORDS * 10}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>אופציונלי - אפשר לדלג</span>
          <span className={bioWordCount > MAX_BIO_WORDS ? 'text-destructive' : ''}>
            {bioWordCount}/{MAX_BIO_WORDS} מילים
          </span>
        </div>
      </div>

      <Button 
        type="button"
        onClick={() => handleSignUp()}
        className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="ml-2 h-6 w-6 animate-spin" />
            נרשם...
          </>
        ) : (
          <>
            <Check className="ml-2 h-6 w-6" />
            סיום הרשמה
          </>
        )}
      </Button>
    </div>
  );

  const renderTechnicianWizard = () => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
          <Wrench className="h-6 w-6 text-orange-600" />
          <span className="font-bold">הרשמה כטכנאי</span>
        </div>
        
        <StepIndicator />
        
        {wizardStep === 1 && renderTechnicianStep1()}
        {wizardStep === 2 && renderTechnicianStep2()}
        {wizardStep === 3 && renderTechnicianStep3()}
        {wizardStep === 4 && renderTechnicianStep4()}
        
        {wizardStep < 4 && (
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrevStep}
              className="flex-1 h-12"
            >
              <ChevronRight className="ml-1 h-5 w-5" />
              חזור
            </Button>
            <Button 
              type="button"
              onClick={handleNextStep}
              disabled={!canProceedToNextStep()}
              className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
            >
              המשך
              <ChevronLeft className="mr-1 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderRegistrationForm = () => (
    <div className="space-y-4">
      {role !== "customer" && wizardStep === 1 && (
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={() => setStep("role")}
          className="mb-2"
        >
          <ChevronRight className="ml-1 h-4 w-4" />
          חזור לבחירת סוג משתמש
        </Button>
      )}

      {role === 'customer' && (
        <form onSubmit={handleSignUp}>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setStep("role")}
            className="mb-4"
          >
            <ChevronRight className="ml-1 h-4 w-4" />
            חזור לבחירת סוג משתמש
          </Button>
          {renderCustomerForm()}
        </form>
      )}
      {role === 'contractor' && renderContractorWizard()}
      {role === 'worker' && renderWorkerWizard()}
      {role === 'technician' && renderTechnicianWizard()}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      {/* Demo Login Buttons */}
      <div className="absolute top-4 right-4 flex gap-2 z-10 flex-wrap justify-end">
        <Button 
          onClick={() => handleDemoLogin('customer')}
          variant="outline"
          size="sm"
          className="bg-background/95 hover:bg-green-600 hover:text-white"
          disabled={loading}
        >
          <Home className="ml-1 h-3 w-3" />
          <span className="text-xs">דמו לקוח</span>
        </Button>
        <Button 
          onClick={() => handleDemoLogin('contractor')}
          variant="outline"
          size="sm"
          className="bg-background/95 hover:bg-primary hover:text-primary-foreground"
          disabled={loading}
        >
          <Briefcase className="ml-1 h-3 w-3" />
          <span className="text-xs">דמו קבלן</span>
        </Button>
        <Button 
          onClick={() => handleDemoLogin('worker')}
          variant="outline"
          size="sm"
          className="bg-background/95 hover:bg-primary hover:text-primary-foreground"
          disabled={loading}
        >
          <User className="ml-1 h-3 w-3" />
          <span className="text-xs">דמו פועל</span>
        </Button>
        <Button 
          onClick={() => handleDemoLogin('technician')}
          variant="outline"
          size="sm"
          className="bg-background/95 hover:bg-orange-600 hover:text-white"
          disabled={loading}
        >
          <Wrench className="ml-1 h-3 w-3" />
          <span className="text-xs">דמו טכנאי</span>
        </Button>
        <Button 
          onClick={() => handleDemoLogin('admin')}
          variant="outline"
          size="sm"
          className="bg-background/95 hover:bg-red-600 hover:text-white"
          disabled={loading}
        >
          <Shield className="ml-1 h-3 w-3" />
          <span className="text-xs">דמו מנהל</span>
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-2 max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-2 text-center pb-4 bg-gradient-to-b from-primary/5 to-transparent sticky top-0 z-10 bg-background">
          <CardTitle className="text-3xl font-bold text-foreground">כניסה למערכת</CardTitle>
          <CardDescription className="text-base">התחבר או הירשם כדי להתחיל</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Tabs value={activeTab} onValueChange={(value) => {
            const newTab = value as "login" | "register";
            setActiveTab(newTab);
            if (newTab === "register") {
              setStep("role");
              setWizardStep(1);
            }
          }} dir="rtl">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="login" className="font-semibold text-base">התחברות</TabsTrigger>
              <TabsTrigger value="register" className="font-semibold text-base">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 space-y-4">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowForgotPassword(false)}
                    className="mb-2"
                  >
                    <ChevronRight className="ml-1 h-4 w-4" />
                    חזור להתחברות
                  </Button>
                  <div className="text-center space-y-2 mb-4">
                    <h3 className="text-xl font-bold">שכחת סיסמה?</h3>
                    <p className="text-muted-foreground text-sm">הזן את האימייל שלך ונשלח לך קישור לאיפוס</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="flex items-center gap-2 text-base font-semibold">
                      <Mail className="h-5 w-5" />
                      אימייל
                    </Label>
                    <Input
                      id="forgot-email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="your@email.com"
                      dir="ltr"
                      className="h-14 text-lg"
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                        שולח...
                      </>
                    ) : (
                      "שלח קישור לאיפוס"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2 text-base font-semibold">
                      <Mail className="h-5 w-5" />
                      אימייל
                    </Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      dir="ltr"
                      className="h-14 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="flex items-center gap-2 text-base font-semibold">
                        <Lock className="h-5 w-5" />
                        סיסמה
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        שכחתי סיסמה
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      dir="ltr"
                      className="h-14 text-lg"
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                        מתחבר...
                      </>
                    ) : (
                      "התחבר למערכת"
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              {step === "role" ? renderRoleSelection() : renderRegistrationForm()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
