import React from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const AdminLayout = () => {
  const { signOut } = useAdminAuth();

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
          <div className="px-4">
            <Button
              variant="ghost" 
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
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