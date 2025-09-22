import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('useAuth: Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth: Auth state changed', { 
          event, 
          user: session?.user,
          sessionExists: !!session 
        });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: Initial session check', { 
        user: session?.user,
        sessionExists: !!session 
      });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Defer reconciliation if already signed in (avoids deadlocks in callback)
      if (session?.user?.email) {
        setTimeout(() => {
          (async () => {
            try {
              await supabase.rpc('reconcile_user_profile', {
                _email: session.user!.email as string,
                _auth_id: session.user!.id,
                _name: (session.user!.user_metadata?.full_name as string) || ((session.user!.email as string).split('@')[0] || 'Usuário')
              });
            } catch (e) {
              console.warn('Reconcile on init failed:', e);
            }
          })();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      let { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && /not confirmed/i.test(error.message)) {
        // Try to auto-confirm and retry once
        try {
          await supabase.functions.invoke('admin-confirm-email', { body: { email } });
          const retry = await supabase.auth.signInWithPassword({ email, password });
          error = retry.error;
        } catch (e) {
          // ignore
        }
      }

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { error: error.message };
      }

      toast({
        title: "Login realizado",
        description: "Bem-vindo de volta!",
      });

      // Ensure user profile is reconciled with auth ID and linked memberships
      try {
        const { data: userInfo } = await supabase.auth.getUser();
        const authUser = userInfo.user;
        if (authUser && authUser.email) {
          await supabase.rpc('reconcile_user_profile', {
            _email: authUser.email,
            _auth_id: authUser.id,
            _name: (authUser.user_metadata?.full_name as string) || (authUser.email?.split('@')[0] || 'Usuário')
          });
        }
      } catch (e) {
        console.warn('Could not reconcile public.users profile:', e);
      }

      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro no login",
        description: message,
        variant: "destructive",
      });
      return { error: message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Conta já existe",
            description: "Este email já possui uma conta. Tente fazer login.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no cadastro",
            description: error.message,
            variant: "destructive",
          });
        }
        return { error: error.message };
      }

      toast({
        title: "Conta criada",
        description: "Cadastro realizado com sucesso!",
      });

      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro no cadastro",
        description: message,
        variant: "destructive",
      });
      return { error: message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Erro no logout",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Logout realizado",
          description: "Até logo!",
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
};

export { AuthContext };