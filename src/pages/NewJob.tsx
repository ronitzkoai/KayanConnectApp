import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// This page now redirects to the contractor dashboard
// The new job flow is handled by the NewJobModal component
const NewJob = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to contractor dashboard - the modal will be available there
    navigate("/contractor", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-base font-medium text-foreground">מעביר...</p>
      </div>
    </div>
  );
};

export default NewJob;
