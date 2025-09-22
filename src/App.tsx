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
              {/* Public routes */}
              <Route path="/public/returns/:storeSlug" element={<PublicReturns />} />
              <Route path="/public/refunds/:storeSlug" element={<PublicRefunds />} />
              <Route path="/refunds/:storeSlug/status/:rid" element={<RefundStatus />} />
              <Route path="/tracking" element={<TrackingPortal />} />
              
              {/* Admin routes */}
              <Route path="/admin/login" element={<div>Admin Login - Implementar</div>} />
              <Route path="/admin" element={<div>Admin Dashboard - Implementar</div>} />
              <Route path="/admin/clients" element={<div>Admin Clients - Implementar</div>} />
              
              {/* Auth route */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Landing page redirect */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><PreDashboard /></ProtectedRoute>} />
              <Route path="/stores" element={<ProtectedRoute><StoreSelector /></ProtectedRoute>} />
              
              {/* App routes with sidebar */}
              <Route path="/store/:id" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<StoreDashboard />} />
                <Route path="returns" element={<Returns />} />
                <Route path="returns/setup" element={<ReturnsSetup />} />
                <Route path="returns/new" element={<NewReturn />} />
                <Route path="refunds" element={<Refunds />} />
                <Route path="refunds/setup" element={<RefundsSetup />} />
                <Route path="costs" element={<ProductCosts />} />
                <Route path="settings" element={<StoreSettings />} />
              </Route>
              <Route path="/help" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Help />} />
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
