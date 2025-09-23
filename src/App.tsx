import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

// Auth
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Admin
import { AdminAuthProvider } from "./components/admin/AdminAuthProvider";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminClientCreate from "./pages/admin/AdminClientCreate";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminStores from "./pages/admin/AdminStores";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminClientDetails from "./pages/admin/AdminClientDetails";
import AdminLayout from "./components/admin/AdminLayout";

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
import PublicReturnsNew from "./pages/PublicReturnsNew";
import PublicRefunds from "./pages/PublicRefunds";
import TrackingPortal from "./components/returns/TrackingPortal";
import RefundStatus from "./pages/RefundStatus";

// Layout
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminAuthProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/public/returns/:slug" element={<PublicReturnsNew />} />
              <Route path="/public/refunds/:storeSlug" element={<PublicRefunds />} />
              <Route path="/refunds/:storeSlug/status/:rid" element={<RefundStatus />} />
              <Route path="/tracking" element={<TrackingPortal />} />
              
              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="clients" element={<AdminClients />} />
                <Route path="clients/new" element={<AdminClientCreate />} />
                <Route path="clients/:id" element={<AdminClientDetails />} />
                <Route path="clients/:id/edit" element={<AdminClientDetails />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="stores" element={<AdminStores />} />
                <Route path="audit" element={<AdminAudit />} />
              </Route>
              
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
    </AdminAuthProvider>
  </QueryClientProvider>
);

export default App;
