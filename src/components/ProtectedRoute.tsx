import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/States';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingState message="Loading your workspace..." />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
