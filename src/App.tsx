import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Briefing from "./pages/Briefing";
import CreateSong from "./pages/CreateSong";
import Auth from "./pages/Auth";
import Order from "./pages/Order";
import Dashboard from "./pages/Dashboard";
import TestOpenAI from "./pages/TestOpenAI";
import OrderLyricsPage from "./pages/OrderLyricsPage";
import NotFound from "./pages/NotFound";
import Planos from "./pages/Planos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/briefing" element={<Briefing />} />
            <Route path="/create-song" element={<CreateSong />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/test-openai" element={<TestOpenAI />} />
            <Route path="/pedido/:id/letras" element={<OrderLyricsPage />} />
            <Route path="/pedido/:orderId" element={<Order />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
