import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import Index from "./pages/Index";
import Briefing from "./pages/Briefing";
import CreateSong from "./pages/CreateSong";
import Auth from "./pages/Auth";
import Order from "./pages/Order";
import OrderDetails from "./pages/OrderDetails";
import OrderTracking from "./pages/OrderTracking";
import Dashboard from "./pages/Dashboard";
import TestOpenAI from "./pages/TestOpenAI";
import OrderLyricsPage from "./pages/OrderLyricsPage";
import NotFound from "./pages/NotFound";
import Planos from "./pages/Planos";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import Checkout from "./pages/Checkout";
import Install from "./pages/Install";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import MusicRules from "./pages/MusicRules";
import MusicShare from "./pages/MusicShare";

const queryClient = new QueryClient();

// PWA Update Handler Component
const PWAUpdateHandler = () => {
  usePWAUpdate();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PWAUpdateHandler />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/briefing" element={<Briefing />} />
            <Route path="/criar-musica" element={<CreateSong />} />
            <Route path="/create-song" element={<CreateSong />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/pagamento-sucesso" element={<PaymentSuccess />} />
            <Route path="/checkout/:orderId" element={<Checkout />} />
            <Route path="/install" element={<Install />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfUse />} />
            <Route path="/regras" element={<MusicRules />} />
            <Route path="/m/:orderId" element={<MusicShare />} />
            <Route path="/acompanhar/:orderId" element={<OrderTracking />} />
            <Route path="/test-openai" element={<TestOpenAI />} />
            <Route path="/pedido/:orderId/letras" element={<OrderLyricsPage />} />
            <Route path="/pedido/:orderId" element={<OrderDetails />} />
            <Route path="/order/:orderId" element={<Order />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
