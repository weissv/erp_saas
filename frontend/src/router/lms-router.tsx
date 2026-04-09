import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LmsLayout from "../layouts/LmsLayout";
import LoginPage from "../pages/LoginPage";
import AuthLayout from "../layouts/AuthLayout";

// LMS Pages - School (Primary)
import LmsSchoolDashboard from "../pages/lms/LmsSchoolDashboard";
import LmsClassesPage from "../pages/lms/LmsClassesPage";
import LmsGradebookPage from "../pages/lms/LmsGradebookPage";
import LmsSchedulePage from "../pages/lms/LmsSchedulePage";
import LmsAssignmentsPage from "../pages/lms/LmsAssignmentsPage";
import LmsProgressPage from "../pages/lms/LmsProgressPage";
import LmsDiaryPage from "../pages/lms/LmsDiaryPage";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--mezon-accent)] mx-auto mb-4"></div>
        <span className="text-sm text-gray-500">Загрузка LMS...</span>
      </div>
    </div>
  );
}

function PrivateRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  return <Outlet />;
}

export default function LmsRouter() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginPage />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route path="/" element={<LmsLayout />}>
          {/* Redirect root to School Dashboard */}
          <Route index element={<Navigate to="school" replace />} />
          
          {/* Main School Routes */}
          <Route path="school" element={<LmsSchoolDashboard />} />
          <Route path="school/classes" element={<LmsClassesPage />} />
          <Route path="school/classes/:classId" element={<LmsClassesPage />} />
          <Route path="school/gradebook" element={<LmsGradebookPage />} />
          <Route path="school/schedule" element={<LmsSchedulePage />} />
          <Route path="school/homework" element={<LmsAssignmentsPage />} />
          <Route path="school/attendance" element={<LmsProgressPage />} />
          
          {/* Diary for Students/Parents */}
          <Route path="diary" element={<LmsDiaryPage />} />

          {/* Legacy alias mapping */}
          <Route path="dashboard" element={<Navigate to="school" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/lms/school" replace />} />
    </Routes>
  );
}