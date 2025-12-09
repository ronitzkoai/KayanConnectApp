import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FloatingChatWidget = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/chat")}
      className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-40 w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 bg-primary hover:bg-primary/90"
      aria-label="פתח הודעות"
    >
      <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
    </button>
  );
};
