import { Outlet, useParams } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/hooks/useStores';

const AppLayout = () => {
  const { id: storeId } = useParams();
  const { signOut } = useAuth();
  const { store } = useStore(storeId!);

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <header className="flex h-[69px] shrink-0 items-center gap-2 border-b bg-white pb-[10px]">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            {store && (
              <div className="flex items-center gap-2 ml-4">
                <div className="h-6 w-px bg-border"></div>
                <span className="text-sm font-medium text-foreground">{store.name}</span>
              </div>
            )}
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

export default AppLayout;