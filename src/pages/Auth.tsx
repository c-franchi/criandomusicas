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
        title: 'Erro de autenticação',
        description: errorDescription || error,
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

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
        title: 'Campos obrigatórios',
        description: 'Preencha email e senha.',
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
          errorMessage = 'Email ou senha incorretos. Verifique seus dados.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
        }
        
        toast({
          title: 'Erro no login',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo de volta!',
        });
      }
    } catch (err) {
      console.error('Sign in error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
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
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
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
          errorMessage = 'Este email já está cadastrado. Tente fazer login.';
        } else if (error.message.includes('valid email')) {
          errorMessage = 'Digite um email válido.';
        }
        
        toast({
          title: 'Erro no cadastro',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Você já está logado.',
        });
      }
    } catch (err) {
      console.error('Sign up error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
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
        title: 'Email obrigatório',
        description: 'Digite seu email para recuperar a senha.',
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
        let errorMessage = 'Não foi possível enviar o email. Tente novamente.';
        if (error.message?.includes('rate limit')) {
          errorMessage = 'Aguarde alguns segundos antes de solicitar novamente.';
        }
        toast({
          title: 'Erro ao enviar email',
          description: errorMessage,
          variant: 'destructive',
        });
      } else if (data?.error) {
        console.error('Email send error:', data.error);
        toast({
          title: 'Erro ao enviar email',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
        setForgotPasswordMode(false);
        setResetEmail('');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente.',
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
        title: 'Campos obrigatórios',
        description: 'Preencha a nova senha e a confirmação.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
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
          title: 'Sessão expirada',
          description: 'O link de recuperação expirou ou já foi usado. Solicite um novo link.',
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
          errorMessage = 'Sessão expirada. Solicite um novo link de recuperação.';
        }
        toast({
          title: 'Erro ao redefinir senha',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Senha alterada!',
          description: 'Sua nova senha foi definida com sucesso. Faça login com a nova senha.',
        });
        setResetPasswordMode(false);
        setNewPassword('');
        setConfirmPassword('');
        // Sign out and redirect to login
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Reset password error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente.',
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
              <h1 className="text-2xl font-bold gradient-text">Criando Músicas</h1>
            </div>
            <p className="text-muted-foreground">
              Defina sua nova senha
            </p>
          </div>

          <Card className="glass-card border-border/50">
            <CardHeader className="text-center">
              <CardTitle>Redefinir Senha</CardTitle>
              <CardDescription>
                Digite e confirme sua nova senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
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
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
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
                      Salvando...
                    </>
                  ) : (
                    'Salvar Nova Senha'
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
                  Cancelar
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
            Voltar ao início
          </Link>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Criando Músicas</h1>
          </div>
          <p className="text-muted-foreground">
            Entre ou crie sua conta para começar
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader className="text-center">
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              Entre ou cadastre-se para criar suas músicas personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                {forgotPasswordMode ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
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
                          Enviando...
                        </>
                      ) : (
                        'Enviar link de recuperação'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setForgotPasswordMode(false)}
                    >
                      Voltar ao login
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          name="password"
                          type={showSignInPassword ? "text" : "password"}
                          placeholder="••••••••"
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
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="w-full text-sm"
                      onClick={() => setForgotPasswordMode(true)}
                    >
                      Esqueci minha senha
                    </Button>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="Seu nome"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="••••••••"
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
                    <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
