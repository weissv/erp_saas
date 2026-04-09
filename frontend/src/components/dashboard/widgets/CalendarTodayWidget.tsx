// src/components/dashboard/widgets/CalendarTodayWidget.tsx
import { Clock, User } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  organizer?: string;
  type: string;
}

interface CalendarTodayData {
  date: string;
  events: CalendarEvent[];
}

const TYPE_STRIPE: Record<string, string> = {
  lesson:   '#3B82F6',
  meeting:  '#8B5CF6',
  event:    '#10B981',
  holiday:  '#EF4444',
  deadline: '#F59E0B',
};

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function CalendarTodayWidget({ data }: { data: CalendarTodayData | undefined }) {
  if (!data) return null;

  const events = data.events ?? [];

  return (
    <div className="bento-calendar">
      {events.length === 0 && (
        <p className="text-xs text-tertiary text-center py-4">Нет событий на сегодня</p>
      )}

      {events.map(ev => (
        <div key={ev.id} className="bento-calendar-event">
          <div
            className="bento-calendar-event__stripe"
            style={{ background: TYPE_STRIPE[ev.type] ?? '#94A3B8' }}
          />
          <div className="bento-calendar-event__body">
            <p className="bento-calendar-event__title">{ev.title}</p>
            <div className="bento-calendar-event__meta">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeFmt(ev.startTime)}
              </span>
              {ev.organizer && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ev.organizer}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
