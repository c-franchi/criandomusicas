import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import PageLoader from "@/components/PageLoader";

// Critical path - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load other pages for better performance
const Briefing = lazy(() => import("./pages/Briefing"));
const CreateSong = lazy(() => import("./pages/CreateSong"));
const Order = lazy(() => import("./pages/Order"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TestOpenAI = lazy(() => import("./pages/TestOpenAI"));
const OrderLyricsPage = lazy(() => import("./pages/OrderLyricsPage"));
const Planos = lazy(() => import("./pages/Planos"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Install = lazy(() => import("./pages/Install"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const MusicRules = lazy(() => import("./pages/MusicRules"));
const MusicShare = lazy(() => import("./pages/MusicShare"));
const VideoCheckout = lazy(() => import("./pages/VideoCheckout"));
const VideoUpload = lazy(() => import("./pages/VideoUpload"));

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Critical routes - loaded immediately */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Lazy loaded routes */}
              <Route path="/briefing" element={<Briefing />} />
              <Route path="/criar-musica" element={<CreateSong />} />
              <Route path="/create-song" element={<CreateSong />} />
              <Route path="/planos" element={<Planos />} />
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
              <Route path="/video-checkout/:orderId" element={<VideoCheckout />} />
              <Route path="/video-upload/:videoOrderId" element={<VideoUpload />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
