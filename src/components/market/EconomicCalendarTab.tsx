import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertCircle } from "lucide-react";
import { getUpcomingEvents, EVENT_CATEGORIES, type CalendarEvent } from "@/lib/economicCalendar";

export function EconomicCalendarTab() {
  const [category, setCategory] = useState("all");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUpcomingEvents().then(setEvents).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (category === "all" ? events : events.filter((e: CalendarEvent) => e.category === category)),
    [events, category],
  );

  const importanceColor: Record<string, string> = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center p-10">
        <CalendarDays className="size-8 animate-spin text-primary" />
        <span className="mr-2 text-sm">در حال بارگذاری...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5 text-primary" />
        <h2 className="text-lg font-bold">گاهینامه اقتصادی</h2>
        <Badge variant="outline" className="text-xs">{filtered.length} رویداد</Badge>
      </div>

      {/* فیلتر دسته‌بندی */}
      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
              category === cat.id
                ? "bg-primary/10 text-primary font-medium border border-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* لیست رویدادها */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            <CalendarDays className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">رویدادی یافت نشد</p>
          </div>
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{event.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${importanceColor[event.importance]}`}>
                      {event.importance === "high" ? "مهم" : event.importance === "medium" ? "متوسط" : "کم"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                  {event.symbols && event.symbols.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {event.symbols.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <div className="text-xs text-muted-foreground">تاریخ</div>
                  <div className="text-sm font-bold tabular-nums-fa" dir="ltr">{event.date}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
