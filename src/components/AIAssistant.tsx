import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, Globe, ArrowUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIAssistantRef {
  sendMessage: (text: string) => void;
}

export const AIAssistant = forwardRef<AIAssistantRef>((props, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'he-IL';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: 'שגיאה',
          description: 'לא הצלחנו להקליט. נסה שוב.',
          variant: 'destructive',
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [toast]);

  useImperativeHandle(ref, () => ({
    sendMessage
  }));

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'לא נתמך',
        description: 'הדפדפן שלך לא תומך בהקלטת קול',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            conversationHistory: messages.slice(-6),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'tool_result') {
                if (parsed.result?.success) {
                  toast({
                    title: '✅ הצליח!',
                    description: parsed.result.message,
                  });
                }
              } else if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                assistantMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'שגיאה',
        description: 'משהו השתבש. נסה שוב.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Messages Display */}
      {messages.length > 0 && (
        <div className="max-h-48 sm:max-h-60 overflow-y-auto space-y-2 mb-2 px-1">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-4 sm:ml-8'
                  : 'bg-muted text-foreground mr-4 sm:mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Gradient Border Wrapper */}
      <div className="relative p-[2px] rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400 shadow-lg">
        {/* Inner Container */}
        <div className="relative bg-background rounded-2xl p-3">
          {/* Sparkle Icon */}
          <div className="absolute top-2.5 left-2.5">
            <Sparkles className="w-3.5 h-3.5 text-foreground/40" />
          </div>

          {/* Main Input Area */}
          <div className="mt-5 mb-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={isListening ? 'מקשיב...' : 'מה אתה צריך?'}
              disabled={isLoading || isListening}
              className="w-full min-h-[44px] sm:min-h-[40px] bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50 resize-none text-sm"
            />
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>חושב...</span>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/10">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-7 sm:w-7 rounded-full hover:bg-muted/50"
                onClick={() => setInput('')}
              >
                <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-7 sm:w-7 rounded-full hover:bg-muted/50"
                onClick={toggleListening}
                disabled={isLoading}
              >
                <Globe className={`w-4 h-4 sm:w-3 sm:h-3 ${isListening ? 'animate-pulse text-primary' : ''}`} />
              </Button>
            </div>
            
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-9 w-9 sm:h-7 sm:w-7 rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-none"
            >
              <ArrowUp className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});