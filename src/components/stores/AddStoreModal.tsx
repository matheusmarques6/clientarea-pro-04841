import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store, ExternalLink, Info, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateStoreFormData, COUNTRIES, CURRENCIES, STORE_STATUS } from '@/types/store';

interface AddStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome da loja é obrigatório'),
  country: z.string().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  klaviyo_private_key: z.string().optional(),
  klaviyo_site_id: z.string().optional(),
  shopify_access_token: z.string().optional(),
  shopify_domain: z.string().optional(),
}).refine((data) => {
  // Se preencheu klaviyo_private_key, deve preencher klaviyo_site_id
  if (data.klaviyo_private_key && !data.klaviyo_site_id) {
    return false;
  }
  if (data.klaviyo_site_id && !data.klaviyo_private_key) {
    return false;
  }
  return true;
}, {
  message: "Preencha ambos: Private Key e Site ID do Klaviyo",
  path: ["klaviyo_site_id"],
}).refine((data) => {
  // Se preencheu shopify_access_token, deve preencher shopify_domain
  if (data.shopify_access_token && !data.shopify_domain) {
    return false;
  }
  if (data.shopify_domain && !data.shopify_access_token) {
    return false;
  }
  return true;
}, {
  message: "Preencha ambos: Access Token e Domain do Shopify",
  path: ["shopify_domain"],
}).refine((data) => {
  // Validar formato do domínio Shopify
  if (data.shopify_domain && !data.shopify_domain.includes('.myshopify.com')) {
    return false;
  }
  return true;
}, {
  message: "Domínio deve conter '.myshopify.com' (ex: minhaloja.myshopify.com)",
  path: ["shopify_domain"],
});

export default function AddStoreModal({ open, onOpenChange, onSuccess }: AddStoreModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKlaviyoKey, setShowKlaviyoKey] = useState(false);
  const [showShopifyToken, setShowShopifyToken] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      country: 'BR',
      currency: 'BRL',
      status: 'active',
      klaviyo_private_key: '',
      klaviyo_site_id: '',
      shopify_access_token: '',
      shopify_domain: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      // Verificar se tem credenciais completas
      const hasKlaviyo = values.klaviyo_private_key && values.klaviyo_site_id;
      const hasShopify = values.shopify_access_token && values.shopify_domain;
      const hasAnyCredentials = hasKlaviyo || hasShopify;

      const dataToInsert: CreateStoreFormData = {
        name: values.name,
        country: values.country || null,
        currency: values.currency || 'BRL',
        status: values.status || 'active',
        first_sync_pending: hasAnyCredentials, // Marcar se precisa sincronizar
      };

      // Adicionar credenciais apenas se preenchidas
      if (hasKlaviyo) {
        dataToInsert.klaviyo_private_key = values.klaviyo_private_key;
        dataToInsert.klaviyo_site_id = values.klaviyo_site_id;
      }

      if (hasShopify) {
        dataToInsert.shopify_access_token = values.shopify_access_token;
        dataToInsert.shopify_domain = values.shopify_domain;
      }

      const { data, error } = await supabase
        .from('stores')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) {
        console.error('Error creating store:', error);
        throw new Error(error.message);
      }

      // Criar vínculo do usuário atual como owner da loja
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        const { error: memberError } = await supabase
          .from('store_members')
          .insert({
            user_id: user.id,
            store_id: data.id,
            role: 'owner'
          });

        if (memberError) {
          console.error('Error creating store member link:', memberError);
          // Não falhar a operação, apenas logar o erro
        }
      }

      toast.success('Loja criada com sucesso!', {
        description: `${values.name} foi adicionada à sua conta.`,
      });

      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error in onSubmit:', error);
      toast.error('Erro ao criar loja', {
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Adicionar Nova Loja
          </DialogTitle>
          <DialogDescription>
            Preencha as informações da loja e configure as credenciais de API para sincronização.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção 1: Informações Básicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Informações Básicas</h3>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Loja *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Minha Loja" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moeda</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STORE_STATUS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Seção 2: Credenciais (Accordion) */}
            <Accordion type="multiple" className="w-full">
              {/* Klaviyo */}
              <AccordionItem value="klaviyo">
                <AccordionTrigger className="text-sm font-semibold">
                  🔑 Credenciais Klaviyo (Opcional)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Configure as credenciais do Klaviyo para sincronizar dados de campanhas e flows.
                      <a
                        href="https://help.klaviyo.com/hc/en-us/articles/115005062267"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline mt-2"
                      >
                        Como obter minhas credenciais?
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="klaviyo_private_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Klaviyo Private Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showKlaviyoKey ? "text" : "password"}
                              placeholder="pk_..."
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowKlaviyoKey(!showKlaviyoKey)}
                            >
                              {showKlaviyoKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Sua chave privada de API do Klaviyo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="klaviyo_site_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Klaviyo Site ID</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC123" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          ID do seu site no Klaviyo (6 caracteres)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Shopify */}
              <AccordionItem value="shopify">
                <AccordionTrigger className="text-sm font-semibold">
                  🛒 Credenciais Shopify (Opcional)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Configure as credenciais do Shopify para sincronizar dados de pedidos e produtos.
                      <a
                        href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline mt-2"
                      >
                        Como criar um app customizado?
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="shopify_access_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shopify Access Token</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showShopifyToken ? "text" : "password"}
                              placeholder="shpat_..."
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowShopifyToken(!showShopifyToken)}
                            >
                              {showShopifyToken ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Token de acesso da Admin API do Shopify
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shopify_domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shopify Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="minhaloja.myshopify.com" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Domínio da sua loja Shopify (inclua .myshopify.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Botões de ação */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Criando...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  'Criar Loja'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
