import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const AppLayout = () => {
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </div>
  );
};

export default AppLayout;