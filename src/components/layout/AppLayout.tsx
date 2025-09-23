import { Outlet, useParams } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/hooks/useStores';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const AppLayout = () => {
  const { id: storeId } = useParams();
  const { signOut } = useAuth();
  const { store } = useStore(storeId!);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
          {/* Left side - Page title and store name */}
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">
              {store ? store.name : 'Dashboard'}
            </h1>
          </div>

          {/* Right side - Actions and profile */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 ml-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  U
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto">
          <div className="p-5 md:p-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </div>
  );
};

export default AppLayout;