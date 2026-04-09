// src/components/dashboard/widgets/AttendanceTodayWidget.tsx
import { Calendar, Users } from 'lucide-react';

interface AttendanceData {
  childrenPresent: number;
  childrenOnMeals: number;
  employeeAttendance: Record<string, number>;
  date: string;
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'На месте',
  SICK_LEAVE: 'Больничный',
  VACATION: 'Отпуск',
  ABSENT: 'Отсутствует',
};

export default function AttendanceTodayWidget({ data }: { data: AttendanceData | undefined }) {
  if (!data) return null;

  const employeeAttendance = data.employeeAttendance ?? {};

  return (
    <div className="bento-attendance">
      <div className="bento-attendance__big-stat">
        <span className="bento-attendance__big-num">{data.childrenPresent ?? 0}</span>
        <span className="bento-attendance__big-label">детей присутствует</span>
      </div>

      <div className="bento-attendance__sub">
        <Calendar className="h-3.5 w-3.5 opacity-70 flex-shrink-0" />
        <span>{data.childrenOnMeals} на питании</span>
      </div>

      {Object.keys(employeeAttendance).length > 0 && (
        <div className="bento-attendance__chips">
          {Object.entries(employeeAttendance).map(([status, count]) => (
            <span key={status} className="bento-chip">
              <Users className="h-3 w-3" />
              {STATUS_LABELS[status] || status}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
