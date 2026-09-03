import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Sparkles, TrendingUp, Shield, AlertCircle } from "lucide-react";
import { 
  getWelcomeMessage, 
  processUserQuery, 
  generatePortfolioSuggestions,
  calculateMarketScore,
  type ChatMessage,
  type PortfolioSuggestion 
} from "@/lib/aiTradingAssistant";
import { getCachedInstruments } from "@/lib/clientFetch";
import { generateAllSignalsAsync, type CompositeSignal } from "@/lib/analysisEngines";
import { cn } from "@/lib/utils";

export function AIAssistantTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PortfolioSuggestion[]>([]);
  const [marketScore, setMarketScore] = useState<number>(50);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([getWelcomeMessage()]);
    updateMarketData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateMarketData = async () => {
    const instruments = getCachedInstruments();
    if (instruments.length > 0) {
      const score = calculateMarketScore(instruments);
      setMarketScore(score);
      
      // Generate signals for portfolio suggestions
      const signals = await generateAllSignalsAsync(instruments, [], 30);
      const portfolioSuggestions = generatePortfolioSuggestions(instruments, signals, "medium");
      setSuggestions(portfolioSuggestions);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const instruments = getCachedInstruments();
      const signals: CompositeSignal[] = []; // In real app, fetch signals
      
      const aiResponse = processUserQuery(userMessage.content, instruments, signals);
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 800);
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    setTimeout(() => handleSendMessage(), 100);
  };

  const quickActions = [
    { label: "تحلیل بازار", icon: TrendingUp, query: "وضعیت بازار چطوره؟" },
    { label: "پیشنهاد سبد", icon: Sparkles, query: "چه سهامی پیشنهاد می‌کنی؟" },
    { label: "مدیریت ریسک", icon: Shield, query: "نکات مدیریت ریسک رو بگو" },
  ];

  return (
    <div dir="rtl" className="flex flex-col h-[calc(100vh-200px)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-6 text-primary" />
          <h2 className="text-lg font-bold">دستیار هوشمند ترید</h2>
          <Badge variant={marketScore > 60 ? "default" : marketScore < 40 ? "destructive" : "secondary"}>
            امتیاز بازار: {marketScore}
          </Badge>
        </div>
      </div>

      {/* Market Score Bar */}
      <Card className="p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">وضعیت کلی بازار:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                marketScore > 60 ? "bg-emerald-500" : marketScore < 40 ? "bg-red-500" : "bg-amber-500"
              )}
              style={{ width: `${marketScore}%` }}
            />
          </div>
          <span className={cn(
            "font-bold",
            marketScore > 60 ? "text-emerald-500" : marketScore < 40 ? "text-red-500" : "text-amber-500"
          )}>
            {marketScore > 60 ? "مثبت" : marketScore < 40 ? "منفی" : "خنثی"}
          </span>
        </div>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 max-w-[80%]",
              message.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
            )}
          >
            <div className={cn(
              "rounded-full p-2 shrink-0",
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {message.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div className={cn(
              "rounded-2xl p-3 text-sm whitespace-pre-wrap",
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 ml-auto max-w-[80%]">
            <div className="rounded-full p-2 bg-muted shrink-0">
              <Bot className="size-4 text-muted-foreground" />
            </div>
            <div className="rounded-2xl p-3 bg-muted">
              <div className="flex gap-1">
                <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </Card>

      {/* Portfolio Suggestions */}
      {suggestions.length > 0 && (
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            پیشنهادهای ویژه
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-2 text-xs">
                <div className="font-bold text-primary">{suggestion.symbol}</div>
                <div className="text-muted-foreground mt-1">
                  سهم پیشنهادی: {suggestion.allocation}٪
                </div>
                <div className="text-muted-foreground">
                  ریسک: {suggestion.riskLevel === "low" ? "کم" : suggestion.riskLevel === "medium" ? "متوسط" : "زیاد"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(action.query)}
            disabled={isLoading}
            className="gap-1.5"
          >
            <action.icon className="size-3.5" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="سوال خود را بپرسید..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputValue.trim()}
          size="icon"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
