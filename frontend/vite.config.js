import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

function manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
    if (id.includes('react-router')) return 'vendor-router'
    if (id.includes('@radix-ui') || id.includes('/cmdk/')) return 'vendor-ui'
    if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts'
    if (id.includes('/react-grid-layout/') || id.includes('/framer-motion/')) return 'vendor-layout'
    if (id.includes('/react-hook-form/') || id.includes('/zod/') || id.includes('@hookform/resolvers')) return 'vendor-forms'
    if (id.includes('/i18next') || id.includes('/react-i18next/')) return 'vendor-i18n'
    if (id.includes('/lucide-react/')) return 'vendor-icons'
    if (id.includes('/papaparse/') || id.includes('/html2canvas/') || id.includes('/react-markdown/')) return 'vendor-rich-content'
    return 'vendor-misc'
  }

  if (id.includes('/src/pages/lms/') || id.includes('/src/hooks/lms/')) return 'feature-lms'
  if (id.includes('/src/pages/Finance') || id.includes('/src/features/onec/')) return 'feature-finance'
  if (id.includes('/src/pages/KnowledgeBase/')) return 'feature-knowledge-base'
  if (id.includes('/src/pages/Exam') || id.includes('/src/pages/ExamsPage')) return 'feature-exams'
  if (id.includes('/src/pages/Ai') || id.includes('/src/features/ai/')) return 'feature-ai'
  if (id.includes('/src/components/dashboard/') || id.includes('/src/hooks/useDashboard') || id.includes('/src/pages/DashboardPage')) {
    return 'feature-dashboard'
  }
  if (
    id.includes('/src/pages/ChildrenPage') ||
    id.includes('/src/pages/ChildDetailPage') ||
    id.includes('/src/pages/EmployeesPage') ||
    id.includes('/src/pages/GroupsPage') ||
    id.includes('/src/pages/StaffingPage') ||
    id.includes('/src/pages/UsersPage')
  ) {
    return 'feature-people'
  }
  if (
    id.includes('/src/pages/AttendancePage') ||
    id.includes('/src/pages/CalendarPage') ||
    id.includes('/src/pages/ClubsPage') ||
    id.includes('/src/pages/DocumentsPage') ||
    id.includes('/src/pages/FeedbackPage') ||
    id.includes('/src/pages/InventoryPage') ||
    id.includes('/src/pages/MaintenancePage') ||
    id.includes('/src/pages/MenuPage') ||
    id.includes('/src/pages/NotificationsPage') ||
    id.includes('/src/pages/ProcurementPage') ||
    id.includes('/src/pages/RecipesPage') ||
    id.includes('/src/pages/SchedulePage') ||
    id.includes('/src/pages/SecurityPage') ||
    id.includes('/src/pages/ActionLogPage') ||
    id.includes('/src/pages/IntegrationPage') ||
    id.includes('/src/pages/OneCDataPage')
  ) {
    return 'feature-operations'
  }
}

// https://vitejs.dev/config/
// LMS теперь интегрирован в основное ERP приложение
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lms: resolve(__dirname, 'lms.html'),
      },
      output: {
        manualChunks,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
