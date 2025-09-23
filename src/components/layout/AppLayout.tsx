import { Outlet, useParams } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/hooks/useStores';

const AppLayout = () => {
  const { id: storeId } = useParams();
  const { signOut } = useAuth();
  const { store } = useStore(storeId!);

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
          {/* Left side - Page title */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          </div>

          {/* Center - Search bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search data, users, or content"
                className="pl-10 pr-4 py-2 w-full border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Right side - Actions and profile */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-4 w-4 text-gray-600" />
            </Button>
            
            <div className="flex items-center gap-2 ml-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </div>
  );
};

export default AppLayout;