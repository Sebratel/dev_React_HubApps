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
import { AnnouncementsPage } from '@/features/announcements/AnnouncementsPage'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { UsersManagementPage } from '@/features/admin/users/UsersManagementPage'
import { AccessRequestsManagementPage } from '@/features/admin/access-requests/AccessRequestsManagementPage'
import { AppsManagementPage } from '@/features/admin/apps/AppsManagementPage'
import { AdminAnnouncementsPage } from '@/features/admin/announcements/AdminAnnouncementsPage'
import { AdminTeamsPage } from '@/features/admin/teams/AdminTeamsPage'
import { AdminSuggestionsPage } from '@/features/admin/suggestions/AdminSuggestionsPage'
import { AuditLogsManagementPage } from '@/features/admin/audit-logs/AuditLogsManagementPage'
import { SuggestionsPage } from '@/features/suggestions/SuggestionsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { MyRequestsPage } from '@/features/my-requests/MyRequestsPage'

export const router = createBrowserRouter(
  [
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
        {
          path: '/pending-approval',
          element: <PendingApprovalPage />,
        },
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
                {
                  path: '/avisos',
                  element: <AnnouncementsPage />,
                },
                {
                  path: '/sugestoes',
                  element: <SuggestionsPage />,
                },
                {
                  path: '/perfil',
                  element: <ProfilePage />,
                },
                {
                  path: '/minhas-solicitacoes',
                  element: <MyRequestsPage />,
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
                      path: '/admin/teams',
                      element: <AdminTeamsPage />,
                    },
                    {
                      path: '/admin/announcements',
                      element: <AdminAnnouncementsPage />,
                    },
                    {
                      path: '/admin/suggestions',
                      element: <AdminSuggestionsPage />,
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
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
)
