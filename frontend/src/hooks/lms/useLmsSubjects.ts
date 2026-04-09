import { useCallback, useEffect, useState } from "react";
import { lmsApi } from "../../lib/lms-api";
import type { LmsSubject } from "../../types/lms";

export function useLmsSubjects() {
  const [subjects, setSubjects] = useState<LmsSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lmsApi.getSubjects();
      setSubjects(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return { subjects, loading, error, refetch: fetchSubjects };
}
