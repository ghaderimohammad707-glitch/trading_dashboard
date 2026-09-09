import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus, Search, Filter, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { useMemo, useState } from "react";
import type { CompleteSignal } from "@/lib/analysis";
import { toast } from "sonner";

interface SignalsTabProps {
  signals: CompleteSignal[];
  onAddToPortfolio: (signal: CompleteSignal) => void;
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const normalized = Math.max(0, Math.min(100, score));
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-16 text-muted-foreground shrink-0">{icon} {label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            normalized > 70 ? "bg-gradient-to-l from-emerald-500 to-emerald-400" : normalized > 40 ? "bg-gradient-to-l from-amber-500 to-amber-400" : "bg-gradient-to-l from-rose-500 to-rose-400"
          )}
          style={{ width: `${normalized}%` }}
        />
      </div>
      <span dir="ltr" className={cn("text-[10px] font-semibold tabular-nums-fa w-6 text-right", normalized > 70 ? "text-emerald-500" : normalized > 40 ? "text-amber-500" : "text-rose-500")}>
        {normalized}
      </span>
    </div>
  );
}

function SignalCard({ sig, onAddToPortfolio }: { sig: CompleteSignal; onAddToPortfolio: (s: CompleteSignal) => void }) {
  const [expanded, setExpanded] = useState(false);

  const radarData = useMemo(() => [
    { name: "تکنیکال", value: sig.confidence, fullMark: 100 },
    { name: "پول هوشمند", value: sig.confidence, fullMark: 100 },
    { name: "بنیادی", value: sig.confidence, fullMark: 100 },
  ], [sig.confidence]);

  const getStatusBadge = () => {
    switch (sig.status) {
      case 'triggered':
        return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 ml-1" />فعال‌شده</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><CheckCircle2 className="w-3 h-3 ml-1" />کامل</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-500/20 text-rose-600 border-rose-500/30"><XCircle className="w-3 h-3 ml-1" />لغو</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 ml-1" />فعال</Badge>;
    }
  };

  const getTypeBadge = () => {
    if (sig.type === 'BUY') {
      return <Badge className="bg-emerald-500 text-white border-emerald-600"><TrendingUp className="w-3 h-3 ml-1" />خرید</Badge>;
    } else if (sig.type === 'SELL') {
      return <Badge className="bg-rose-500 text-white border-rose-600"><TrendingDown className="w-3 h-3 ml-1" />فروش</Badge>;
    }
    return <Badge className="bg-gray-500 text-white border-gray-600"><Minus className="w-3 h-3 ml-1" />انتظار</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer",
        sig.type === 'BUY' ? "border-emerald-500/30" : sig.type === 'SELL' ? "border-rose-500/30" : "border-muted"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
            sig.type === 'BUY' ? "bg-emerald-500/20 text-emerald-600" : sig.type === 'SELL' ? "bg-rose-500/20 text-rose-600" : "bg-gray-500/20 text-gray-600"
          )}>
            {sig.symbol.substring(0, 2)}
          </div>
          <div>
            <h3 className="font-bold text-base">{sig.symbol}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getTypeBadge()}
              {getStatusBadge()}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">اعتماد</div>
          <div className={cn(
            "text-lg font-bold",
            sig.confidence > 70 ? "text-emerald-500" : sig.confidence > 40 ? "text-amber-500" : "text-rose-500"
          )}>
            {sig.confidence}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <div className="text-[10px] text-muted-foreground mb-1">ورود</div>
          <div className="text-xs font-bold">{faNumber(sig.entryPrice)}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-rose-500/10">
          <div className="text-[10px] text-rose-600 mb-1">حد ضرر</div>
          <div className="text-xs font-bold text-rose-600">{faNumber(sig.stopLoss)}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-emerald-500/10">
          <div className="text-[10px] text-emerald-600 mb-1">هدف ۱</div>
          <div className="text-xs font-bold text-emerald-600">{faNumber(sig.takeProfit1)}</div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <ScoreBar label="تکنیکال" score={sig.confidence} icon="📊" />
        <ScoreBar label="پول هوشمند" score={sig.confidence} icon="💰" />
        <ScoreBar label="بنیادی" score={sig.confidence} icon="📈" />
      </div>

      {sig.riskRewardRatio > 0 && (
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-muted-foreground">ریسک به ریوارد:</span>
          <span className={cn("font-bold", sig.riskRewardRatio >= 2 ? "text-emerald-500" : sig.riskRewardRatio >= 1.5 ? "text-amber-500" : "text-rose-500")}>
            1:{sig.riskRewardRatio.toFixed(2)}
          </span>
        </div>
      )}

      {sig.positionSize > 0 && (
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-muted-foreground">حجم پیشنهادی:</span>
          <span className="font-bold text-blue-500">{sig.positionSize}% از سبد</span>
        </div>
      )}

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t pt-3 mt-3 space-y-3"
        >
          <div>
            <h4 className="text-xs font-bold mb-2 text-emerald-600">🔍 دلایل تکنیکال:</h4>
            <ul className="text-[11px] space-y-1 text-muted-foreground pr-4">
              {sig.technicalReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold mb-2 text-blue-600">💰 دلایل پول هوشمند:</h4>
            <ul className="text-[11px] space-y-1 text-muted-foreground pr-4">
              {sig.smartMoneyReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold mb-2 text-amber-600">📊 دلایل بنیادی:</h4>
            <ul className="text-[11px] space-y-1 text-muted-foreground pr-4">
              {sig.fundamentalReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                onAddToPortfolio(sig);
              }}
            >
              <TrendingUp className="w-3 h-3 ml-1" />
              افزودن به پرتفوی
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function SignalsTab({ signals, onAddToPortfolio }: SignalsTabProps) {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSignals = useMemo(() => {
    return signals.filter(sig => {
      const matchesFilter = filter === 'all' || sig.type.toLowerCase() === filter;
      const matchesSearch = sig.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [signals, filter, searchTerm]);

  const buySignals = signals.filter(s => s.type === 'BUY').length;
  const sellSignals = signals.filter(s => s.type === 'SELL').length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">سیگنال‌های هوشمند</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
            <TrendingUp className="w-3 h-3 ml-1" />
            خرید: {faNumber(buySignals)}
          </Badge>
          <Badge variant="outline" className="text-rose-600 border-rose-500/30">
            <TrendingDown className="w-3 h-3 ml-1" />
            فروش: {faNumber(sellSignals)}
          </Badge>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="جستجوی نماد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          همه
        </Button>
        <Button
          variant={filter === 'buy' ? 'default' : 'outline'}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setFilter('buy')}
        >
          خرید
        </Button>
        <Button
          variant={filter === 'sell' ? 'default' : 'outline'}
          size="sm"
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => setFilter('sell')}
        >
          فروش
        </Button>
      </div>

      {filteredSignals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>هیچ سیگنالی یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((sig, index) => (
            <SignalCard 
              key={sig.id || index} 
              sig={sig} 
              onAddToPortfolio={onAddToPortfolio}
            />
          ))}
        </div>
      )}
    </div>
  );
}
