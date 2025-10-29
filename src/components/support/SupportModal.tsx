import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
    priority: 'medium',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      // Validação
      if (!formData.subject || !formData.category || !formData.description) {
        throw new Error('Por favor, preencha todos os campos obrigatórios.');
      }

      // Criar ticket no Supabase
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id,
        user_email: user?.email,
        subject: formData.subject,
        category: formData.category,
        description: formData.description,
        priority: formData.priority,
        status: 'open',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setStatus('success');

      // Limpar formulário após 2 segundos e fechar modal
      setTimeout(() => {
        setFormData({
          subject: '',
          category: '',
          description: '',
          priority: 'medium',
        });
        setStatus('idle');
        onOpenChange(false);
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao enviar ticket:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro ao enviar solicitação. Tente novamente.');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Falar com Suporte</DialogTitle>
          <DialogDescription>
            Descreva seu problema ou dúvida e nossa equipe retornará em breve
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Solicitação Enviada!</h3>
            <p className="text-muted-foreground">
              Recebemos sua mensagem e nossa equipe entrará em contato em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Categoria <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Problema Técnico</SelectItem>
                  <SelectItem value="billing">Financeiro/Cobrança</SelectItem>
                  <SelectItem value="feature">Solicitação de Recurso</SelectItem>
                  <SelectItem value="integration">Integração de Loja</SelectItem>
                  <SelectItem value="returns">Trocas e Devoluções</SelectItem>
                  <SelectItem value="refunds">Reembolsos</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Assunto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="Resumo do problema ou dúvida"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {formData.subject.length}/100 caracteres
              </p>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva detalhadamente seu problema ou dúvida..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={6}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000 caracteres
              </p>
            </div>

            {/* Error Alert */}
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={status === 'loading'}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="min-w-[120px]"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
