# 📋 Plano de Execução: Adicionar Botão "Nova Loja"

## 🎯 Objetivo
Adicionar funcionalidade para que o usuário possa criar novas lojas diretamente da interface, preenchendo todos os dados necessários incluindo credenciais de API.

---

## 📊 Análise da Estrutura Atual

### Página Identificada
- **Arquivo**: `src/pages/StoreSelector.tsx`
- **Rota**: `/lojas` ou `/store-selector`
- **Componentes usados**:
  - `StoreCard` - Exibe cada loja
  - `StoreStats` - Estatísticas das lojas
  - `useStores()` - Hook para buscar lojas

### Campos da Tabela `stores` (do types.ts - linhas 1583-1642)

#### Campos Obrigatórios:
1. ✅ `name` (string) - Nome da loja

#### Campos de Credenciais API:
2. 🔑 `klaviyo_private_key` (string | null) - Chave privada Klaviyo
3. 🔑 `klaviyo_site_id` (string | null) - Site ID Klaviyo
4. 🔑 `shopify_access_token` (string | null) - Token Shopify
5. 🔑 `shopify_domain` (string | null) - Domínio Shopify (ex: minhaloja.myshopify.com)

#### Campos Opcionais/Metadata:
6. 📍 `country` (string | null) - País
7. 💰 `currency` (string | null) - Moeda (BRL, USD, EUR)
8. 🏢 `client_id` (string | null) - ID do cliente (relacionamento)
9. 👤 `customer_id` (string | null) - ID do customer
10. 📊 `status` (string | null) - Status da loja (active, inactive)

#### Campos Auto-gerados:
- `id` (string) - UUID gerado automaticamente
- `created_at` (string) - Timestamp automático

---

## 🏗️ Estrutura de Componentes a Criar

### 1. **AddStoreModal.tsx** (Novo componente)
**Localização**: `src/components/stores/AddStoreModal.tsx`

**Props**:
```typescript
interface AddStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

**Seções do Formulário**:

#### Seção 1: Informações Básicas
- Nome da Loja *
- País (select)
- Moeda (select: BRL, USD, EUR, GBP)
- Status (select: Ativa, Inativa)

#### Seção 2: Credenciais Klaviyo (Expansível/Accordion)
- Klaviyo Private Key (input password)
- Klaviyo Site ID (input text)
- Link para ajuda: "Como obter suas credenciais Klaviyo?"

#### Seção 3: Credenciais Shopify (Expansível/Accordion)
- Shopify Access Token (input password)
- Shopify Domain (input text com placeholder: "minhaloja.myshopify.com")
- Link para ajuda: "Como obter suas credenciais Shopify?"

#### Validações:
- Nome obrigatório
- Se preencher Klaviyo Key, Site ID também deve ser preenchido
- Se preencher Shopify Token, Domain também deve ser preenchido
- Validar formato do domínio Shopify (deve conter .myshopify.com)

---

## 📝 Passos de Implementação

### **Fase 1: Preparação** (Estimativa: 15 min)

#### 1.1 Criar tipo TypeScript para o formulário
**Arquivo**: `src/types/store.ts` (novo)
```typescript
export interface CreateStoreFormData {
  name: string;
  country?: string;
  currency?: string;
  status?: string;
  klaviyo_private_key?: string;
  klaviyo_site_id?: string;
  shopify_access_token?: string;
  shopify_domain?: string;
}
```

#### 1.2 Verificar hook existente
**Arquivo**: `src/hooks/useStores.ts`
- Verificar se já tem função `createStore`
- Se não tiver, adicionar

---

### **Fase 2: Criar Componente Modal** (Estimativa: 30 min)

#### 2.1 Criar arquivo do modal
**Arquivo**: `src/components/stores/AddStoreModal.tsx`

**Componentes UI a usar**:
- `Dialog` (shadcn/ui)
- `Form` + `react-hook-form` + `zod` (validação)
- `Input`
- `Select`
- `Button`
- `Accordion` (para seções expansíveis)
- `Label`
- `Alert` (para mensagens de ajuda)

**Estrutura**:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema de validação
const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  country: z.string().optional(),
  currency: z.string().optional(),
  // ... outros campos
}).refine(data => {
  // Se preencheu klaviyo_private_key, deve preencher klaviyo_site_id
  if (data.klaviyo_private_key && !data.klaviyo_site_id) {
    return false;
  }
  return true;
}, {
  message: "Se preencher Klaviyo Private Key, deve preencher Site ID também"
});
```

---

### **Fase 3: Adicionar Botão na Página** (Estimativa: 10 min)

#### 3.1 Modificar `StoreSelector.tsx`
**Linha aproximada**: 99 (após o título "Suas Lojas")

**Adicionar**:
```tsx
import { Plus } from 'lucide-react';
import { useState } from 'react';
import AddStoreModal from '@/components/stores/AddStoreModal';

// No componente:
const [showAddModal, setShowAddModal] = useState(false);

// No JSX (linha 99):
<div className="flex items-center justify-between">
  <h2 className="text-2xl font-semibold">
    Suas Lojas ({stores.length})
  </h2>
  <Button onClick={() => setShowAddModal(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Adicionar Loja
  </Button>
</div>

// Antes do fechamento do componente:
<AddStoreModal
  open={showAddModal}
  onOpenChange={setShowAddModal}
  onSuccess={() => {
    // Recarregar lista de lojas
    refetch();
  }}
/>
```

---

### **Fase 4: Implementar Lógica de Criação** (Estimativa: 20 min)

#### 4.1 Atualizar/Criar hook `useStores`
**Arquivo**: `src/hooks/useStores.ts`

**Adicionar função**:
```typescript
const createStore = async (data: CreateStoreFormData) => {
  const { data: newStore, error } = await supabase
    .from('stores')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return newStore;
};
```

#### 4.2 Usar no modal
```typescript
const { mutate: createStore, isLoading } = useMutation({
  mutationFn: (data: CreateStoreFormData) => {
    return supabase
      .from('stores')
      .insert([data])
      .select()
      .single();
  },
  onSuccess: () => {
    toast.success('Loja criada com sucesso!');
    onSuccess?.();
    onOpenChange(false);
  },
  onError: (error) => {
    toast.error(`Erro ao criar loja: ${error.message}`);
  }
});
```

---

### **Fase 5: Melhorias UX** (Estimativa: 15 min)

#### 5.1 Links de ajuda
- Adicionar links para documentação Klaviyo
- Adicionar links para documentação Shopify
- Tooltips explicativos em cada campo

#### 5.2 Validação visual
- Mostrar ícone de check verde quando campo válido
- Mostrar ícone de erro vermelho quando inválido
- Feedback em tempo real

#### 5.3 Loading states
- Botão "Criar Loja" com loading spinner
- Desabilitar formulário durante submit
- Mensagens de progresso

---

## 🔒 Segurança

### Considerações:
1. ✅ Campos de senha (API keys) devem ser `type="password"`
2. ✅ Validar permissões no backend (RLS do Supabase)
3. ✅ Nunca exibir valores de API keys depois de salvas
4. ✅ Adicionar confirmação antes de salvar credenciais
5. ⚠️ **IMPORTANTE**: Garantir que apenas usuários autorizados podem criar lojas

### RLS (Row Level Security) - Supabase
```sql
-- Política para INSERT em stores
CREATE POLICY "Authenticated users can insert stores"
  ON stores
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

---

## 🎨 Design/UI

### Componentes Shadcn a usar:
- [x] Dialog
- [x] Form
- [x] Input
- [x] Select
- [x] Button
- [x] Label
- [x] Accordion
- [x] Alert
- [x] Badge
- [x] Separator

### Layout do Modal:
```
┌─────────────────────────────────────┐
│  Adicionar Nova Loja           [X]  │
├─────────────────────────────────────┤
│                                     │
│  📋 Informações Básicas             │
│  ├─ Nome da Loja *                  │
│  ├─ País                            │
│  ├─ Moeda                           │
│  └─ Status                          │
│                                     │
│  🔑 Credenciais Klaviyo [▼]         │
│  (expandido quando clicado)         │
│  ├─ Private Key                     │
│  ├─ Site ID                         │
│  └─ 💡 Como obter?                  │
│                                     │
│  🛒 Credenciais Shopify [▼]         │
│  ├─ Access Token                    │
│  ├─ Domain                          │
│  └─ 💡 Como obter?                  │
│                                     │
│  [Cancelar]  [Criar Loja]           │
└─────────────────────────────────────┘
```

---

## 📦 Arquivos a Criar/Modificar

### Criar:
1. ✅ `src/components/stores/AddStoreModal.tsx` - Modal principal
2. ✅ `src/types/store.ts` - Tipos TypeScript (se não existir)

### Modificar:
1. ✅ `src/pages/StoreSelector.tsx` - Adicionar botão e modal
2. ✅ `src/hooks/useStores.ts` - Adicionar função createStore (se não existir)

---

## ✅ Checklist de Validação

Antes de marcar como concluído:

### Funcionalidade:
- [ ] Botão "Adicionar Loja" aparece na página
- [ ] Modal abre ao clicar no botão
- [ ] Formulário valida campos obrigatórios
- [ ] Campos de senha estão mascarados
- [ ] Select de país funciona
- [ ] Select de moeda funciona
- [ ] Accordion de credenciais abre/fecha
- [ ] Submit cria loja no banco
- [ ] Lista de lojas atualiza após criação
- [ ] Modal fecha após sucesso
- [ ] Mensagens de erro aparecem

### Segurança:
- [ ] API keys não ficam visíveis após salvar
- [ ] RLS policies estão configuradas
- [ ] Validação no frontend funciona
- [ ] Apenas usuários autenticados podem criar

### UX:
- [ ] Loading state durante submit
- [ ] Mensagem de sucesso
- [ ] Mensagem de erro clara
- [ ] Links de ajuda funcionam
- [ ] Design consistente com o resto da aplicação

---

## ⏱️ Tempo Total Estimado
**1h 30min** de desenvolvimento

## 🚀 Prioridade
**ALTA** - Funcionalidade crítica para resolver o erro de sincronização

---

## 📌 Observações Adicionais

1. **Após criar a loja**, o usuário deve ser capaz de:
   - Ver a loja imediatamente na lista
   - Acessar o dashboard da loja
   - Testar a sincronização com as credenciais configuradas

2. **Campos opcionais vs obrigatórios**:
   - Apenas `name` é obrigatório
   - Credenciais API são opcionais mas recomendadas
   - Se não preencher credenciais, mostrar alerta na loja

3. **Melhorias futuras** (não implementar agora):
   - Editar loja existente
   - Deletar loja
   - Validar credenciais API ao salvar (testar conexão)
   - Importar lojas de planilha CSV
