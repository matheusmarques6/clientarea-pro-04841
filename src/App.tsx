import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminClientCreate from "@/pages/admin/AdminClientCreate";
import AdminClientDetails from "@/pages/admin/AdminClientDetails";
import AdminClients from "@/pages/admin/AdminClients";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminReturnsManagement from "@/pages/admin/AdminReturnsManagement";
import AdminStores from "@/pages/admin/AdminStores";
import AdminUsers from "@/pages/admin/AdminUsers";
import { AdminOKRDashboard } from "@/pages/admin/okr/AdminOKRDashboard";
import { AdminOKRTeam } from "@/pages/admin/okr/AdminOKRTeam";
import { AdminOKRObjectives } from "@/pages/admin/okr/AdminOKRObjectives";
import { AdminOKRMetrics } from "@/pages/admin/okr/AdminOKRMetrics";
import { AdminOKRPeriods } from "@/pages/admin/okr/AdminOKRPeriods";
import { AdminOKRProfile } from "@/pages/admin/okr/AdminOKRProfile";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import AppLayout from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

import Auth from "@/pages/Auth";
import DebugRoute from "@/pages/DebugRoute";
import FormularioPortal from "@/pages/FormularioPortal";
import Help from "@/pages/Help";
import NewReturn from "@/pages/NewReturn";
import NotFound from "@/pages/NotFound";
import PreDashboard from "@/pages/PreDashboard";
import ProductCosts from "@/pages/ProductCosts";
import PublicRefunds from "@/pages/PublicRefunds";
import PublicRefundsNew from "@/pages/PublicRefundsNew";
import PublicReturnsNew from "@/pages/PublicReturnsNew";
import RefundStatus from "@/pages/RefundStatus";
import Refunds from "@/pages/Refunds";
import RefundsSetup from "@/pages/RefundsSetup";
import Returns from "@/pages/Returns";
import ReturnsSetup from "@/pages/ReturnsSetup";
import StoreDashboard from "@/pages/StoreDashboard";
import StoreSelector from "@/pages/StoreSelector";
import StoreSettings from "@/pages/StoreSettings";
import TestPage from "@/pages/TestPage";
import TrackingPortal from "@/components/returns/TrackingPortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminAuthProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ThemeProvider>
              <SidebarProvider>
                <Routes>
                  {/* Debug / test routes */}
                  <Route path="/test" element={<TestPage />} />
                  <Route
                    path="/debug/:id"
                    element={
                      <ProtectedRoute>
                        <DebugRoute />
                      </ProtectedRoute>
                    }
                  />

                  {/* Public routes */}
                  <Route path="/formulario/:slug" element={<PublicReturnsNew />} />
                  <Route path="/public/refunds/:slug" element={<PublicRefundsNew />} />
                  <Route path="/refunds/:storeSlug/status/:rid" element={<RefundStatus />} />
                  <Route path="/tracking" element={<TrackingPortal />} />

                  {/* Admin routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route
                    path="/admin"
                    element={
                      <AdminProtectedRoute>
                        <AdminLayout />
                      </AdminProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="returns-management" element={<AdminReturnsManagement />} />
                    <Route path="okr" element={<AdminOKRDashboard />} />
                    <Route path="okr/team" element={<AdminOKRTeam />} />
                    <Route path="okr/objectives" element={<AdminOKRObjectives />} />
                    <Route path="okr/metrics" element={<AdminOKRMetrics />} />
                    <Route path="okr/periods" element={<AdminOKRPeriods />} />
                    <Route path="okr/profile/:id" element={<AdminOKRProfile />} />
                    <Route path="clients" element={<AdminClients />} />
                    <Route path="clients/new" element={<AdminClientCreate />} />
                    <Route path="clients/:id" element={<AdminClientDetails />} />
                    <Route path="clients/:id/edit" element={<AdminClientDetails />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="stores" element={<AdminStores />} />
                    <Route path="audit" element={<AdminAudit />} />
                  </Route>

                  {/* Auth */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Navigate to="/auth" replace />} />

                  {/* Protected routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <PreDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/stores"
                    element={
                      <ProtectedRoute>
                        <StoreSelector />
                      </ProtectedRoute>
                    }
                  />

                  {/* App layout */}
                  <Route
                    path="/store/:id"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<StoreDashboard />} />
                    <Route path="formulario" element={<FormularioPortal />} />
                    <Route path="returns" element={<Returns />} />
                    <Route path="returns/setup" element={<ReturnsSetup />} />
                    <Route path="returns/new" element={<NewReturn />} />
                    <Route path="refunds" element={<Refunds />} />
                    <Route path="refunds/setup" element={<RefundsSetup />} />
                    <Route path="costs" element={<ProductCosts />} />
                    <Route path="settings" element={<StoreSettings />} />
                  </Route>

                  <Route
                    path="/help"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Help />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SidebarProvider>
            </ThemeProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AdminAuthProvider>
  </QueryClientProvider>
);

export default App;

