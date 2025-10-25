import { ThemeToggle } from "./ThemeToggle";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="min-h-screen w-full bg-background text-foreground">
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground">
        <span className="text-lg font-bold text-foreground">Convertfy</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Portal</span>
      </div>
      <ThemeToggle />
    </header>
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      {children}
    </main>
  </div>
);
