import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, isPlatformAdmin, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès administrateur requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Ce compte n&apos;a pas les droits administrateur RegalClic.
            </p>
            <Button type="button" variant="outline" onClick={() => logout()}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
