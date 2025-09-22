import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

// Auth
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Pages
import PreDashboard from "./pages/PreDashboard";
import Auth from "./pages/Auth";
import StoreSelector from "./pages/StoreSelector";
import StoreDashboard from "./pages/StoreDashboard";
import Returns from "./pages/Returns";
import ReturnsSetup from "./pages/ReturnsSetup";
import NewReturn from "./pages/NewReturn";
import Refunds from "./pages/Refunds";
import RefundsSetup from "./pages/RefundsSetup";
import ProductCosts from "./pages/ProductCosts";
import StoreSettings from "./pages/StoreSettings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import PublicReturns from "./pages/PublicReturns";
import PublicRefunds from "./pages/PublicRefunds";
import TrackingPortal from "./components/returns/TrackingPortal";
import RefundStatus from "./pages/RefundStatus";

// Layout
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <Routes>
              {/* Public routes - apenas páginas públicas sem auth */}
              <Route path="/public/returns/:storeSlug" element={<PublicReturns />} />
              <Route path="/public/refunds/:storeSlug" element={<PublicRefunds />} />
              <Route path="/refunds/:storeSlug/status/:rid" element={<RefundStatus />} />
              <Route path="/tracking" element={<TrackingPortal />} />
              
              {/* Auth route - página de login */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Landing page redirect - redireciona para auth */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
              
              {/* Protected routes - TODAS as páginas internas exigem login */}
              <Route element={<ProtectedRoute><div /></ProtectedRoute>}>
                {/* PreDashboard - primeira página após login */}
                <Route path="/dashboard" element={<PreDashboard />} />
                
                {/* Seleção de loja - segunda etapa */}
                <Route path="/stores" element={<StoreSelector />} />
                
                {/* Rotas da aplicação com sidebar - requer loja selecionada */}
                <Route element={<AppLayout />}>
                  <Route path="/help" element={<Help />} />
                  <Route path="/store/:id" element={<StoreDashboard />} />
                  <Route path="/store/:id/returns" element={<Returns />} />
                  <Route path="/store/:id/returns/setup" element={<ReturnsSetup />} />
                  <Route path="/store/:id/returns/new" element={<NewReturn />} />
                  <Route path="/store/:id/refunds" element={<Refunds />} />
                  <Route path="/store/:id/refunds/setup" element={<RefundsSetup />} />
                  <Route path="/store/:id/costs" element={<ProductCosts />} />
                  <Route path="/store/:id/settings" element={<StoreSettings />} />
                </Route>
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
