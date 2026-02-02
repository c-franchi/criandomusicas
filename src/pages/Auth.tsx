import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Music, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Detect recovery mode synchronously on initial load
const getInitialResetMode = () => {
  if (typeof window === 'undefined') return false;
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  return hashParams.get('type') === 'recovery';
};

const Auth = () => {
  const { user, loading: authLoading, signIn, signUp, isRecoverySession } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(getInitialResetMode);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sync recovery session from auth context
  useEffect(() => {
    if (isRecoverySession && !resetPasswordMode) {
      setResetPasswordMode(true);
    }
  }, [isRecoverySession, resetPasswordMode]);

  // Handle OAuth callback - capture tokens from URL hash
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const currentHash = window.location.hash;
      if (!currentHash) return;

      const hashParams = new URLSearchParams(currentHash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Check if this is a token transfer from OAuth
      if (accessToken && refreshToken) {
        console.log('[Auth] Token transfer detected, establishing session...');

        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('[Auth] Failed to set session:', error);
            toast({
              title: t('errors.authError'),
              description: error.message,
              variant: 'destructive',
            });
            window.history.replaceState(null, '', '/auth');
            return;
          }

          if (data.session?.user) {
            console.log('[Auth] Session established for:', data.session.user.email);
            window.history.replaceState(null, '', '/');
            window.location.href = '/';
            return;
          }
        } catch (err) {
          console.error('[Auth] Error setting session:', err);
          window.history.replaceState(null, '', '/auth');
        }
      }
    };

    handleOAuthCallback();
  }, [toast, t]);

  // Clean up URL hash after recovery mode is detected
  useEffect(() => {
    if (resetPasswordMode && window.location.hash.includes('type=recovery')) {
      const timer = setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resetPasswordMode]);

  // Check for error in URL params
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      toast({
        title: t('errors.authError'),
        description: errorDescription || error,
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, t]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if already authenticated
  if (user && !resetPasswordMode && !isRecoverySession) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        title: t('errors.requiredFields'),
        description: t('errors.fillEmailPassword'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('errors.invalidCredentials');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('errors.emailNotConfirmed');
        }
        
        toast({
          title: t('errors.authError'),
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('success.login'),
          description: t('success.loginWelcome'),
        });
      }
    } catch (err) {
      console.error('Sign in error:', err);
      toast({
        title: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const password = formData.get('password') as string;
    const name = (formData.get('name') as string).trim();

    if (!email || !password || !name) {
      toast({
        title: t('errors.requiredFields'),
        description: t('errors.fillAllFields'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('errors.passwordTooShort'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, name);

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = t('errors.emailInUse');
        } else if (error.message.includes('valid email')) {
          errorMessage = t('errors.validEmail');
        }
        
        toast({
          title: t('errors.authError'),
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('success.signup'),
          description: t('success.signupLoggedIn'),
        });
        
        // Send welcome email
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: { email, userName: name }
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }
    } catch (err) {
      console.error('Sign up error:', err);
      toast({
        title: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  // Google Sign In - uses native Supabase OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      console.log('[Auth] Starting Google OAuth with Supabase');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            prompt: 'select_account', // Force account selection every time
            access_type: 'offline'
          }
        }
      });

      if (error) {
        console.error('[Auth] Google OAuth error:', error);
        toast({
          title: t('errors.googleError'),
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
      }
      // Note: Don't setLoading(false) on success - browser will navigate away
    } catch (err) {
      console.error('[Auth] Google sign in error:', err);
      toast({
        title: t('errors.unexpectedError'),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const email = resetEmail.trim().toLowerCase();
    
    if (!email) {
      toast({
        title: t('errors.emailRequired'),
        description: t('errors.fillEmailToReset'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-recovery-email', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: t('forgot.emailSent'),
        description: t('forgot.checkInbox'),
      });
      setForgotPasswordMode(false);
      setResetEmail('');
    } catch (err) {
      console.error('Password reset error:', err);
      toast({
        title: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      toast({
        title: t('reset.passwordMismatch'),
        description: t('reset.passwordMismatchDesc'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('errors.passwordTooShort'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: t('reset.success'),
        description: t('reset.successDesc'),
      });

      setResetPasswordMode(false);
      setNewPassword('');
      setConfirmPassword('');
      
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (err) {
      console.error('Password update error:', err);
      toast({
        title: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  // Reset Password Mode
  if (resetPasswordMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md premium-card">
          <CardHeader className="text-center pb-4">
            <Link to="/" className="flex items-center justify-center gap-2 mb-4">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">Criando Músicas</span>
            </Link>
            <CardTitle className="text-2xl">{t('reset.title')}</CardTitle>
            <CardDescription>{t('reset.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('reset.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('reset.newPasswordPlaceholder')}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('reset.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('reset.confirmPasswordPlaceholder')}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? t('recovery.submitting') : t('recovery.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot Password Mode
  if (forgotPasswordMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md premium-card">
          <CardHeader className="text-center pb-4">
            <Link to="/" className="flex items-center justify-center gap-2 mb-4">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">Criando Músicas</span>
            </Link>
            <CardTitle className="text-2xl">{t('forgotPassword.title')}</CardTitle>
            <CardDescription>{t('forgotPassword.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">{t('login.email')}</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? t('recovery.sending') : t('recovery.sendLink')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setForgotPasswordMode(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('forgotPassword.backToLogin')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Auth Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center pb-4">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <Music className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold gradient-text">Criando Músicas</span>
          </Link>
          <CardTitle className="text-2xl">{t('accessAccount')}</CardTitle>
          <CardDescription>{t('accessSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Sign In Button */}
          <Button
            variant="outline"
            className="w-full mb-6 h-12 text-base"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {t('login.googleLogin')}
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('login.orContinueWith')}</span>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">{t('login.tab')}</TabsTrigger>
              <TabsTrigger value="signup">{t('signup.tab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('login.email')}</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('login.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      name="password"
                      type={showSignInPassword ? 'text' : 'password'}
                      placeholder={t('login.passwordPlaceholder')}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                    >
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t('login.submit')}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setForgotPasswordMode(true)}
                >
                  {t('login.forgotPassword')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('signup.name')}</Label>
                  <Input
                    id="signup-name"
                    name="name"
                    type="text"
                    placeholder={t('signup.namePlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('login.email')}</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('login.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder={t('signup.passwordPlaceholder')}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    >
                      {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t('signup.submit')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Ao continuar, você concorda com os{' '}
            <Link to="/termos-de-uso" className="text-primary hover:underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link to="/politica-de-privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
