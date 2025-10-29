import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Video, FileText, MessageCircle } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactSupport?: () => void;
}

const faqs = [
  {
    category: 'Primeiros Passos',
    icon: BookOpen,
    questions: [
      {
        q: 'Como adicionar minha primeira loja?',
        a: 'Clique no botão "Adicionar Loja" e preencha as informações da sua loja. Você precisará fornecer o nome da loja, plataforma (Shopify, WooCommerce, etc.) e as credenciais de API.'
      },
      {
        q: 'Como conectar minha loja?',
        a: 'Após adicionar a loja, clique em "Conectar" no card da loja. O sistema irá validar suas credenciais e sincronizar os dados automaticamente.'
      },
      {
        q: 'Quanto tempo leva para sincronizar os dados?',
        a: 'A sincronização inicial pode levar de 5 a 15 minutos, dependendo do volume de dados da sua loja. Você pode acompanhar o progresso em tempo real.'
      }
    ]
  },
  {
    category: 'Trocas e Devoluções',
    icon: FileText,
    questions: [
      {
        q: 'Como configurar o formulário de trocas?',
        a: 'Acesse "Formulário Portal" no menu lateral, vá até a aba "Trocas e Devoluções" e configure os campos, regras de elegibilidade e aparência do formulário.'
      },
      {
        q: 'Como personalizar as cores do formulário público?',
        a: 'Na aba de configurações do formulário, você encontrará opções de personalização de tema. Defina a cor primária e o formulário se adaptará automaticamente.'
      },
      {
        q: 'Os clientes precisam fazer login para solicitar troca?',
        a: 'Não necessariamente. Você pode configurar o formulário para aceitar solicitações apenas com número do pedido e email, ou exigir autenticação para mais segurança.'
      }
    ]
  },
  {
    category: 'Reembolsos',
    icon: FileText,
    questions: [
      {
        q: 'Como ativar o sistema de reembolsos?',
        a: 'Vá até "Formulário Portal", aba "Reembolsos", e configure os métodos de pagamento disponíveis (PIX, Transferência, Cartão) e as regras de elegibilidade.'
      },
      {
        q: 'Posso definir limites de valor para aprovação automática?',
        a: 'Sim! Nas configurações de reembolso, você pode definir um valor limite. Reembolsos abaixo desse valor podem ser aprovados automaticamente.'
      },
      {
        q: 'Como adicionar campos personalizados no formulário?',
        a: 'Na seção "Campos do Formulário", clique em "Adicionar Campo" e escolha o tipo (texto, email, telefone, etc.). Você pode marcar como obrigatório ou opcional.'
      }
    ]
  },
  {
    category: 'Dashboard e Relatórios',
    icon: Video,
    questions: [
      {
        q: 'O que significam as métricas no dashboard?',
        a: 'O dashboard mostra métricas como receita total, número de pedidos, taxa de conversão e canais de venda. Você pode filtrar por período (7, 30, 90 dias, etc.).'
      },
      {
        q: 'Como exportar relatórios?',
        a: 'Em breve teremos funcionalidade de exportação em PDF e Excel. Por enquanto, você pode visualizar todas as métricas diretamente no dashboard.'
      }
    ]
  },
  {
    category: 'Conta e Segurança',
    icon: MessageCircle,
    questions: [
      {
        q: 'Como alterar minha senha?',
        a: 'Acesse as configurações da sua conta clicando no seu nome no menu superior. Lá você encontrará a opção "Alterar Senha".'
      },
      {
        q: 'É seguro conectar minhas lojas?',
        a: 'Sim! Utilizamos criptografia de ponta a ponta e nunca armazenamos senhas. Apenas tokens de API são salvos de forma segura.'
      },
      {
        q: 'Posso ter múltiplos usuários na mesma conta?',
        a: 'Esta funcionalidade está em desenvolvimento. Em breve você poderá convidar membros da equipe com diferentes níveis de permissão.'
      }
    ]
  }
];

export function HelpModal({ open, onOpenChange, onContactSupport }: HelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Central de Ajuda</DialogTitle>
          <DialogDescription>
            Encontre respostas para as perguntas mais comuns sobre a plataforma
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ajuda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* FAQs */}
        <div className="space-y-6 mt-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2">
                  <category.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">{category.category}</h3>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, qIdx) => (
                    <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                      <AccordionTrigger className="text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum resultado encontrado para "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Contact Support CTA */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Não encontrou o que procura?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Nossa equipe está pronta para ajudar você com qualquer dúvida.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onContactSupport?.();
                }}
                className="w-full sm:w-auto"
              >
                Falar com Suporte
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
