import { Navigate, useLocation } from 'react-router-dom';
import { getLegacyCreatorDestination } from '@/lib/marketing-routes';

export default function LegacyCreatorRedirect({ children }: { children: React.ReactNode }) {
  const { pathname, hash, search } = useLocation();
  const destination = getLegacyCreatorDestination(pathname, hash, search);
  return destination ? <Navigate to={destination} replace /> : <>{children}</>;
}