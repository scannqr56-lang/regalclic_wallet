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

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isPlatformAdmin, isMerchantDisabled, hasMerchantAccount, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const next = (() => {
    const value = searchParams.get('next') || '/dashboard';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
  })();

  useEffect(() => {
    if (!isAuthenticated) return;

    if (isPlatformAdmin) {
      navigate('/admin/merchants', { replace: true });
      return;
    }

    if (isMerchantDisabled) {
      toast.error('Votre compte a été désactivé. Contactez RegalClic.');
      return;
    }

    if (!hasMerchantAccount) {
      return;
    }

    navigate(next.startsWith('/admin') ? '/dashboard' : next, { replace: true });
  }, [isAuthenticated, isPlatformAdmin, isMerchantDisabled, hasMerchantAccount, navigate, next]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabaseAuth.signIn(email, password);
      await refresh();
      toast.success('Connexion réussie');
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
            <Button type="submit" className="w-full" disabled={loading}>
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
