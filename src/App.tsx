import { Toaster } from "@/components/ui/toaster";
// Chat route with conversation ID support
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseProvider } from "@/lib/supabase-context";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ContractorDashboard from "./pages/ContractorDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import NewJob from "./pages/NewJob";
import NotFound from "./pages/NotFound";
import MyJobs from "./pages/contractor/MyJobs";
import JobDetails from "./pages/contractor/JobDetails";
import WorkerDirectory from "./pages/contractor/WorkerDirectory";
import WorkerProfile from "./pages/contractor/WorkerProfile";
import ContractorSettings from "./pages/contractor/Settings";
import ContractorBilling from "./pages/contractor/Billing";
import ContractorMaintenance from "./pages/contractor/Maintenance";
import CustomerContractorProfile from "./pages/customer/ContractorProfile";
import WorkerProfileEditor from "./pages/worker/ProfileEditor";
import WorkerMyJobs from "./pages/worker/MyJobs";
import WorkerJobDetails from "./pages/worker/JobDetails";
import WorkerMyRatings from "./pages/worker/MyRatings";
import WorkerSettings from "./pages/worker/Settings";
import TechnicianServiceRequests from "./pages/technician/ServiceRequests";
import TechnicianContractorSearch from "./pages/technician/ContractorSearch";
import TechnicianProfile from "./pages/technician/Profile";
import TechnicianRatings from "./pages/technician/Ratings";
import TechnicianSettings from "./pages/technician/Settings";
import Chat from "./pages/Chat";
import ContractorProfile from "./pages/contractor/Profile";
import EquipmentMarketplace from "./pages/EquipmentMarketplace";
import Insurance from "./pages/Insurance";
import SubscriptionPlan from "./pages/SubscriptionPlan";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/marketplace" element={<EquipmentMarketplace />} />
            <Route path="/insurance" element={<Insurance />} />
            <Route path="/subscription" element={<SubscriptionPlan />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/contractor" element={<ContractorDashboard />} />
            <Route path="/contractor/new-job" element={<NewJob />} />
            <Route path="/contractor/jobs" element={<MyJobs />} />
            <Route path="/contractor/jobs/:jobId" element={<JobDetails />} />
            <Route path="/contractor/workers" element={<WorkerDirectory />} />
            <Route path="/contractor/workers/:workerId" element={<WorkerProfile />} />
            <Route path="/contractor/settings" element={<ContractorSettings />} />
            <Route path="/contractor/billing" element={<ContractorBilling />} />
            <Route path="/contractor/profile" element={<ContractorProfile />} />
            <Route path="/contractor/maintenance" element={<ContractorMaintenance />} />
            <Route path="/customer/contractor/:contractorId" element={<CustomerContractorProfile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/worker" element={<WorkerDashboard />} />
            <Route path="/worker/profile" element={<WorkerProfileEditor />} />
            <Route path="/worker/jobs" element={<WorkerMyJobs />} />
            <Route path="/worker/jobs/:jobId" element={<WorkerJobDetails />} />
            <Route path="/worker/ratings" element={<WorkerMyRatings />} />
            <Route path="/worker/settings" element={<WorkerSettings />} />
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/technician/requests" element={<TechnicianServiceRequests />} />
            <Route path="/technician/contractors" element={<TechnicianContractorSearch />} />
            <Route path="/technician/profile" element={<TechnicianProfile />} />
            <Route path="/technician/ratings" element={<TechnicianRatings />} />
            <Route path="/technician/settings" element={<TechnicianSettings />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SupabaseProvider>
  </QueryClientProvider>
);

export default App;
