import { Outlet, useParams } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { mockStores } from '@/lib/mockData';

const AppLayout = () => {
  const { id: storeId } = useParams();
  const store = mockStores.find(s => s.id === storeId);

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            {store && (
              <div className="flex items-center gap-2 ml-4">
                <div className="h-6 w-px bg-border"></div>
                <span className="text-sm font-medium text-foreground">{store.name}</span>
              </div>
            )}
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