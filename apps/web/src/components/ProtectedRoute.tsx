import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth, type Role } from '@/lib/auth';

export function ProtectedRoute({ role, children }: { role: Role; children: React.ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Loader2 className="spin" />
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (state.user.role !== role) {
    // wrong role for this section → kirim ke home masing-masing
    const home = `/${state.user.role}`;
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
