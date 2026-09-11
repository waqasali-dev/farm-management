import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { RefreshCw } from 'lucide-react';

export const AdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 font-mono">
        <RefreshCw className="w-6 h-6 animate-spin text-black mb-3" />
        <span className="text-xs uppercase tracking-wider font-bold text-black">
          Verifying Root Admin Authority...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
