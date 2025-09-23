import { useLocation, NavLink, useParams } from 'react-router-dom';
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  Package,
  Settings,
  HelpCircle,
  Store,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import convertfyLogo from '@/assets/convertfy-logo.png';

export function AppSidebar() {
  const location = useLocation();
  const { id: storeId } = useParams();
  const currentPath = location.pathname;

  const items = [
    {
      title: 'Suas Lojas',
      url: '/stores',
      icon: Store,
    },
    {
      title: 'Dashboard',
      url: storeId ? `/store/${storeId}` : '#',
      icon: BarChart3,
      disabled: !storeId,
    },
    {
      title: 'Trocas & Devoluções',
      url: storeId ? `/store/${storeId}/returns` : '#',
      icon: RefreshCw,
      disabled: !storeId,
    },
    {
      title: 'Reembolsos',
      url: storeId ? `/store/${storeId}/refunds` : '#',
      icon: DollarSign,
      disabled: !storeId,
    },
    {
      title: 'Custo de Produto',
      url: storeId ? `/store/${storeId}/costs` : '#',
      icon: Package,
      disabled: !storeId,
    },
    {
      title: 'Configurações',
      url: storeId ? `/store/${storeId}/settings` : '#',
      icon: Settings,
      disabled: !storeId,
    },
    {
      title: 'Ajuda',
      url: '/help',
      icon: HelpCircle,
    },
  ];

  const isActive = (path: string) => {
    if (path === '#') return false;
    if (path === `/store/${storeId}` && currentPath === `/store/${storeId}`) return true;
    return currentPath.startsWith(path) && path !== `/store/${storeId}`;
  };

  const getNavClassName = (item: any) => {
    if (item.disabled) {
      return 'opacity-50 cursor-not-allowed pointer-events-none text-muted-foreground';
    }
    return isActive(item.url)
      ? 'bg-primary text-primary-foreground font-medium hover:bg-primary/90'
      : 'text-foreground hover:bg-accent hover:text-accent-foreground';
  };

  const renderMenuItem = (item: any) => {
    const content = (
      <>
        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
        <span className="text-sm">{item.title}</span>
      </>
    );

    if (item.disabled) {
      return (
        <SidebarMenuButton className={cn("w-full justify-start px-3 py-2.5 rounded-lg", getNavClassName(item))}>
          {content}
        </SidebarMenuButton>
      );
    }

    return (
      <SidebarMenuButton asChild className={cn("w-full justify-start px-3 py-2.5 rounded-lg", getNavClassName(item))}>
        <NavLink to={item.url} className="flex items-center">
          {content}
        </NavLink>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar className="w-64 bg-card border-r border-border">
      <SidebarContent className="flex flex-col h-full p-4">
        {/* Logo */}
        <div className="mb-8 px-2 flex justify-center">
          <div className="flex items-center gap-2">
            <img 
              src={convertfyLogo} 
              alt="Convertfy" 
              className="h-8 w-auto"
            />
          </div>
        </div>

        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderMenuItem(item)}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}