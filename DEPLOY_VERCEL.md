# 🚀 Deploy na Vercel - Guia Completo

## Método 1: Deploy via Interface Web (Mais Fácil)

### Passo 1: Acesse a Vercel
1. Vá para: https://vercel.com/new
2. Faça login com sua conta

### Passo 2: Conecte o Repositório
Você tem duas opções:

#### Opção A: Importar do Git (Recomendado)
1. Clique em "Import Git Repository"
2. Autorize o acesso ao GitHub/GitLab
3. Selecione o repositório do projeto
4. A Vercel detectará automaticamente que é um projeto Vite

#### Opção B: Upload Manual
1. Comprima a pasta do projeto em um ZIP
2. Faça upload no Vercel
3. Ou use o comando: `vercel --prod`

### Passo 3: Configurar Variáveis de Ambiente
Adicione estas variáveis no painel da Vercel:

```
VITE_SUPABASE_PROJECT_ID=bsotblbtrshqfiqyzisy
VITE_SUPABASE_URL=https://bsotblbtrshqfiqyzisy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzb3RibGJ0cnNocWZpcXl6aXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMzMwODQsImV4cCI6MjA3MzkwOTA4NH0.wfylbuYN8sndCj9cQTnSXV53bp7RJ1eN3bLBHb4gxWg
```

### Passo 4: Deploy
1. Clique em "Deploy"
2. Aguarde 1-2 minutos
3. Pronto! ✅

---

## Método 2: Deploy via CLI

### Passo 1: Login
```bash
vercel login
```
- Siga as instruções no terminal
- Abra o link fornecido no navegador
- Autorize o acesso

### Passo 2: Deploy
```bash
cd /home/convertfy/projetos/clientarea-pro-04841
vercel --prod
```

### Passo 3: Configurar Variáveis
```bash
# Adicionar variáveis de ambiente
vercel env add VITE_SUPABASE_PROJECT_ID production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
```

---

## Método 3: Deploy com GitHub Actions (Automático)

### Passo 1: Criar arquivo de workflow
Crie: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
```

### Passo 2: Adicionar Secrets no GitHub
1. Vá em Settings > Secrets > Actions
2. Adicione:
   - `VERCEL_TOKEN` (pegue em: https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

---

## 📁 Arquivos Importantes

- ✅ `vercel.json` - Configuração do projeto
- ✅ `.vercelignore` - Arquivos ignorados
- ✅ `.env` - Variáveis locais (NÃO commitar!)
- ✅ `dist/` - Build de produção (já gerado)

---

## 🔒 Segurança

**IMPORTANTE:** Nunca comite o arquivo `.env` no Git!

Adicione ao `.gitignore`:
```
.env
.env.local
.env.production
```

---

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:
- [ ] Site carrega corretamente
- [ ] Conexão com Supabase funciona
- [ ] Variáveis de ambiente estão configuradas
- [ ] HTTPS está ativo
- [ ] Domínio customizado (opcional)

---

## 🌐 Domínio Customizado

Para adicionar um domínio personalizado:
1. Vá em Project Settings > Domains
2. Adicione seu domínio
3. Configure os DNS conforme instruções

---

## 📊 Monitoramento

Acesse: https://vercel.com/dashboard
- Analytics
- Logs
- Performance
- Deployments

---

## 🆘 Problemas Comuns

### Build falha
```bash
# Limpar cache e reinstalar
rm -rf node_modules dist
npm install
npm run build
```

### Variáveis de ambiente não carregam
- Verifique se começam com `VITE_`
- Rebuild após adicionar novas variáveis

### 404 em rotas
- Verificar `vercel.json` tem rewrites corretos
- SPA precisa redirecionar tudo para `index.html`

---

## 📞 Suporte

- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord
- GitHub: https://github.com/vercel/vercel
