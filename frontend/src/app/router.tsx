import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { FlocksPage } from '../features/flocks/FlocksPage.js';
import { DailyRecordPage } from '../features/daily-record/DailyRecordPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { RegisterPage } from '../features/auth/RegisterPage.js';
import { AdminPage } from '../features/admin/AdminPage.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { AdminRoute } from '../components/auth/AdminRoute.js';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'flocks',
        element: <FlocksPage />,
      },
      {
        path: 'flocks/:flockId/daily',
        element: <DailyRecordPage />,
      },
      {
        path: 'flocks/:flockId/reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
