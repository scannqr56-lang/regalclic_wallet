import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MerchantProtectedRoute({ children }) {
  const {
    isAuthenticated,
    isLoading,
    isPlatformAdmin,
    isMerchantDisabled,
    hasMerchantAccount,
    logout,
  } = useAuth();
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

  if (isPlatformAdmin) {
    return <Navigate to="/admin/merchants" replace />;
  }

  if (isMerchantDisabled) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Compte désactivé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Votre accès restaurateur a été désactivé. Contactez RegalClic pour plus d&apos;informations.
            </p>
            <Button type="button" variant="outline" onClick={() => logout()}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasMerchantAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès non autorisé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Les comptes restaurateur sont créés par l&apos;équipe RegalClic.
              Si vous avez reçu vos identifiants, connectez-vous avec l&apos;email fourni.
            </p>
            <Button type="button" variant="outline" onClick={() => logout()}>
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
