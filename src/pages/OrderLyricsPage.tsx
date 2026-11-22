import { Navigate, useParams } from 'react-router-dom';

// Keep the legacy URL, but use the canonical Supabase order flow so ownership,
// payment gates and the stored generation language remain consistent.
export default function OrderLyricsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  if (!orderId) return <Navigate to="/dashboard" replace />;
  return <Navigate to={`/criar-musica?orderId=${encodeURIComponent(orderId)}`} replace />;
}
