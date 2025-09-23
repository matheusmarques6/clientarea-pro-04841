import { useLocation, NavLink, useParams } from 'react-router-dom';
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  Package,
  Settings,
  HelpCircle,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import convertfyLogo from '@/assets/convertfy-logo.png';

export function AppSidebar() {
  const location = useLocation();
  const { id: storeId } = useParams();
  const currentPath = location.pathname;
  const { state, toggleSidebar } = useSidebar();

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
      ? 'bg-primary text-primary-foreground font-medium hover:bg-primary/80'
      : 'text-foreground hover:bg-muted/80 hover:text-foreground';
  };

  const renderMenuItem = (item: any) => {
    const content = (
      <>
        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {state !== 'collapsed' && <span className="text-sm">{item.title}</span>}
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
    <Sidebar collapsible="icon" className="bg-card border-r border-border">
      <SidebarContent className="flex flex-col h-full p-4">
        {/* Logo and collapse button */}
        <div className="mb-8 px-2 flex items-center justify-between">
          {state !== 'collapsed' && (
            <div className="flex items-center gap-2">
              <img 
                src={convertfyLogo} 
                alt="Convertfy" 
                className="h-8 w-auto"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "h-8 w-8 p-0 hover:bg-muted transition-colors hidden md:flex",
              state === 'collapsed' && "mx-auto"
            )}
          >
            {state === 'collapsed' ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
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