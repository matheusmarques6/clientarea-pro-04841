import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const AdminLayout = () => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <SidebarInset className="flex-1">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 ml-4">
              <div className="h-6 w-px bg-border"></div>
              <span className="text-sm font-medium text-foreground">Painel Administrativo</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="layout-container">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </div>
  );
};

export default AdminLayout;