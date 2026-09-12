import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useAlertStore, type PriceAlert, type AlertType } from '../store/alertStore';
import { Bell, TrendingUp, TrendingDown, Activity, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface AlertNotificationProps {
  alert: PriceAlert;
  onDismiss: () => void;
}

const getAlertIcon = (type: AlertType) => {
  switch (type) {
    case 'price_above':
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case 'price_below':
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case 'volume_spike':
      return <Activity className="h-5 w-5 text-blue-500" />;
    case 'smart_money':
      return <Bell className="h-5 w-5 text-purple-500" />;
    case 'fundamental_change':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const getAlertMessage = (alert: PriceAlert): string => {
  const messages: Record<AlertType, string> = {
    price_above: `قیمت ${alert.symbol} به ${alert.threshold.toLocaleString()} رسید`,
    price_below: `قیمت ${alert.symbol} به ${alert.threshold.toLocaleString()} کاهش یافت`,
    volume_spike: `حجم معاملات ${alert.symbol} افزایش غیرعادی داشت`,
    smart_money: `ورود پول هوشمند به ${alert.symbol}`,
    fundamental_change: `تغییر در شاخص‌های بنیادی ${alert.symbol}`,
  };
  return alert.message || messages[alert.type];
};

const AlertNotification: React.FC<AlertNotificationProps> = ({ alert, onDismiss }) => {
  return (
    <Card className="p-4 mb-3 bg-white dark:bg-gray-800 shadow-lg border-l-4 border-l-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getAlertIcon(alert.type)}
          <div>
            <p className="font-semibold text-sm">{alert.symbol}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {getAlertMessage(alert)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(alert.triggeredAt!).toLocaleString('fa-IR')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export interface AlertPanelProps {
  onCreateAlert?: () => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ onCreateAlert }) => {
  const { alerts, removeAlert, clearTriggeredAlerts, getActiveAlerts } = useAlertStore();
  const activeAlerts = getActiveAlerts();
  const triggeredAlerts = alerts.filter((a) => !a.isActive);

  const handleDismiss = (id: string) => {
    removeAlert(id);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          هشدارها و نوتیفیکیشن‌ها
        </h3>
        <div className="flex gap-2">
          {onCreateAlert && (
            <Button size="sm" onClick={onCreateAlert}>
              ایجاد هشدار جدید
            </Button>
          )}
          {triggeredAlerts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearTriggeredAlerts}
            >
              پاک کردن ({triggeredAlerts.length})
            </Button>
          )}
        </div>
      </div>

      {/* نوتیفیکیشن‌های جدید */}
      {triggeredAlerts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-blue-600">
            هشدارهای فعال شده ({triggeredAlerts.length})
          </h4>
          {triggeredAlerts.slice(0, 5).map((alert) => (
            <AlertNotification
              key={alert.id}
              alert={alert}
              onDismiss={() => handleDismiss(alert.id)}
            />
          ))}
        </div>
      )}

      {/* لیست هشدارهای فعال */}
      <div>
        <h4 className="text-sm font-semibold mb-2">هشدارهای فعال ({activeAlerts.length})</h4>
        {activeAlerts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            هیچ هشداری تعریف نشده است
          </p>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{alert.symbol}</Badge>
                      <span className="text-sm font-medium">
                        {alert.type === 'price_above' && 'بالاتر از'}
                        {alert.type === 'price_below' && 'پایین‌تر از'}
                        {alert.type === 'volume_spike' && 'حجم غیرعادی'}
                        {alert.type === 'smart_money' && 'پول هوشمند'}
                        {alert.type === 'fundamental_change' && 'تغییر بنیادی'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      آستانه: {alert.threshold.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(alert.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// کامپوننت برای نمایش نوتیفیکیشن‌های Toast
export const AlertToaster: React.FC = () => {
  const { triggerAlert } = useAlertStore();

  // این تابع می‌تواند برای ارسال نوتیفیکیشن استفاده شود
  React.useEffect(() => {
    const interval = setInterval(() => {
      // بررسی دوره‌ای آلرت‌ها - در واقعیت باید از داده‌های لحظه‌ای استفاده شود
      // این فقط یک نمونه است
    }, 30000); // هر 30 ثانیه

    return () => clearInterval(interval);
  }, []);

  return (
    <Toaster
      position="top-left"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#fff',
          color: '#363636',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
};

export const showAlertNotification = (alert: PriceAlert) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{alert.symbol}</p>
              <p className="mt-1 text-sm text-gray-500">{getAlertMessage(alert)}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
          >
            بستن
          </button>
        </div>
      </div>
    ),
    { duration: 10000 }
  );
};
