/**
 * تست‌های واحد برای economicCalendar
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getEventsByCategory, 
  getEventsByImportance, 
  getEventsForSymbol,
  clearEventsCache,
  EVENT_CATEGORIES,
  type CalendarEvent 
} from '../economicCalendar';

describe('economicCalendar', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      date: '1404/01/15',
      title: 'مجمع عمومی فولاد',
      category: 'meeting',
      description: 'برگزاری مجمع عمومی سالانه',
      importance: 'high',
      symbols: ['فولاد'],
      source: 'tsetmc',
    },
    {
      id: '2',
      date: '1404/01/20',
      title: 'افزایش سرمایه خودرو',
      category: 'capital_increase',
      description: 'افزایش سرمایه از محل سود انباشته',
      importance: 'high',
      symbols: ['خودرو'],
      source: 'codal',
    },
    {
      id: '3',
      date: '1404/02/01',
      title: 'گزارش فصلی فملی',
      category: 'report',
      description: 'انتشار گزارش عملکرد فصلی',
      importance: 'medium',
      symbols: ['فملی'],
      source: 'generated',
    },
    {
      id: '4',
      date: '1404/02/10',
      title: 'تعطیلات رسمی',
      category: 'holiday',
      description: 'بازار تعطیل است',
      importance: 'low',
      source: 'generated',
    },
    {
      id: '5',
      date: '1404/02/15',
      title: 'گزارش چند نمادی',
      category: 'report',
      description: 'گزارش عملکرد شرکت‌های بزرگ',
      importance: 'medium',
      symbols: ['فملی', 'فولاد', 'شپنا'],
      source: 'codal',
    },
  ];

  beforeEach(() => {
    clearEventsCache();
    vi.clearAllMocks();
  });

  describe('getEventsByCategory', () => {
    it('should return all events when category is "all"', () => {
      const result = getEventsByCategory(mockEvents, 'all');
      expect(result).toHaveLength(mockEvents.length);
    });

    it('should filter events by category meeting', () => {
      const result = getEventsByCategory(mockEvents, 'meeting');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('meeting');
      expect(result[0].id).toBe('1');
    });

    it('should filter events by category capital_increase', () => {
      const result = getEventsByCategory(mockEvents, 'capital_increase');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('capital_increase');
    });

    it('should filter events by category report', () => {
      const result = getEventsByCategory(mockEvents, 'report');
      expect(result).toHaveLength(2);
      result.forEach(e => expect(e.category).toBe('report'));
    });

    it('should return empty array for non-existent category', () => {
      const result = getEventsByCategory(mockEvents, 'ipo');
      expect(result).toHaveLength(0);
    });

    it('should handle empty events array', () => {
      const result = getEventsByCategory([], 'meeting');
      expect(result).toHaveLength(0);
    });
  });

  describe('getEventsByImportance', () => {
    it('should return all events when importance is "all"', () => {
      const result = getEventsByImportance(mockEvents, 'all');
      expect(result).toHaveLength(mockEvents.length);
    });

    it('should filter events by importance high', () => {
      const result = getEventsByImportance(mockEvents, 'high');
      expect(result).toHaveLength(2);
      result.forEach(e => expect(e.importance).toBe('high'));
    });

    it('should filter events by importance medium', () => {
      const result = getEventsByImportance(mockEvents, 'medium');
      expect(result).toHaveLength(2);
      result.forEach(e => expect(e.importance).toBe('medium'));
    });

    it('should filter events by importance low', () => {
      const result = getEventsByImportance(mockEvents, 'low');
      expect(result).toHaveLength(1);
      expect(result[0].importance).toBe('low');
    });

    it('should return empty array for non-existent importance', () => {
      const result = getEventsByImportance(mockEvents, 'critical' as any);
      expect(result).toHaveLength(0);
    });

    it('should handle empty events array', () => {
      const result = getEventsByImportance([], 'high');
      expect(result).toHaveLength(0);
    });
  });

  describe('getEventsForSymbol', () => {
    it('should return events for a specific symbol فولاد', () => {
      const result = getEventsForSymbol(mockEvents, 'فولاد');
      expect(result).toHaveLength(2);
      result.forEach(e => {
        expect(e.symbols).toContain('فولاد');
      });
    });

    it('should return events for symbol فملی', () => {
      const result = getEventsForSymbol(mockEvents, 'فملی');
      expect(result).toHaveLength(2);
    });

    it('should return single event for symbol خودرو', () => {
      const result = getEventsForSymbol(mockEvents, 'خودرو');
      expect(result).toHaveLength(1);
      expect(result[0].symbols).toContain('خودرو');
    });

    it('should return empty array for non-existent symbol', () => {
      const result = getEventsForSymbol(mockEvents, 'نماد_موجود_نیست');
      expect(result).toHaveLength(0);
    });

    it('should handle events without symbols', () => {
      const eventsWithoutSymbols: CalendarEvent[] = [
        {
          id: '6',
          date: '1404/03/01',
          title: 'تعطیلات',
          category: 'holiday',
          description: 'تست',
          importance: 'low',
        },
      ];
      
      const result = getEventsForSymbol(eventsWithoutSymbols, 'فولاد');
      expect(result).toHaveLength(0);
    });

    it('should handle empty events array', () => {
      const result = getEventsForSymbol([], 'فولاد');
      expect(result).toHaveLength(0);
    });
  });

  describe('clearEventsCache', () => {
    it('should be a function', () => {
      expect(typeof clearEventsCache).toBe('function');
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        clearEventsCache();
        clearEventsCache();
        clearEventsCache();
      }).not.toThrow();
    });
  });

  describe('EVENT_CATEGORIES constant', () => {
    it('should have all category', () => {
      const allCategory = EVENT_CATEGORIES.find((c) => c.id === 'all');
      expect(allCategory).toBeDefined();
      expect(allCategory?.label).toBe('همه');
    });

    it('should have meeting category', () => {
      const meetingCategory = EVENT_CATEGORIES.find((c) => c.id === 'meeting');
      expect(meetingCategory).toBeDefined();
      expect(meetingCategory?.icon).toBe('🏛️');
    });

    it('should have all expected categories', () => {
      const expectedIds = ['all', 'meeting', 'capital_increase', 'report', 'holiday', 'ipo', 'delisting', 'split'];
      const actualIds = EVENT_CATEGORIES.map((c) => c.id);
      expectedIds.forEach(id => {
        expect(actualIds).toContain(id);
      });
    });

    it('should have correct icons for each category', () => {
      const categoryIcons: Record<string, string> = {
        all: '📅',
        meeting: '🏛️',
        'capital_increase': '📈',
        report: '📋',
        holiday: '🎌',
        ipo: '🆕',
        delisting: '❌',
        split: '✂️',
      };

      EVENT_CATEGORIES.forEach(cat => {
        expect(cat.icon).toBe(categoryIcons[cat.id]);
      });
    });
  });

  describe('CalendarEvent interface validation', () => {
    it('should validate event structure', () => {
      const event: CalendarEvent = {
        id: 'test-1',
        date: '1404/01/15',
        title: 'Test Event',
        category: 'meeting',
        description: 'Test Description',
        importance: 'high',
      };
      
      expect(event.id).toBe('test-1');
      expect(event.date).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
      expect(event.importance).toMatch(/^(high|medium|low)$/);
    });

    it('should accept optional symbols property', () => {
      const eventWithSymbols: CalendarEvent = {
        id: 'test-2',
        date: '1404/01/20',
        title: 'Event with Symbols',
        category: 'report',
        description: 'Test',
        importance: 'medium',
        symbols: ['فولاد', 'فملی'],
      };
      
      expect(eventWithSymbols.symbols).toHaveLength(2);
    });

    it('should accept optional source property', () => {
      const eventWithSource: CalendarEvent = {
        id: 'test-3',
        date: '1404/01/25',
        title: 'Event with Source',
        category: 'ipo',
        description: 'Test',
        importance: 'high',
        source: 'tsetmc',
      };
      
      expect(eventWithSource.source).toBe('tsetmc');
    });

    it('should accept optional publishDate property', () => {
      const eventWithDate: CalendarEvent = {
        id: 'test-4',
        date: '1404/02/01',
        title: 'Event with Publish Date',
        category: 'capital_increase',
        description: 'Test',
        importance: 'high',
        publishDate: Date.now(),
      };
      
      expect(eventWithDate.publishDate).toBeGreaterThan(0);
    });
  });
});
