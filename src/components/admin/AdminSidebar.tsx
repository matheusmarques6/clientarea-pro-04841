import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Store, 
  Settings, 
  FileText, 
  BarChart3,
  Shield,
  LogOut,
  Menu
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import convertfyLogo from '@/assets/convertfy-logo.png';

const adminNavItems = [
  { 
    title: 'Dashboard', 
    url: '/admin', 
    icon: BarChart3,
    exact: true 
  },
  { 
    title: 'Clientes', 
    url: '/admin/clients', 
    icon: Building2 
  },
  { 
    title: 'Usuários', 
    url: '/admin/users', 
    icon: Users 
  },
  { 
    title: 'Lojas', 
    url: '/admin/stores', 
    icon: Store 
  },
  { 
    title: 'Auditoria', 
    url: '/admin/audit', 
    icon: FileText 
  },
  { 
    title: 'Configurações', 
    url: '/admin/settings', 
    icon: Settings 
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const { signOut, adminUser } = useAdminAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const collapsed = state === 'collapsed';

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string, exact?: boolean) => {
    const active = isActive(path, exact);
    return active 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-60"} transition-all duration-300 border-r bg-background/95 backdrop-blur-sm`}
      collapsible="icon"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={convertfyLogo} alt="Convertfy" className="h-6" />
            <span className="text-sm font-medium text-foreground">Admin</span>
          </div>
        )}
        <SidebarTrigger className="p-1" />
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.exact}
                      className={getNavClassName(item.url, item.exact)}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <div className="border-t p-4">
        {!collapsed && adminUser && (
          <div className="mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span className="truncate">{adminUser.email}</span>
            </div>
            <div className="text-xs opacity-60 capitalize">{adminUser.role.replace('_', ' ')}</div>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size={collapsed ? "icon" : "sm"}
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </Sidebar>
  );
}