import React from 'react';
import { AdminAuthContext, useAdminAuthState } from '@/hooks/useAdminAuth';

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const auth = useAdminAuthState();

  return (
    <AdminAuthContext.Provider value={auth}>
      {children}
    </AdminAuthContext.Provider>
  );
};