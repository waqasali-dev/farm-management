import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { FlocksPage } from '../features/flocks/FlocksPage.js';
import { DailyRecordPage } from '../features/daily-record/DailyRecordPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
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
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
