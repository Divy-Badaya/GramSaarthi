import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user, profileLoading } = useApp();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect unauthenticated users to /login and preserve intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = Boolean(user?.is_admin || user?.role === 'admin');

  // Prevent regular users from accessing admin routes
  if (requireAdmin && !profileLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Prevent administrators from accessing normal user routes
  if (!requireAdmin && !profileLoading && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

