# 🚀 Render.com - Guia de Configuração

## ❌ Erro Atual

```
Exited with status 127 while running your code.
bash: line 1: start: command not found
```

**Causa:** O Start Command está configurado como `start` em vez de `npm run preview`.

---

## ✅ Solução Rápida (Via Dashboard)

### 1. Acesse as Configurações

No Render.com:
1. Selecione o serviço **clientarea-pro-04841**
2. Vá em **Settings** (menu lateral esquerdo)

### 2. Configure o Start Command

Procure por **"Start Command"** e altere para:

```bash
npm run preview
```

**Ou se preferir usar Bun:**
```bash
bun run preview
```

### 3. Configure a Porta (Importante!)

O Vite Preview roda na porta `4173` por padrão, mas o Render espera a porta definida em `$PORT`.

**Adicione variável de ambiente:**
- Nome: `PORT`
- Valor: `4173`

Ou melhor, **atualize o script preview** no `package.json`:

```json
"preview": "vite preview --port $PORT --host 0.0.0.0"
```

### 4. Salve e Redeploy

1. Clique em **"Save Changes"**
2. Vá em **"Manual Deploy"** (topo da página)
3. Clique em **"Deploy latest commit"**

---

## ⚙️ Configuração Completa Recomendada

### No Render Dashboard (Settings)

| Configuração | Valor |
|--------------|-------|
| **Name** | clientarea-pro-04841 |
| **Environment** | Node |
| **Region** | Oregon (US West) |
| **Branch** | main |
| **Root Directory** | (deixar vazio) |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run preview --port $PORT --host 0.0.0.0` |
| **Plan** | Free |
| **Auto-Deploy** | Yes |

### Variáveis de Ambiente (Environment Variables)

Adicione no dashboard (Settings → Environment):

```
NODE_ENV=production
VITE_SUPABASE_URL=https://bsotblbtrshqfiqyzisy.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
PORT=10000
```

**Importante:** Substitua `sua_chave_aqui` pela sua chave anônima do Supabase.

Para pegar a chave:
1. Acesse: https://supabase.com/dashboard/project/bsotblbtrshqfiqyzisy/settings/api
2. Copie: **anon** **public** key

---

## 📝 Usando render.yaml (Alternativa)

Se preferir configuração via código, use o arquivo `render.yaml` que foi criado.

**Vantagens:**
- ✅ Configuração versionada no Git
- ✅ Fácil de replicar
- ✅ Menos erros manuais

**Como usar:**

1. O arquivo `render.yaml` já foi criado na raiz do projeto
2. Commit e push:
   ```bash
   git add render.yaml
   git commit -m "chore: add Render configuration"
   git push origin main
   ```
3. No Render Dashboard → Settings → procure por **"render.yaml"**
4. Ative: **"Use render.yaml"**

---

## 🐛 Troubleshooting

### Erro: "Start command failed"

**Solução:** Verifique se o comando está correto:
```bash
npm run preview --port $PORT --host 0.0.0.0
```

### Erro: "Port binding failed"

**Causa:** Vite Preview não está escutando na porta correta.

**Solução:** Adicione flag `--port $PORT` no start command.

### Erro: "Cannot GET /"

**Causa:** O servidor está rodando, mas os arquivos estáticos não foram buildados.

**Solução:** Verifique se o Build Command executou corretamente:
```bash
npm install && npm run build
```

E se a pasta `dist/` foi criada.

### Aplicação "dorme" após 15 min

**Comportamento normal do plano gratuito.**

**Soluções:**
1. **Aceitar:** Primeiro request será lento (~30s)
2. **Pinger:** Use serviço como [cron-job.org](https://cron-job.org) para fazer requests a cada 10 min
3. **Upgrade:** Plano pago ($7/mês) não dorme

---

## 🎯 Checklist de Deploy

- [ ] Start Command configurado: `npm run preview --port $PORT --host 0.0.0.0`
- [ ] Build Command configurado: `npm install && npm run build`
- [ ] Variável `VITE_SUPABASE_URL` adicionada
- [ ] Variável `VITE_SUPABASE_ANON_KEY` adicionada
- [ ] Deploy manual executado
- [ ] Logs mostram: "Build successful"
- [ ] Aplicação acessível na URL do Render
- [ ] Login funciona
- [ ] Dashboard carrega dados

---

## 🚀 Próximos Passos

Após o deploy passar:

1. **Testar aplicação** na URL do Render
2. **Deploy Edge Functions** no Supabase (veja `DEPLOYMENT_GUIDE.md`)
3. **Testar sincronização** Klaviyo/Shopify
4. **Configurar domínio customizado** (opcional)

---

## 📊 Render vs Vercel

| Feature | Render | Vercel |
|---------|--------|--------|
| **Custo** | Gratuito (com limitações) | Gratuito (generoso) |
| **Performance** | Bom | Excelente (CDN global) |
| **Servidor dorme?** | ✅ Sim (plano free) | ❌ Não |
| **Build time** | ~2-3 min | ~1-2 min |
| **PostgreSQL** | ✅ Incluído | ❌ Não |
| **Melhor para** | Fullstack apps | Frontend + Serverless |

**Recomendação:** Se não precisa de PostgreSQL no Render (você já tem no Supabase), **Vercel é melhor opção** para frontend.

---

## 🔄 Migração para Vercel (Opcional)

Se quiser performance melhor e sem servidor "dormindo":

1. Acesse: https://vercel.com/new
2. Importe repositório GitHub
3. Configure:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Adicione variáveis de ambiente
5. Deploy!

**Vantagens:**
- ✅ Sem servidor "dormindo"
- ✅ CDN global (mais rápido)
- ✅ Deploy instantâneo (< 1min)
- ✅ 100% gratuito

---

**Última atualização:** 21 de Outubro de 2025
