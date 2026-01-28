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
  const type = hashParams.get('type');
  return type === 'recovery';
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
  // Initialize synchronously to catch recovery mode before auth redirect
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

  // Clean up URL hash AFTER session is confirmed (delay to let Supabase process)
  useEffect(() => {
    if (resetPasswordMode && window.location.hash.includes('type=recovery')) {
      // Delay hash cleanup to ensure Supabase has processed the token
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

  // Redirect if already authenticated (and not in reset password mode or recovery session)
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
        description: t('errors.unexpectedError'),
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
        description: t('errors.passwordTooShort'),
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
        
        // Send welcome email (don't block on failure)
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: { email, userName: name }
          });
          console.log('Welcome email sent successfully');
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't show error to user - welcome email is non-critical
        }
      }
    } catch (err) {
      console.error('Sign up error:', err);
      toast({
        title: t('errors.unexpectedError'),
        description: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://criandomusicas.com.br/',
        },
      });

      if (error) {
        toast({
          title: t('errors.googleError'),
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      toast({
        title: t('errors.unexpectedError'),
        description: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
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
      const redirectUrl = `${window.location.origin}/auth`;
      
      // Call custom Edge Function to send branded Portuguese email
      const { data, error } = await supabase.functions.invoke('send-recovery-email', {
        body: { email, redirectUrl },
      });

      if (error) {
        console.error('Edge function error:', error);
        let errorMessage = t('errors.sendEmailError');
        if (error.message?.includes('rate limit')) {
          errorMessage = t('errors.rateLimited');
        }
        toast({
          title: t('errors.authError'),
          description: errorMessage,
          variant: 'destructive',
        });
      } else if (data?.error) {
        console.error('Email send error:', data.error);
        toast({
          title: t('errors.authError'),
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('success.emailSent'),
          description: t('success.checkInbox'),
        });
        setForgotPasswordMode(false);
        setResetEmail('');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      toast({
        title: t('errors.unexpectedError'),
        description: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      toast({
        title: t('errors.requiredFields'),
        description: t('errors.fillAllFields'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('errors.passwordMismatch'),
        description: t('errors.passwordMismatch'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('errors.passwordTooShort'),
        description: t('errors.passwordTooShort'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // CRITICAL: Verify session exists before attempting to update password
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t('errors.sessionExpired'),
          description: t('errors.sessionExpired'),
          variant: 'destructive',
        });
        setResetPasswordMode(false);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('session missing') || error.message.includes('Auth session missing')) {
          errorMessage = t('errors.sessionExpired');
        }
        toast({
          title: t('errors.authError'),
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        // Sign out first to clear recovery session
        await supabase.auth.signOut();
        
        // Reset all state
        setResetPasswordMode(false);
        setNewPassword('');
        setConfirmPassword('');
        toast({
          title: t('success.passwordChanged'),
          description: t('success.passwordChangedLogin'),
        });
        
        // Show login form - already reset state above
      }
    } catch (err) {
      console.error('Reset password error:', err);
      toast({
        title: t('errors.unexpectedError'),
        description: t('errors.unexpectedError'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  // Reset password form
  if (resetPasswordMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Music className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">{t('brand')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('recovery.subtitle')}
            </p>
          </div>

          <Card className="glass-card border-border/50">
            <CardHeader className="text-center">
              <CardTitle>{t('recovery.title')}</CardTitle>
              <CardDescription>
                {t('recovery.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('recovery.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('recovery.confirmPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('recovery.submitting')}
                    </>
                  ) : (
                    t('recovery.submit')
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setResetPasswordMode(false);
                    supabase.auth.signOut();
                  }}
                >
                  {t('recovery.cancel')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToHome')}
          </Link>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">{t('brand')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('accessSubtitle')}
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader className="text-center">
            <CardTitle>{t('accessAccount')}</CardTitle>
            <CardDescription>
              {t('accessSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('login.tab')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signup.tab')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                {forgotPasswordMode ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">{t('recovery.emailLabel')}</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('recovery.sending')}
                        </>
                      ) : (
                        t('recovery.sendLink')
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setForgotPasswordMode(false)}
                    >
                      {t('recovery.backToLogin')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">{t('login.email')}</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">{t('login.password')}</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          name="password"
                          type={showSignInPassword ? "text" : "password"}
                          placeholder={t('login.passwordPlaceholder')}
                          autoComplete="current-password"
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('login.submitting')}
                        </>
                      ) : (
                        t('login.submit')
                      )}
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
                )}
                
                {/* Google Sign In */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('login.orContinueWith')}</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('login.googleLogin')}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('signup.name')}</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder={t('signup.namePlaceholder')}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('signup.email')}</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder={t('signup.emailPlaceholder')}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('signup.password')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder={t('signup.passwordPlaceholder')}
                        autoComplete="new-password"
                        minLength={6}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('signup.passwordHint')}</p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('signup.submitting')}
                      </>
                    ) : (
                      t('signup.submit')
                    )}
                  </Button>
                </form>
                
                {/* Google Sign Up */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('signup.orSignupWith')}</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('signup.googleSignup')}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
