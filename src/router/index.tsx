import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ActiveRoute } from './ActiveRoute'
import { AdminRoute } from './AdminRoute'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { SplashScreen } from '@/features/auth/SplashScreen'
import { LoginPage } from '@/features/auth/LoginPage'
import { PendingApprovalPage } from '@/features/auth/PendingApprovalPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { UsersManagementPage } from '@/features/admin/users/UsersManagementPage'
import { AccessRequestsManagementPage } from '@/features/admin/access-requests/AccessRequestsManagementPage'
import { AppsManagementPage } from '@/features/admin/apps/AppsManagementPage'
import { AuditLogsManagementPage } from '@/features/admin/audit-logs/AuditLogsManagementPage'

// Route hierarchy:
// ProtectedRoute (auth) → PendingApprovalPage (authenticated but possibly inactive)
//                       → ActiveRoute (isActive check) → all real app routes
//
// This ensures:
//   - Unauthenticated → /login
//   - Authenticated + inactive → /pending-approval (only accessible here)
//   - Authenticated + active → / or /admin (based on role)
export const router = createBrowserRouter([
  {
    path: '/splash',
    element: <SplashScreen />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      // Accessible to authenticated users regardless of isActive
      {
        path: '/pending-approval',
        element: <PendingApprovalPage />,
      },
      // All routes below require isActive === true
      {
        element: <ActiveRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              {
                path: '/',
                element: <DashboardPage />,
              },
            ],
          },
          {
            element: <AdminRoute />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    path: '/admin',
                    element: <AdminDashboard />,
                  },
                  {
                    path: '/admin/users',
                    element: <UsersManagementPage />,
                  },
                  {
                    path: '/admin/access-requests',
                    element: <AccessRequestsManagementPage />,
                  },
                  {
                    path: '/admin/apps',
                    element: <AppsManagementPage />,
                  },
                  {
                    path: '/admin/audit-logs',
                    element: <AuditLogsManagementPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
