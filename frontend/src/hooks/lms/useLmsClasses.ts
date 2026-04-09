import { useCallback, useEffect, useState } from "react";
import { lmsApi } from "../../lib/lms-api";
import type { LmsSchoolClass } from "../../types/lms";

export type UseLmsClassesOptions = {
  academicYear?: string;
  grade?: number;
  isActive?: boolean;
};

export function useLmsClasses(options?: UseLmsClassesOptions) {
  const [classes, setClasses] = useState<LmsSchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lmsApi.getClasses(options);
      setClasses(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [options?.academicYear, options?.grade, options?.isActive]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, error, refetch: fetchClasses };
}
