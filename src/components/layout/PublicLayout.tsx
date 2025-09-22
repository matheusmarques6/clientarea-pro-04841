import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-premium">
      <div className="grid min-h-screen grid-rows-[auto,1fr,auto]">
        {/* Header */}
        <header className="w-full">
          <div className="mx-auto w-full max-w-[720px] px-5 py-4 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">Central de Atendimento</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full">
          <div className="layout-container">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full">
          <div className="mx-auto w-full max-w-[720px] px-5 py-4 text-center text-xs text-muted-foreground">
            <p>© 2024 Central de Atendimento. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}