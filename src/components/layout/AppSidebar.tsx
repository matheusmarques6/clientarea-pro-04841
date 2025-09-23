import { useState, useEffect } from 'react';
import { useLocation, NavLink, useParams } from 'react-router-dom';
import {
  Home,
  Users,
  ShoppingCart,
  Package,
  RefreshCw,
  DollarSign,
  Settings,
  HelpCircle,
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

export function AppSidebar() {
  const location = useLocation();
  const { id: storeId } = useParams();
  const currentPath = location.pathname;

  const items = [
    {
      title: 'Dashboard',
      url: storeId ? `/store/${storeId}` : '/stores',
      icon: Home,
    },
    {
      title: 'Order Management',
      url: storeId ? `/store/${storeId}/orders` : '#',
      icon: ShoppingCart,
      disabled: !storeId,
    },
    {
      title: 'Customers',
      url: storeId ? `/store/${storeId}/customers` : '#',
      icon: Users,
      disabled: !storeId,
    },
    {
      title: 'Courses Code',
      url: storeId ? `/store/${storeId}/courses` : '#',
      icon: Package,
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
      title: 'Reports',
      url: storeId ? `/store/${storeId}/reports` : '#',
      icon: Settings,
      disabled: !storeId,
    },
    {
      title: 'Email',
      url: storeId ? `/store/${storeId}/email` : '#',
      icon: HelpCircle,
      disabled: !storeId,
    },
    {
      title: 'Ad Products',
      url: storeId ? `/store/${storeId}/ads` : '#',
      icon: Package,
      disabled: !storeId,
    },
    {
      title: 'Product List',
      url: storeId ? `/store/${storeId}/products` : '#',
      icon: Package,
      disabled: !storeId,
    },
    {
      title: 'Active Lists',
      url: storeId ? `/store/${storeId}/active-lists` : '#',
      icon: Settings,
      disabled: !storeId,
    },
    {
      title: 'Archive Activity',
      url: storeId ? `/store/${storeId}/archive` : '#',
      icon: Settings,
      disabled: !storeId,
    },
  ];

  const isActive = (path: string) => {
    if (path === '#') return false;
    if (path === `/store/${storeId}` && currentPath === `/store/${storeId}`) return true;
    return currentPath.startsWith(path) && path !== `/store/${storeId}`;
  };

  const getNavClassName = (item: any) => {
    if (item.disabled) {
      return 'opacity-50 cursor-not-allowed pointer-events-none text-gray-400';
    }
    return isActive(item.url)
      ? 'bg-emerald-500 text-white font-medium hover:bg-emerald-600'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
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
        <SidebarMenuButton className={cn("w-full justify-start px-3 py-2 rounded-md", getNavClassName(item))}>
          {content}
        </SidebarMenuButton>
      );
    }

    return (
      <SidebarMenuButton asChild className={cn("w-full justify-start px-3 py-2 rounded-md", getNavClassName(item))}>
        <NavLink to={item.url} className="flex items-center">
          {content}
        </NavLink>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar className="w-64 bg-white border-r border-gray-200">
      <SidebarContent className="flex flex-col h-full p-4">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-gray-900">DEAL-O-HIT</span>
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