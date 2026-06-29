import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { supabaseAuth, getAuthErrorMessage } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function resolvePostLoginPath(profile, next) {
  if (profile?.isPlatformAdmin) return '/admin/merchants';
  if (profile?.isDisabled) return null;
  if (!profile?.hasMerchantAccount) return null;
  return next.startsWith('/admin') ? '/dashboard' : next;
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const {
    isAuthenticated,
    isPlatformAdmin,
    isMerchantDisabled,
    hasMerchantAccount,
    isLoading,
    refresh,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const next = (() => {
    const value = searchParams.get('next') || '/dashboard';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
  })();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (isMerchantDisabled) {
      setAccessDenied(true);
      toast.error('Votre compte a été désactivé. Contactez RegalClic.');
      return;
    }

    const target = resolvePostLoginPath(
      { isPlatformAdmin, isDisabled: isMerchantDisabled, hasMerchantAccount },
      next,
    );

    if (target) {
      navigate(target, { replace: true });
      return;
    }

    if (!isPlatformAdmin && !hasMerchantAccount) {
      setAccessDenied(true);
    }
  }, [
    isAuthenticated,
    isLoading,
    isPlatformAdmin,
    isMerchantDisabled,
    hasMerchantAccount,
    navigate,
    next,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAccessDenied(false);
    try {
      await supabaseAuth.signIn(email, password);
      const profile = await refresh();

      if (profile?.isDisabled) {
        setAccessDenied(true);
        toast.error('Votre compte a été désactivé. Contactez RegalClic.');
        return;
      }

      const target = resolvePostLoginPath(profile, next);
      if (target) {
        toast.success('Connexion réussie');
        navigate(target, { replace: true });
        return;
      }

      setAccessDenied(true);
      toast.error('Ce compte n\'a pas accès à l\'application. Contactez RegalClic.');
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-sm font-medium text-rc-teal">RegalClic Wallet</p>
          <CardTitle>Connexion restaurateur</CardTitle>
          <CardDescription>
            Accès réservé aux commerçants créés par l&apos;équipe RegalClic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accessDenied && isAuthenticated ? (
            <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Accès refusé pour ce compte</p>
              <p>
                Si vous êtes administrateur, vérifiez que vous utilisez bien
                {' '}
                <strong>admin@regalclic.com</strong>
                .
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => logout()}>
                Se déconnecter
              </Button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || isLoading}>
              {loading ? 'Chargement…' : 'Se connecter'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Pas de compte ? Contactez RegalClic pour obtenir vos identifiants.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
