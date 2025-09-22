import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield } from 'lucide-react';
import convertfyLogo from '@/assets/convertfy-logo.png';

const AdminLogin = () => {
  const { adminUser, signIn, loading } = useAdminAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Redirect if already authenticated as admin
  if (adminUser) {
    return <Navigate to="/admin" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(formData.email, formData.password);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="layout-center bg-gradient-premium">
      <div className="layout-narrow">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <img 
            src={convertfyLogo} 
            alt="Convertfy" 
            className="mx-auto h-8 mb-4"
          />
          <h1 className="text-3xl font-bold heading-primary">Painel Administrativo</h1>
          <p className="text-subtle mt-2">Sistema de administração Convertfy</p>
        </div>

        <Card className="professional-card">
          <CardHeader className="text-center">
            <CardTitle>Acesso Administrativo</CardTitle>
            <CardDescription>
              Entre com suas credenciais de administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="admin@convertfy.dev"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus-ring"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" className="w-full btn-primary" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar no Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-subtle">
            Demo: use "admin@convertfy.dev" / "password123"
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;