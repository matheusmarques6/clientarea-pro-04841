import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

// Pages
import PreDashboard from "./pages/PreDashboard";
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

// Layout
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <Routes>
            {/* Routes without sidebar */}
            <Route path="/" element={<PreDashboard />} />
            <Route path="/public/returns/:storeSlug" element={<PublicReturns />} />
            <Route path="/public/refunds/:storeSlug" element={<PublicRefunds />} />
            
            {/* Routes with sidebar */}
            <Route element={<AppLayout />}>
              <Route path="/stores" element={<StoreSelector />} />
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
