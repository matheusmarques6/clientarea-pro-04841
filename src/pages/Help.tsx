import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Help = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const faqSections = [
    {
      id: 'geral',
      title: 'Perguntas Gerais',
      questions: [
        {
          q: 'Como funciona o Convertfy?',
          a: 'O Convertfy é uma plataforma que ajuda você a gerenciar trocas, devoluções e reembolsos de forma automatizada, melhorando a experiência do cliente e otimizando seus processos.'
        },
        {
          q: 'Como integrar com minha loja Shopify?',
          a: 'Acesse Configurações > Integrações e insira a URL da sua loja e o access token do Shopify. Nossa plataforma irá sincronizar automaticamente os produtos e pedidos.'
        },
        {
          q: 'Posso personalizar as mensagens enviadas aos clientes?',
          a: 'Sim! Em Configurações > Templates você pode personalizar todas as mensagens de e-mail, SMS e WhatsApp enviadas aos clientes.'
        }
      ]
    },
    {
      id: 'trocas',
      title: 'Trocas & Devoluções',
      questions: [
        {
          q: 'Como criar um link público para trocas?',
          a: 'Vá em Trocas & Devoluções > Configurar Link Público. Defina as regras de elegibilidade e personalize as mensagens. O link será gerado automaticamente.'
        },
        {
          q: 'Como funciona a aprovação automática?',
          a: 'Você pode configurar regras para aprovar automaticamente solicitações que estejam dentro da janela de tempo e atendam aos critérios definidos (ex: pedido com fotos).'
        },
        {
          q: 'Posso reverter o status de uma solicitação?',
          a: 'Sim! Em qualquer momento você pode voltar uma solicitação para um status anterior. Basta clicar em "Reverter etapa" e justificar a ação.'
        }
      ]
    },
    {
      id: 'reembolsos',
      title: 'Reembolsos',
      questions: [
        {
          q: 'Quais métodos de reembolso são suportados?',
          a: 'Suportamos reembolso via cartão de crédito, PIX, boleto e vale-compra. O cliente pode escolher o método preferido.'
        },
        {
          q: 'Como configurar a aprovação automática de reembolsos?',
          a: 'Em Reembolsos > Configurar Link Público, defina um valor limite. Reembolsos até esse valor serão aprovados automaticamente se atenderem aos critérios.'
        },
        {
          q: 'Quanto tempo demora para processar um reembolso?',
          a: 'O tempo varia conforme o método: PIX (até 24h), Cartão (5-7 dias úteis), Vale-compra (imediato). O cliente é notificado sobre o prazo.'
        }
      ]
    },
    {
      id: 'custos',
      title: 'Custo de Produto',
      questions: [
        {
          q: 'Como importar custos de produtos?',
          a: 'Você pode importar via CSV ou definir custos diretamente na tabela. Também é possível usar regras automáticas como "custo = 50% do preço".'
        },
        {
          q: 'Como funcionam as conversões de moeda?',
          a: 'Utilizamos taxas de câmbio em tempo real (ou mock) para converter custos entre BRL, USD, EUR e GBP. As taxas são atualizadas automaticamente.'
        },
        {
          q: 'O custo de produto afeta o cálculo de lucro?',
          a: 'Sim! Se a flag INCLUDE_PRODUCT_COST estiver ativa, os custos são deduzidos do lucro líquido Convertfy mostrado no dashboard.'
        }
      ]
    }
  ];

  const filteredSections = faqSections.map(section => ({
    ...section,
    questions: section.questions.filter(
      q => 
        q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.questions.length > 0);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Central de Ajuda</h1>
            <p className="text-muted-foreground">
              Encontre respostas para as principais dúvidas sobre o Convertfy
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na central de ajuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {filteredSections.map((section) => (
            <Card key={section.id} className="glass-card">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.questions.map((faq, index) => (
                  <Collapsible
                    key={`${section.id}-${index}`}
                    open={openSections[`${section.id}-${index}`]}
                    onOpenChange={() => toggleSection(`${section.id}-${index}`)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50"
                      >
                        <span className="font-medium">{faq.q}</span>
                        {openSections[`${section.id}-${index}`] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.a}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {searchTerm && filteredSections.length === 0 && (
          <Card className="glass-card">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum resultado encontrado para "{searchTerm}"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tente usar palavras-chave diferentes ou mais gerais
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Support */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Não encontrou o que procurava?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nossa equipe de suporte está sempre pronta para ajudar você.
            </p>
            <div className="flex items-center gap-4">
              <Button>
                Entrar em Contato
              </Button>
              <Button variant="outline">
                Agendar Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;