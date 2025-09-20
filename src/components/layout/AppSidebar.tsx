import { useState, useEffect } from 'react';
import { useLocation, NavLink, useParams } from 'react-router-dom';
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  Package,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import convertfyLogo from '@/assets/convertfy-logo.png';

export function AppSidebar() {
  const { open, setOpen, openMobile, setOpenMobile, isMobile, state } = useSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { id: storeId } = useParams();
  const currentPath = location.pathname;

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed.toString());
  }, [collapsed]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const items = [
    {
      title: 'Suas Lojas',
      url: '/stores',
      icon: BarChart3,
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
      return 'opacity-50 cursor-not-allowed pointer-events-none';
    }
    return isActive(item.url)
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      : 'hover:bg-sidebar-accent/50';
  };

  const renderMenuItem = (item: any) => {
    const content = (
      <>
        <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
        {!collapsed && (
          <span className="sidebar-label transition-all duration-200">
            {item.title}
          </span>
        )}
      </>
    );

    if (item.disabled) {
      return (
        <SidebarMenuButton className={getNavClassName(item)}>
          {content}
        </SidebarMenuButton>
      );
    }

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild className={getNavClassName(item)}>
              <NavLink to={item.url} className="flex items-center justify-center">
                {content}
              </NavLink>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <SidebarMenuButton asChild className={getNavClassName(item)}>
        <NavLink to={item.url} className="flex items-center">
          {content}
        </NavLink>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar
      className={`sidebar border-r transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
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
          className="h-6 w-6 p-0 hover:bg-sidebar-accent"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel>
              Navegação
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title} className="nav-item">
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