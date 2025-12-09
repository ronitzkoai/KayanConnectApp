import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, CheckCircle, ChevronLeft, Truck, Plus, Fuel } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { ContractorLayout } from "@/components/ContractorLayout";
import { EquipmentSelector } from "@/components/EquipmentSelector";
import { QuickJobModal } from "@/components/QuickJobModal";
import { SandDeliveryModal } from "@/components/SandDeliveryModal";
import { FuelOrderModal } from "@/components/FuelOrderModal";
import { MiniChatPanel } from "@/components/MiniChatPanel";
import { ServiceTypeModal } from "@/components/ServiceTypeModal";
import { TruckTypeModal } from "@/components/TruckTypeModal";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";
import { EquipmentSearchModal } from "@/components/EquipmentSearchModal";
import { NewJobModal } from "@/components/NewJobModal";
import { AIAssistant, AIAssistantRef } from "@/components/AIAssistant";

interface JobRequest {
  id: string;
  work_type: string;
  location: string;
  work_date: string;
  urgency: string;
  status: string;
  created_at: string;
  accepted_by: string | null;
  worker_profiles: {
    user_id: string;
    profiles: {
      full_name: string;
    };
  } | null;
}

const ContractorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showSandModal, setShowSandModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<{type: string, label: string} | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<'operator_with_equipment' | 'equipment_only' | 'operator_only'>('operator_with_equipment');
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [truckModalOpen, setTruckModalOpen] = useState(false);
  const aiAssistantRef = useRef<AIAssistantRef>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadJobs();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(data);
  };

  useEffect(() => {
    if (!roleLoading && role && role !== "contractor") {
      toast.error("אין לך הרשאה לגשת לעמוד זה");
      navigate("/");
    }
  }, [role, roleLoading, navigate]);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("job_requests")
      .select(`
        *,
        worker_profiles:accepted_by (
          user_id,
          profiles:user_id (
            full_name
          )
        )
      `)
      .eq("contractor_id", user?.id)
      .order("created_at", { ascending: false });
    
    if (data) setJobs(data as any);
  };

  const getWorkTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      backhoe: "באגר",
      loader: "שופל",
      bobcat: "בובקט",
      grader: "מפלסת",
      truck_driver: "נהג משאית",
      semi_trailer: "סמיטריילר",
      full_trailer: "פול טריילר",
      bathtub: "אמבטיה",
      double: "דאבל",
      flatbed: "רמסע",
      laborer: "פועל",
      mini_excavator: "מיני מחפרון",
      excavator: "מחפרון",
      mini_backhoe: "מיני באגר",
      wheeled_backhoe: "באגר גלגלים",
      telescopic_loader: "מעמיס טלסקופי",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: "פתוח",
      accepted: "שובץ",
      completed: "הושלם",
      cancelled: "בוטל",
    };
    return labels[status] || status;
  };

  const handleEquipmentSelect = (type: string, label: string) => {
    if (type === "trucks") {
      setTruckModalOpen(true);
      return;
    }
    setSelectedEquipment({ type, label });
    setServiceModalOpen(true);
  };

  const handleTruckTypeSelect = (type: string, label: string) => {
    setSelectedEquipment({ type, label });
    setServiceModalOpen(true);
  };

  const handleServiceTypeSelect = (serviceType: 'operator_with_equipment' | 'equipment_only' | 'operator_only') => {
    setSelectedServiceType(serviceType);
    setServiceModalOpen(false);
    
    if (serviceType === 'equipment_only') {
      setEquipmentSearchOpen(true);
    } else {
      setModalOpen(true);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-base font-medium text-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  const activeJobs = jobs.filter(j => j.status !== "completed" && j.status !== "cancelled");

  return (
    <ContractorLayout>
      <div className="w-full min-h-screen bg-gradient-to-br from-muted/30 to-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-l from-primary/5 via-background to-secondary/5 border-b border-border/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                היי {profile?.full_name?.split(" ")[0] || "קבלן"}!
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground">
                מה אתה צריך היום?
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          {/* AI Assistant with Quick Actions */}
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Quick Action Buttons - Hidden on mobile for cleaner UI */}
            <div className="hidden sm:flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs border-primary/30 hover:bg-primary/10"
                onClick={() => aiAssistantRef.current?.sendMessage('תמצא לי מפעיל באגר למחר בתל אביב')}
              >
                תמצא לי מפעיל באגר למחר בתל אביב
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs border-primary/30 hover:bg-primary/10"
                onClick={() => aiAssistantRef.current?.sendMessage('אני צריך שופל עם מפעיל לעבודה בחיפה')}
              >
                אני צריך שופל עם מפעיל לעבודה בחיפה
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs border-primary/30 hover:bg-primary/10"
                onClick={() => aiAssistantRef.current?.sendMessage('מי העובדים הזמינים שלי השבוע?')}
              >
                מי העובדים הזמינים שלי השבוע?
              </Button>
            </div>
            
            {/* AI Chat */}
            <div className="flex justify-center px-2 sm:px-0">
              <AIAssistant ref={aiAssistantRef} />
            </div>
          </div>

          {/* Open New Job Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => setNewJobModalOpen(true)}
              size="lg"
              className="h-16 px-10 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all animate-fade-in"
            >
              <Plus className="ml-2 h-6 w-6" />
              פתח קריאה חדשה
            </Button>
          </div>

          {/* Equipment Selector */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground text-center">
              או בחר כלי ספציפי
            </h2>
          <EquipmentSelector onSelect={handleEquipmentSelect} />
          
          {/* Sand & Fuel Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Card 
              className="cursor-pointer transition-all duration-300 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400 hover:shadow-md"
              onClick={() => setShowSandModal(true)}
            >
              <CardContent className="flex items-center justify-center gap-3 py-5">
                <Truck className="h-6 w-6 text-amber-600" />
                <span className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  צריך לשפוך/לקנות חול?
                </span>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer transition-all duration-300 bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30 hover:border-green-400 hover:shadow-md"
              onClick={() => setShowFuelModal(true)}
            >
              <CardContent className="flex items-center justify-center gap-3 py-5">
                <Fuel className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold text-green-800 dark:text-green-200">
                  צריך לתדלק?
                </span>
              </CardContent>
            </Card>
          </div>
          </div>

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  הקריאות הפעילות שלך
                </h2>
                <Badge variant="secondary" className="text-base px-4 py-1">
                  {activeJobs.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {activeJobs.slice(0, 5).map((job) => (
                  <Card
                    key={job.id}
                    className="bg-card border-2 hover:border-primary cursor-pointer transition-all duration-200 hover:shadow-lg"
                    onClick={() => navigate(`/contractor/jobs/${job.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground">
                              {getWorkTypeLabel(job.work_type)}
                            </h3>
                            <Badge 
                              variant={job.status === "accepted" ? "secondary" : "default"}
                            >
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(job.work_date).toLocaleDateString("he-IL")}</span>
                            </div>
                          </div>

                          {job.worker_profiles && (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span className="font-semibold text-foreground">
                                {job.worker_profiles.profiles.full_name}
                              </span>
                            </div>
                          )}
                        </div>
                        <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {activeJobs.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate("/contractor/jobs")}
                  >
                    הצג את כל {activeJobs.length} הקריאות
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <Button
              onClick={() => navigate("/contractor/workers")}
              variant="outline"
              className="h-20 text-lg font-semibold"
            >
              מאגר עובדים
            </Button>
            <Button
              onClick={() => navigate("/contractor/jobs")}
              variant="outline"
              className="h-20 text-lg font-semibold"
            >
              כל הקריאות שלי
            </Button>
          </div>
        </div>
      </div>

      {/* Service Type Modal */}
      {selectedEquipment && (
        <ServiceTypeModal
          open={serviceModalOpen}
          onOpenChange={setServiceModalOpen}
          onSelect={handleServiceTypeSelect}
          workTypeLabel={selectedEquipment.label}
        />
      )}

      {/* Quick Job Modal */}
      {selectedEquipment && (
        <QuickJobModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          workType={selectedEquipment.type}
          workTypeLabel={selectedEquipment.label}
          serviceType={selectedServiceType}
        />
      )}

      {/* Equipment Search Modal */}
      {selectedEquipment && (
        <EquipmentSearchModal
          open={equipmentSearchOpen}
          onOpenChange={setEquipmentSearchOpen}
          workType={selectedEquipment.type}
          workTypeLabel={selectedEquipment.label}
        />
      )}

      {/* Sand Delivery Modal */}
      <SandDeliveryModal
        open={showSandModal}
        onOpenChange={setShowSandModal}
      />

      {/* Fuel Order Modal */}
      <FuelOrderModal
        open={showFuelModal}
        onOpenChange={setShowFuelModal}
      />

      {/* New Job Modal */}
      <NewJobModal
        open={newJobModalOpen}
        onOpenChange={setNewJobModalOpen}
        onSuccess={() => window.location.reload()}
      />

      {/* Truck Type Modal */}
      <TruckTypeModal
        open={truckModalOpen}
        onOpenChange={setTruckModalOpen}
        onSelect={handleTruckTypeSelect}
      />

      {/* Mini Chat Panel */}
      <MiniChatPanel />
    </ContractorLayout>
  );
};

export default ContractorDashboard;
