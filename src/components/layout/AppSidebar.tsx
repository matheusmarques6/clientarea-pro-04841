import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { RefreshCw, DollarSign, Package, Settings, HelpCircle, LayoutGrid, ArrowLeft, FileEdit } from "lucide-react";

import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import convertfyLogo from "@/assets/convertfy-logo.png";

export function AppSidebar() {
  const location = useLocation();
  const { id: storeId } = useParams();
  const currentPath = location.pathname;
  const { state, toggleSidebar } = useSidebar();
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      setActiveStoreId(storeId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("convertfy:last-store-id", storeId);
        } catch (error) {
          console.warn("Failed to persist store id", error);
        }
      }
    } else if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("convertfy:last-store-id");
        if (saved) {
          setActiveStoreId(saved);
        }
      } catch (error) {
        console.warn("Failed to read store id", error);
      }
    }
  }, [storeId]);

  const resolvedStoreId = storeId || activeStoreId;

  const navSections = [
    {
      label: "Principal",
      items: [
        {
          title: "Dashboard",
          url: resolvedStoreId ? `/store/${resolvedStoreId}` : "/stores",
          icon: LayoutGrid,
          disabled: !resolvedStoreId,
          exact: true,
        },
      ],
    },
    {
      label: "Operações",
      items: [
        {
          title: "Formulário",
          url: resolvedStoreId ? `/store/${resolvedStoreId}/formulario` : "#",
          icon: FileEdit,
          disabled: !resolvedStoreId,
        },
        {
          title: "Trocas & Devoluções",
          url: resolvedStoreId ? `/store/${resolvedStoreId}/returns` : "#",
          icon: RefreshCw,
          disabled: !resolvedStoreId,
        },
        {
          title: "Reembolsos",
          url: resolvedStoreId ? `/store/${resolvedStoreId}/refunds` : "#",
          icon: DollarSign,
          disabled: !resolvedStoreId,
        },
        {
          title: "Custo de Produto",
          url: resolvedStoreId ? `/store/${resolvedStoreId}/costs` : "#",
          icon: Package,
          disabled: !resolvedStoreId,
        },
      ],
    },
    {
      label: "Suporte",
      items: [
        {
          title: "Configurações",
          url: resolvedStoreId ? `/store/${resolvedStoreId}/settings` : "#",
          icon: Settings,
          disabled: !resolvedStoreId,
        },
        {
          title: "Ajuda",
          url: "/help",
          icon: HelpCircle,
        },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '#') return false;
    if (path === `/store/${storeId}` && currentPath === `/store/${storeId}`) return true;
    return currentPath.startsWith(path) && path !== `/store/${storeId}`;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
      <SidebarContent className="flex h-full flex-col gap-8 p-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground md:flex"
          aria-label={state === "collapsed" ? "Expandir menu" : "Recolher menu"}
        >
          <span className="text-sm font-semibold">{state === "collapsed" ? "›" : "‹"}</span>
        </button>

        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/90 to-brand-blue text-white shadow-md">
            <img
              src={convertfyLogo}
              alt="Convertfy"
              className="h-6 w-6"
            />
          </div>
          {state !== "collapsed" && (
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight">Convertfy</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-green">
                Portal Pro
              </span>
            </div>
          )}
        </div>

        <Link
          to="/stores"
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground",
            state === "collapsed" && "justify-center px-0"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          {state !== "collapsed" && <span>Voltar para lojas</span>}
        </Link>

        <nav className="flex flex-1 flex-col gap-6">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-2">
              {state !== "collapsed" && (
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const disabled = item.disabled;
                  const active = isActive(item.url);
                  return disabled ? (
                    <div
                      key={item.title}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-40",
                        state === "collapsed" ? "justify-center" : "justify-start",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </div>
                  ) : (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      end={item.exact}
                      className={({ isActive: navActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                          state === "collapsed" ? "justify-center" : "justify-start",
                          navActive || active
                            ? "bg-brand-purple-light text-brand-purple shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {state !== "collapsed" && (
          <div className="rounded-lg border border-border bg-background px-3 py-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-semibold text-foreground">Sincronização ativa</p>
            <p>Monitore o desempenho e sincronize os dados da sua loja Convertfy.</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
