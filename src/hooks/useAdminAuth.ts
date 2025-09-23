import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminUser } from '@/types/admin';

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  checkAdminAccess: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const useAdminAuthState = () => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const mounted = useRef(false);

  useEffect(() => {
    // Check if we're on admin route
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    if (!isAdminRoute) {
      setAdminUser(null);
      setLoading(false);
      return;
    }

    if (mounted.current) return; // evita duplicar no StrictMode
    mounted.current = true;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    
    (async () => {
      try {
        console.log('useAdminAuth: Setting up admin auth state listener');
        
        // Get initial session first
        const { data: { session } } = await supabase.auth.getSession();
        console.log('useAdminAuth: Initial session check', { user: session?.user });
        
        if (session?.user && !cancelled) {
          await checkIfUserIsAdmin(session.user.id, cancelled);
        } else if (!cancelled) {
          setAdminUser(null);
          setLoading(false);
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('useAdminAuth: Auth state changed', { event, user: session?.user });
            
            if (session?.user && !cancelled) {
              // Use setTimeout to defer Supabase calls and prevent deadlock
              setTimeout(() => {
                checkIfUserIsAdmin(session.user.id, cancelled);
              }, 0);
            } else if (!cancelled) {
              setAdminUser(null);
              setLoading(false);
            }
          }
        );
        
        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        console.warn('useAdminAuth init error', error);
        if (!cancelled) {
          setAdminUser(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);


  const checkIfUserIsAdmin = async (userId: string, cancelled = false) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_admin', true)
        .maybeSingle(); // evita 406 com 0 linhas

      if (!cancelled) {
        if (error) {
          console.warn('Error checking admin status:', error);
          setAdminUser(null);
        } else if (user) {
          console.log('Admin user found:', user);
          setAdminUser(user as AdminUser);
        } else {
          setAdminUser(null);
        }
        setLoading(false);
      }
    } catch (error) {
      if (!cancelled) {
        console.warn('Error checking admin status:', error);
        setAdminUser(null);
        setLoading(false);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      // 1) Real authentication with Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast({
          title: "Credenciais inválidas",
          description: signInError.message || "Email ou senha incorretos.",
          variant: "destructive",
        });
        return { error: signInError.message };
      }

      const authUser = signInData?.user;
      if (!authUser) {
        toast({
          title: "Erro no login",
          description: "Não foi possível obter a sessão do usuário.",
          variant: "destructive",
        });
        return { error: "Sem sessão" };
      }

      // 2) Garantir que exista um perfil em public.users (o RLS permite inserir o próprio perfil)
      const { data: existingProfile, error: fetchOwnError } = await supabase
        .from('users')
        .select('id, is_admin')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchOwnError && fetchOwnError.code !== 'PGRST116') {
        // PGRST116 = No rows found (acceptable for maybeSingle)
        console.warn('Falha ao buscar perfil do próprio usuário:', fetchOwnError);
      }

      if (!existingProfile) {
        const defaultName = authUser.email?.split('@')[0] || 'Administrador';
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: defaultName,
            // is_admin será ajustado por trigger quando email === 'admin@convertfy.dev'
            is_admin: false,
          });
        if (insertError) {
          console.warn('Falha ao criar perfil do usuário:', insertError);
        }
      }

      // 3) Verificar se é admin após garantir o perfil
      const { data: adminRecord, error: adminCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .eq('is_admin', true)
        .maybeSingle(); // evita 406 com 0 linhas

      if (adminCheckError || !adminRecord) {
        // Caso ainda não seja admin, negar acesso
        toast({
          title: "Acesso negado",
          description: "Esta conta não tem permissões de administrador.",
          variant: "destructive",
        });
        return { error: "Acesso negado" };
      }

      setAdminUser(adminRecord as AdminUser);
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao painel administrativo!",
      });
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

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Sign out from Supabase if signed in
      await supabase.auth.signOut();
      
      setAdminUser(null);
      
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminAccess = async () => {
    if (!adminUser) return false;
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', adminUser.id)
        .eq('is_admin', true)
        .maybeSingle(); // evita 406 com 0 linhas

      return !!user && !error;
    } catch (error) {
      console.warn('Error checking admin access:', error);
      return false;
    }
  };

  return {
    adminUser,
    loading,
    signIn,
    signOut,
    checkAdminAccess,
  };
};

export { AdminAuthContext };