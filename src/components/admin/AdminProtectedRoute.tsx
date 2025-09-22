import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { adminUser, loading } = useAdminAuth();
  const location = useLocation();

  console.log('AdminProtectedRoute: Current state', { 
    adminUser: !!adminUser, 
    loading, 
    pathname: location.pathname 
  });

  if (loading) {
    console.log('AdminProtectedRoute: Loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-premium">
        <div className="space-y-4 w-full max-w-md mx-auto p-6">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!adminUser) {
    console.log('AdminProtectedRoute: No admin user, redirecting to admin login');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  console.log('AdminProtectedRoute: Admin authenticated, rendering children');
  return <>{children}</>;
};