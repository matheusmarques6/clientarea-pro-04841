import { useState, useEffect, createContext, useContext } from 'react';
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

  useEffect(() => {
    console.log('useAdminAuth: Setting up admin auth state listener');
    
    // Check for existing admin session
    checkAdminSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAdminAuth: Auth state changed', { event, user: session?.user });
        
        if (session?.user) {
          await checkIfUserIsAdmin(session.user.id);
        } else {
          setAdminUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('useAdminAuth: Initial session check', { user: session?.user });
      
      if (session?.user) {
        await checkIfUserIsAdmin(session.user.id);
      } else {
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkIfUserIsAdmin = async (userId: string) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_admin', true)
        .single();

      if (error) {
        console.log('User is not an admin:', error);
        setAdminUser(null);
        return;
      }

      if (user) {
        console.log('Admin user found:', user);
        setAdminUser(user as AdminUser);
      } else {
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // First check if the user exists and is an admin
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_admin', true)
        .single();

      if (userError || !user) {
        toast({
          title: "Acesso negado",
          description: "Esta conta não tem permissões de administrador.",
          variant: "destructive",
        });
        return { error: "Acesso negado" };
      }

      // For demo purposes, we'll use a mock authentication
      // In production, you'd verify the password hash
      if (email === 'admin@convertfy.dev' && password === 'password123') {
        // Create a mock session - in production, this would be handled by proper auth
        setAdminUser(user as AdminUser);
        
        toast({
          title: "Login realizado",
          description: "Bem-vindo ao painel administrativo!",
        });
        
        return {};
      } else {
        toast({
          title: "Credenciais inválidas",
          description: "Email ou senha incorretos.",
          variant: "destructive",
        });
        return { error: "Credenciais inválidas" };
      }
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
        .single();

      return !!user && !error;
    } catch (error) {
      console.error('Error checking admin access:', error);
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