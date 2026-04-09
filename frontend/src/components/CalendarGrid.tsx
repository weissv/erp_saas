import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Event } from '../types/calendar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarGridProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** ISO week order: Mon … Sat … Sun */
const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Cycling palette — macOS system colours.
 *  `bg`  : translucent tint for the pill background
 *  `text`: full-opacity accent used for text and the dot indicator
 *  `dot` : slightly darkened shade for the dot, ensuring visible contrast
 *          even when the dot sits on the tinted `bg`. */
const EVENT_COLORS = [
  { bg: 'rgba(0, 122, 255, 0.10)',  text: '#007AFF', dot: '#005EC4' },
  { bg: 'rgba(52, 199, 89, 0.12)',  text: '#1E8430', dot: '#166424' },
  { bg: 'rgba(175, 82, 222, 0.10)', text: '#8944AB', dot: '#6B2F8B' },
  { bg: 'rgba(255, 149, 0, 0.12)',  text: '#BE6100', dot: '#9E4F00' },
  { bg: 'rgba(90, 200, 250, 0.14)', text: '#0071A4', dot: '#00567C' },
  { bg: 'rgba(255, 45, 85, 0.10)',  text: '#C0143C', dot: '#960F2F' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday = 0, Sunday = 6 */
function firstWeekdayOf(year: number, month: number): number {
  const dow = new Date(year, month, 1).getDay();
  return dow === 0 ? 6 : dow - 1;
}

function eventColor(id: number) {
  return EVENT_COLORS[id % EVENT_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CalendarGrid: React.FC<CalendarGridProps> = ({ events, onEdit, onDelete }) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  /** Overflow popover: which day's extra events to show */
  const [overflowDay, setOverflowDay] = useState<{ day: number; evts: Event[] } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /* Close popover on outside click */
  useEffect(() => {
    if (!overflowDay) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOverflowDay(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowDay]);

  const now = new Date();
  const nowYear  = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay   = now.getDate();

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();
  const count = daysInMonth(year, month);
  const offset = firstWeekdayOf(year, month);

  const goToday  = () => setCursor(new Date(nowYear, nowMonth, 1));
  const goPrev   = () => setCursor(new Date(year, month - 1, 1));
  const goNext   = () => setCursor(new Date(year, month + 1, 1));
  const isToday  = (d: number) => year === nowYear && month === nowMonth && d === nowDay;

  /** Build a flat array of cells: `null` for padding, number for real days */
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: number) =>
    events.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  return (
    <div className="mezon-card overflow-hidden" style={{ padding: 0 }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '0.5px solid var(--separator)' }}
      >
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            aria-label="Предыдущий месяц"
            className="flex items-center justify-center w-8 h-8 rounded-lg macos-transition hover:bg-fill-quaternary active:bg-fill-tertiary"
          >
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>

          <h2
            className="text-[17px] font-semibold tracking-tight select-none"
            style={{ minWidth: 176, textAlign: 'center', color: 'var(--text-primary)' }}
          >
            {MONTH_NAMES[month]}{' '}
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{year}</span>
          </h2>

          <button
            onClick={goNext}
            aria-label="Следующий месяц"
            className="flex items-center justify-center w-8 h-8 rounded-lg macos-transition hover:bg-fill-quaternary active:bg-fill-tertiary"
          >
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-[13px] font-medium rounded-lg border macos-transition hover:bg-fill-quaternary active:bg-fill-tertiary"
          style={{
            color: 'var(--color-blue)',
            borderColor: 'rgba(0, 122, 255, 0.35)',
          }}
        >
          Сегодня
        </button>
      </div>

      {/* ── Day-of-week labels ─────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-7"
        style={{ borderBottom: '0.5px solid var(--separator)' }}
      >
        {DAY_NAMES_SHORT.map((name, i) => (
          <div
            key={name}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-widest select-none"
            style={{ color: i >= 5 ? 'var(--color-red)' : 'var(--text-tertiary)' }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const col       = idx % 7;
          const isLastRow = idx >= cells.length - 7;
          const isLastCol = col === 6;
          const weekend   = col >= 5;
          const dayEvts   = day ? eventsForDay(day) : [];
          const today     = day ? isToday(day) : false;
          const hiddenEvts = dayEvts.slice(3);

          return (
            <div
              key={idx}
              className="min-h-[104px] p-2 relative"
              style={{
                borderRight:  isLastCol ? 'none' : '0.5px solid var(--separator)',
                borderBottom: isLastRow ? 'none' : '0.5px solid var(--separator)',
                background: !day
                  ? 'var(--bg-inset)'
                  : weekend
                  ? 'rgba(120,120,128,0.025)'
                  : 'var(--surface-primary)',
              }}
            >
              {day !== null && (
                <>
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] select-none"
                      style={
                        today
                          ? { background: 'var(--color-blue)', color: '#FFFFFF', fontWeight: 600 }
                          : {
                              color: weekend ? 'var(--color-red)' : 'var(--text-primary)',
                              fontWeight: 400,
                            }
                      }
                    >
                      {day}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div className="flex flex-col gap-0.5">
                    {dayEvts.slice(0, 3).map((evt) => {
                      const c = eventColor(evt.id);
                      return (
                        <div
                          key={evt.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onEdit(evt)}
                          onKeyDown={(e) => e.key === 'Enter' && onEdit(evt)}
                          className="group/pill flex items-center gap-1 rounded px-1.5 py-0.5 cursor-pointer macos-transition hover:brightness-95"
                          style={{ background: c.bg }}
                          title={evt.title}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: c.dot }}
                          />
                          <span
                            className="flex-1 text-[11px] font-medium truncate leading-tight"
                            style={{ color: c.text }}
                          >
                            {evt.title}
                          </span>
                          <button
                            type="button"
                            aria-label="Удалить событие"
                            onClick={(e) => { e.stopPropagation(); onDelete(evt); }}
                            className="opacity-0 group-hover/pill:opacity-100 p-0.5 rounded macos-transition hover:bg-[rgba(255,59,48,0.15)]"
                          >
                            <Trash2
                              className="w-2.5 h-2.5"
                              style={{ color: 'var(--color-red)' }}
                            />
                          </button>
                        </div>
                      );
                    })}

                    {/* Overflow indicator — interactive */}
                    {hiddenEvts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOverflowDay({ day, evts: dayEvts })}
                        className="text-left text-[10px] font-semibold px-1.5 mt-0.5 macos-transition rounded hover:underline"
                        style={{ color: 'var(--color-blue)' }}
                        title={hiddenEvts.map((e) => e.title).join(', ')}
                      >
                        +{hiddenEvts.length} ещё
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Overflow day-events popover ────────────────────────────────────── */}
      {overflowDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <div
            ref={popoverRef}
            className="mezon-card w-80 max-h-[70vh] flex flex-col"
            style={{ boxShadow: 'var(--shadow-floating)' }}
          >
            {/* Popover header */}
            <div
              className="flex items-center justify-between pb-3 mb-3"
              style={{ borderBottom: '0.5px solid var(--separator)' }}
            >
              <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {overflowDay.day} {MONTH_NAMES[month]}
              </p>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOverflowDay(null)}
                className="flex items-center justify-center w-7 h-7 rounded-lg macos-transition hover:bg-fill-quaternary"
              >
                <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Event list */}
            <div className="overflow-y-auto flex flex-col gap-1.5">
              {overflowDay.evts.map((evt) => {
                const c = eventColor(evt.id);
                return (
                  <div
                    key={evt.id}
                    className="group/popitem flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer macos-transition hover:bg-fill-quaternary"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setOverflowDay(null); onEdit(evt); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { setOverflowDay(null); onEdit(evt); }
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: c.dot }}
                    />
                    <span
                      className="flex-1 text-[13px] font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {evt.title}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(evt.date).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      type="button"
                      aria-label="Удалить событие"
                      onClick={(e) => { e.stopPropagation(); setOverflowDay(null); onDelete(evt); }}
                      className="opacity-0 group-hover/popitem:opacity-100 p-0.5 rounded macos-transition hover:bg-[rgba(255,59,48,0.15)]"
                    >
                      <Trash2 className="w-3 h-3" style={{ color: 'var(--color-red)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
