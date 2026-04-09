import { useCallback, useEffect, useState } from "react";
import { lmsApi } from "../../lib/lms-api";
import type { GradebookData } from "../../types/lms";

export function useLmsGradebook(classId: number | null, subjectId: string | null) {
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchGradebook = useCallback(async () => {
    if (!classId || !subjectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lmsApi.getGradebook(classId, subjectId);
      setGradebook(data);
    } catch (err) {
      setError(err);
      setGradebook({
        students: [],
        dates: [],
        classId,
        subjectId,
      });
    } finally {
      setLoading(false);
    }
  }, [classId, subjectId]);

  useEffect(() => {
    fetchGradebook();
  }, [fetchGradebook]);

  return { gradebook, loading, error, refetch: fetchGradebook };
}
