export type Club = {
  id: number;
  name: string;
  description?: string | null;
  teacherId: number;
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  };
  schedule?: any;
  cost?: number;
  maxStudents?: number;
};

export type ClubEnrollment = {
  id: number;
  childId: number;
  clubId: number;
  status: 'ACTIVE' | 'WAITING_LIST' | 'CANCELLED';
  enrolledAt: string;
  child?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  club?: Club;
};
