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
      return 'opacity-40 cursor-not-allowed pointer-events-none text-muted-foreground/60 hover:bg-transparent';
    }
    return isActive(item.url)
      ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 border border-primary/20'
      : 'text-foreground hover:bg-gradient-to-r hover:from-muted/60 hover:to-muted/40 hover:text-foreground border border-transparent hover:border-border/30 hover:shadow-sm';
  };

  const renderMenuItem = (item: any) => {
    const content = (
      <>
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {state !== 'collapsed' && <span className="text-sm font-medium">{item.title}</span>}
      </>
    );

    if (item.disabled) {
      return (
        <SidebarMenuButton className={cn("w-full justify-start px-4 py-3 rounded-xl transition-all duration-200", getNavClassName(item))}>
          {content}
        </SidebarMenuButton>
      );
    }

    return (
      <SidebarMenuButton asChild className={cn("w-full justify-start px-4 py-3 rounded-xl transition-all duration-200", getNavClassName(item))}>
        <NavLink to={item.url} className="flex items-center gap-3">
          {content}
        </NavLink>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar collapsible="icon" className="bg-gradient-to-b from-card via-card to-card/95 border-r border-border/50 shadow-lg backdrop-blur-sm">
      <SidebarContent className="flex flex-col h-full p-3">
        {/* Logo and collapse button */}
        <div className="mb-6 px-3 flex items-center justify-between">
          {state !== 'collapsed' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={convertfyLogo} 
                  alt="Convertfy" 
                  className="h-10 w-auto drop-shadow-sm"
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur opacity-30"></div>
              </div>
            </div>
          )}
          {state === 'collapsed' && (
            <div className="flex items-center justify-center w-full">
              <div className="relative">
                <img 
                  src={convertfyLogo} 
                  alt="Convertfy" 
                  className="h-8 w-auto drop-shadow-sm"
                />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "h-8 w-8 p-0 hover:bg-muted/70 transition-all duration-200 hidden md:flex rounded-lg",
              state === 'collapsed' && "absolute top-3 right-3"
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
            <SidebarMenu className="space-y-2 px-2">
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