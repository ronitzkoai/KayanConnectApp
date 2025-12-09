import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContractorLayout } from "@/components/ContractorLayout";
import { WorkerLayout } from "@/components/WorkerLayout";
import { TechnicianLayout } from "@/components/TechnicianLayout";
import { useMessages } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { MessageCircle, Users, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";

const GLOBAL_CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";

export default function Chat() {
  const { role } = useUserRole();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "private">(conversationId ? "private" : "general");
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Global chat messages
  const { messages: globalMessages, loading: globalLoading, sendMessage: sendGlobalMessage } = useMessages(GLOBAL_CONVERSATION_ID, userId || undefined);
  
  // Private conversations
  const { conversations, loading: conversationsLoading } = useConversations(userId || undefined);
  
  // Selected private conversation messages
  const { messages: privateMessages, loading: privateLoading, sendMessage: sendPrivateMessage } = useMessages(conversationId, userId || undefined);

  // Find the other user in the selected conversation
  const selectedConversation = conversations.find(c => c.id === conversationId);

  useEffect(() => {
    const loadUserAndJoinChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Ensure user is a participant in the global chat
        const { data: existingParticipant } = await supabase
          .from("conversation_participants")
          .select("id")
          .eq("conversation_id", GLOBAL_CONVERSATION_ID)
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (!existingParticipant) {
          await supabase
            .from("conversation_participants")
            .insert({
              conversation_id: GLOBAL_CONVERSATION_ID,
              user_id: user.id,
            });
        }
      }
    };

    loadUserAndJoinChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [globalMessages, privateMessages]);

  useEffect(() => {
    if (conversationId) {
      setActiveTab("private");
    }
  }, [conversationId]);

  const handleSendGlobalMessage = async (content: string) => {
    try {
      await sendGlobalMessage(content);
    } catch (error) {
      toast.error("שגיאה בשליחת ההודעה");
    }
  };

  const handleSendPrivateMessage = async (content: string) => {
    try {
      await sendPrivateMessage(content);
    } catch (error) {
      toast.error("שגיאה בשליחת ההודעה");
    }
  };

  const handleConversationSelect = (convId: string) => {
    navigate(`/chat/${convId}`);
  };

  const Layout = role === "contractor" ? ContractorLayout : role === "technician" ? TechnicianLayout : WorkerLayout;

  if (!userId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </Layout>
    );
  }

  // Check if we're viewing the global chat via URL
  const isViewingGlobalChat = conversationId === GLOBAL_CONVERSATION_ID;
  const showGlobalChat = (isViewingGlobalChat || activeTab === "general") && !conversationId;
  const showPrivateChat = conversationId && conversationId !== GLOBAL_CONVERSATION_ID;
  const showConversationsList = activeTab === "private" && !conversationId;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background">
        {/* Tabs Header - Fixed height */}
        <div className="flex-shrink-0 border-b bg-card px-4 py-2">
          <div className="grid w-full max-w-md grid-cols-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab("general");
                navigate("/chat");
              }}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                showGlobalChat ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              צ׳אט כללי
            </button>
            <button
              onClick={() => setActiveTab("private")}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                showPrivateChat || showConversationsList ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              שיחות אישיות
            </button>
          </div>
        </div>

        {/* Main Content Area - Fills remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Global Chat */}
          {showGlobalChat && (
            <>
              {/* Header */}
              <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b bg-card shadow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">צ׳אט כללי</h3>
                  <p className="text-sm text-muted-foreground">קבוצה של כל המשתמשים במערכת</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {globalLoading ? (
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground">טוען הודעות...</p>
                  </div>
                ) : globalMessages.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-2 mx-auto" />
                    <p className="text-muted-foreground">עדיין אין הודעות בקבוצה</p>
                    <p className="text-sm text-muted-foreground mt-1">היה הראשון לשלוח הודעה!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {globalMessages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        id={message.id}
                        content={message.content}
                        isMine={message.sender_id === userId}
                        timestamp={message.created_at}
                        senderName={message.sender_name}
                        userId={userId}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex-shrink-0 pb-20 md:pb-0">
                <ChatInput onSend={handleSendGlobalMessage} disabled={globalLoading} />
              </div>
            </>
          )}

          {/* Private Chat - Selected Conversation */}
          {showPrivateChat && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* Conversations List - Desktop only */}
              <div className="hidden md:flex w-80 border-l flex-col bg-card flex-shrink-0">
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                  <h3 className="font-semibold">שיחות</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewChat(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    חדש
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {conversationsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">טוען...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>אין שיחות עדיין</p>
                      <Button
                        variant="link"
                        onClick={() => setShowNewChat(true)}
                        className="mt-2"
                      >
                        התחל שיחה חדשה
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {conversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => handleConversationSelect(conv.id)}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            conversationId === conv.id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <MessageCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{conv.other_user?.full_name || "משתמש"}</p>
                              {conv.last_message && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {conv.last_message.content}
                                </p>
                              )}
                            </div>
                            {conv.unread_count > 0 && (
                              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b bg-card shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/chat")}
                    className="md:hidden"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedConversation?.other_user?.full_name || "משתמש"}</h3>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {privateLoading ? (
                    <div className="py-4 text-center">
                      <p className="text-muted-foreground">טוען הודעות...</p>
                    </div>
                  ) : privateMessages.length === 0 ? (
                    <div className="py-8 text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-2 mx-auto" />
                      <p className="text-muted-foreground">אין הודעות עדיין</p>
                      <p className="text-sm text-muted-foreground mt-1">שלח הודעה ראשונה!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {privateMessages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          id={message.id}
                          content={message.content}
                          isMine={message.sender_id === userId}
                          timestamp={message.created_at}
                          senderName={message.sender_name}
                          userId={userId}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex-shrink-0 pb-20 md:pb-0">
                  <ChatInput onSend={handleSendPrivateMessage} disabled={privateLoading} />
                </div>
              </div>
            </div>
          )}

          {/* Conversations List Only */}
          {showConversationsList && (
            <div className="flex-1 flex flex-col bg-card">
              <div className="flex-shrink-0 p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">שיחות</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewChat(true)}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  חדש
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {conversationsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">טוען...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>אין שיחות עדיין</p>
                    <Button
                      variant="link"
                      onClick={() => setShowNewChat(true)}
                      className="mt-2"
                    >
                      התחל שיחה חדשה
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleConversationSelect(conv.id)}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          conversationId === conv.id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{conv.other_user?.full_name || "משתמש"}</p>
                            {conv.last_message && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message.content}
                              </p>
                            )}
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <NewChatDialog
          open={showNewChat}
          onOpenChange={setShowNewChat}
          currentUserId={userId}
        />
      </div>
    </Layout>
  );
}