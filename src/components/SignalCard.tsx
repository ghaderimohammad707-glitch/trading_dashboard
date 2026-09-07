/**
 * کامپوننت نمایش سیگنال‌های تحلیل بازار
 * یکپارچه‌سازی با ماژول‌های گزارش‌دهی (فاز ۴)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { interpretSignal, SignalReasonOutput } from '@/lib/reporting/signalReason';
import { calculatePositionSize, PositionSizingInput } from '@/lib/reporting/positionSizer';
import { CompositeSignal } from '@/lib/analysisEngines';
import { Download, FileText, Calculator, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SignalCardProps {
  signal: CompositeSignal;
  totalCapital?: number;
  riskPerTrade?: number;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  totalCapital = 100000000, // ۱۰۰ میلیون تومان پیش‌فرض
  riskPerTrade = 2, // ۲٪ ریسک پیش‌فرض
  onExportExcel,
  onExportPDF,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // تولید تفسیر سیگنال
  const signalReason: SignalReasonOutput = interpretSignal(signal);

  // محاسبه مدیریت سرمایه
  const positionInput: PositionSizingInput = {
    totalCapital,
    riskPerTrade: riskPerTrade / 100, // تبدیل درصد به اعشار
    entryPrice: signal.entryPrice || signal.currentPrice || 0,
    stopLoss: signal.stopLoss || (signal.currentPrice || 0) * 0.95,
    positionType: signal.action === 'buy' ? 'long' : 'short',
  };

  const positionSize = calculatePositionSize(positionInput);

  const getSignalColor = (action: string) => {
    switch (action) {
      case 'buy': return 'bg-green-500 hover:bg-green-600';
      case 'sell': return 'bg-red-500 hover:bg-red-600';
      case 'hold': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getSignalLabel = (action: string) => {
    switch (action) {
      case 'buy': return 'خرید';
      case 'sell': return 'فروش';
      case 'hold': return 'نگهداری';
      default: return action;
    }
  };

  const currentPrice = signal.currentPrice || signal.entryPrice || 0;
  const takeProfit = signal.targetPrice || 0;

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold">
              {signal.symbol}
            </CardTitle>
            <Badge className={getSignalColor(signal.action)}>
              {getSignalLabel(signal.action)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="w-4 h-4 mr-2" />
                  جزئیات
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>تحلیل کامل {signal.symbol}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-6">
                  {/* بخش تفسیر سیگنال */}
                  <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      تفسیر سیگنال
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm leading-relaxed">
                        {signalReason.description}
                      </p>
                    </div>
                    
                    {signalReason.technicalReasons.length > 0 && (
                      <div className="mt-3">
                        <h4 className="font-medium text-sm mb-1">دلایل تکنیکال:</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {signalReason.technicalReasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {signalReason.tableauReasons.length > 0 && (
                      <div className="mt-3">
                        <h4 className="font-medium text-sm mb-1">دلایل تابلوخوانی:</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {signalReason.tableauReasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={signalReason.confidenceLevel === 'قوی' || signalReason.confidenceLevel === 'خیلی قوی' ? 'default' : 'secondary'}>
                        سطح اطمینان: {signalReason.confidenceLevel}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({signalReason.confidenceScore}٪)
                      </span>
                    </div>
                  </section>

                  {/* بخش مدیریت سرمایه */}
                  <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      مدیریت سرمایه
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>پارامتر</TableHead>
                          <TableHead className="text-left">مقدار</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>سرمایه کل</TableCell>
                          <TableCell className="text-left font-mono">
                            {totalCapital.toLocaleString()} تومان
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>ریسک مجاز</TableCell>
                          <TableCell className="text-left font-mono">
                            {riskPerTrade}٪
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>تعداد سهم پیشنهادی</TableCell>
                          <TableCell className="text-left font-mono text-green-600 font-bold">
                            {positionSize.shareCount.toLocaleString()} واحد
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>حجم پوزیشن</TableCell>
                          <TableCell className="text-left font-mono">
                            {positionSize.positionValue.toLocaleString()} تومان
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>ریسک معامله</TableCell>
                          <TableCell className="text-left font-mono text-red-600">
                            {positionSize.riskAmount.toLocaleString()} تومان
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    {!positionSize.isValid && positionSize.errorMessage && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ {positionSize.errorMessage}
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              </DialogContent>
            </Dialog>
            
            {onExportPDF && (
              <Button variant="outline" size="sm" onClick={onExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            )}
            
            {onExportExcel && (
              <Button variant="outline" size="sm" onClick={onExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                اکسل
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">قیمت فعلی</p>
              <p className="text-lg font-bold font-mono">
                {currentPrice.toLocaleString()}
              </p>
            </div>
            
            {signal.stopLoss && (
              <div>
                <p className="text-sm text-muted-foreground">حد ضرر</p>
                <p className="text-lg font-bold font-mono text-red-600">
                  {signal.stopLoss.toLocaleString()}
                </p>
              </div>
            )}
            
            {takeProfit > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">حد سود</p>
                <p className="text-lg font-bold font-mono text-green-600">
                  {takeProfit.toLocaleString()}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground">امتیاز اطمینان</p>
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      (signal.confidence || 0) >= 75 ? 'bg-green-600' :
                      (signal.confidence || 0) >= 50 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${signal.confidence || 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{signal.confidence || 0}٪</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {signalReason.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default SignalCard;
