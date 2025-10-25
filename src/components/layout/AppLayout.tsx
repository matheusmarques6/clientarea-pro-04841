import { Outlet, useParams } from 'react-router-dom';
import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/hooks/useStores";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";

const AppLayout = () => {
  const { id: storeId } = useParams();
  const { signOut } = useAuth();
  const { store } = useStore(storeId!);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden h-10 w-10 rounded-lg border border-border text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {store ? "Loja conectada" : "Bem-vindo"}
              </span>
              <h1 className="text-xl font-semibold leading-tight">
                {store ? store.name : "Selecione uma loja"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Avatar className="h-9 w-9 border border-border shadow-sm">
              <AvatarFallback className="bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                {store ? store.name.charAt(0) : "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-10 w-10 rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="layout-container">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </div>
  );
};

export default AppLayout;
