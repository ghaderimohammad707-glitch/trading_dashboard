import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type AlertType = 'price_above' | 'price_below' | 'volume_spike' | 'smart_money' | 'fundamental_change';

export interface PriceAlert {
  id: string;
  symbol: string;
  type: AlertType;
  threshold: number;
  currentValue?: number;
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
  message?: string;
}

interface AlertState {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => string;
  removeAlert: (id: string) => void;
  updateAlert: (id: string, updates: Partial<PriceAlert>) => void;
  triggerAlert: (id: string) => void;
  getActiveAlerts: () => PriceAlert[];
  getAlertsBySymbol: (symbol: string) => PriceAlert[];
  clearTriggeredAlerts: () => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      
      addAlert: (alertData) => {
        const id = uuidv4();
        const newAlert: PriceAlert = {
          ...alertData,
          id,
          createdAt: Date.now(),
          isActive: true,
        };
        set((state) => ({ alerts: [...state.alerts, newAlert] }));
        return id;
      },
      
      removeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        }));
      },
      
      updateAlert: (id, updates) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, ...updates } : alert
          ),
        }));
      },
      
      triggerAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? { ...alert, isActive: false, triggeredAt: Date.now() }
              : alert
          ),
        }));
      },
      
      getActiveAlerts: () => {
        return get().alerts.filter((alert) => alert.isActive);
      },
      
      getAlertsBySymbol: (symbol) => {
        return get().alerts.filter((alert) => alert.symbol === symbol);
      },
      
      clearTriggeredAlerts: () => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.isActive),
        }));
      },
    }),
    {
      name: 'market-alerts-storage',
    }
  )
);

// سرویس بررسی آلرت‌ها
export class AlertService {
  private static checkPriceAlert(alert: PriceAlert, currentPrice: number): boolean {
    if (!alert.isActive) return false;
    
    switch (alert.type) {
      case 'price_above':
        return currentPrice >= alert.threshold;
      case 'price_below':
        return currentPrice <= alert.threshold;
      default:
        return false;
    }
  }
  
  private static checkVolumeAlert(alert: PriceAlert, currentVolume: number, avgVolume: number): boolean {
    if (!alert.isActive || alert.type !== 'volume_spike') return false;
    // threshold به عنوان ضریب میانگین حجم ذخیره شده (مثلاً 2 یعنی دو برابر میانگین)
    return currentVolume >= (avgVolume * alert.threshold);
  }
  
  static checkAllAlerts(symbol: string, price: number, volume: number, avgVolume: number): void {
    const { getAlertsBySymbol, triggerAlert } = useAlertStore.getState();
    const alerts = getAlertsBySymbol(symbol);
    
    alerts.forEach((alert) => {
      let shouldTrigger = false;
      
      if (alert.type === 'price_above' || alert.type === 'price_below') {
        shouldTrigger = this.checkPriceAlert(alert, price);
      } else if (alert.type === 'volume_spike') {
        shouldTrigger = this.checkVolumeAlert(alert, volume, avgVolume);
      }
      
      if (shouldTrigger) {
        triggerAlert(alert.id);
        // اینجا می‌توان نوتیفیکیشن ارسال کرد
        console.log(`Alert triggered for ${symbol}: ${alert.message || alert.type}`);
      }
    });
  }
}
