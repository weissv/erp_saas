import { useCallback, useEffect, useState } from "react";
import { lmsApi } from "../../lib/lms-api";
import type { LmsScheduleItem } from "../../types/lms";

export function useLmsSchedule(classId: number | null) {
  const [schedule, setSchedule] = useState<LmsScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchSchedule = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lmsApi.getSchedule({ classId });
      setSchedule(data);
    } catch (err) {
      setError(err);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return { schedule, loading, error, refetch: fetchSchedule };
}
