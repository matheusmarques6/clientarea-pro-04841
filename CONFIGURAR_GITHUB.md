# 🔐 Como Configurar Autenticação com GitHub

## Problema Atual
Você está tendo problemas para fazer push porque o GitHub não aceita mais senha simples via HTTPS. Precisa usar um **Personal Access Token (PAT)**.

---

## ✅ Solução: Personal Access Token (Mais Simples)

### Passo 1: Criar Personal Access Token

1. **Acesse**: https://github.com/settings/tokens

2. **Clique em**: "Generate new token" → "Generate new token (classic)"

3. **Preencha**:
   - **Note**: `clientarea-pro-04841` (ou qualquer nome descritivo)
   - **Expiration**: `No expiration` (ou escolha um prazo)

4. **Marque os seguintes escopos** (permissions):
   - ✅ `repo` (acesso total aos repositórios)
   - ✅ `workflow` (para GitHub Actions, se usar)

5. **Clique em**: "Generate token"

6. **⚠️ IMPORTANTE**: Copie o token AGORA! Ele só aparece uma vez!
   - Formato: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### Passo 2: Configurar Git para usar o Token

Depois de gerar o token, execute estes comandos no terminal:

```bash
# Configurar Git Credential Helper (salva o token)
git config --global credential.helper store

# Fazer o primeiro push (vai pedir credenciais)
git push origin main
```

Quando pedir:
- **Username**: `matheusmarques6`
- **Password**: Cole o token que você copiou (ex: `ghp_xxxxx...`)

**O Git vai salvar as credenciais automaticamente!** 🎉

---

## 🔄 Alternativa: SSH (Mais Seguro, Mas Requer Configuração)

Se preferir usar SSH (mais seguro e não expira):

### Passo 1: Gerar chave SSH

```bash
# Gerar chave SSH
ssh-keygen -t ed25519 -C "dev.mmarques@gmail.com"

# Pressione Enter 3 vezes (sem senha)
```

### Passo 2: Copiar chave pública

```bash
# Exibir e copiar a chave pública
cat ~/.ssh/id_ed25519.pub
```

### Passo 3: Adicionar no GitHub

1. Acesse: https://github.com/settings/keys
2. Clique em "New SSH key"
3. **Title**: `WSL - clientarea`
4. **Key**: Cole a chave que você copiou
5. Clique em "Add SSH key"

### Passo 4: Mudar URL do repositório

```bash
# Mudar de HTTPS para SSH
git remote set-url origin git@github.com:matheusmarques6/clientarea-pro-04841.git

# Testar conexão
ssh -T git@github.com

# Fazer push
git push origin main
```

---

## 🚀 Qual Método Escolher?

| Método | Vantagens | Desvantagens |
|--------|-----------|--------------|
| **Personal Access Token** | ✅ Fácil e rápido<br>✅ Funciona em qualquer lugar | ⚠️ Pode expirar<br>⚠️ Precisa guardar o token |
| **SSH** | ✅ Mais seguro<br>✅ Nunca expira<br>✅ Não precisa digitar senha | ⚠️ Requer configuração inicial<br>⚠️ Precisa adicionar chave em cada máquina |

---

## 📝 Depois de Configurar

### Fazer commit e push das alterações atuais:

```bash
# Adicionar todos os arquivos novos
git add .

# Fazer commit
git commit -m "feat: Add store creation modal and sync error debugging

- Add AddStoreModal component with form validation
- Create store type definitions
- Add button to create new stores
- Add debug documentation for sync errors
- Update StoreSelector page with new functionality

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push para o GitHub
git push origin main
```

---

## 🆘 Problemas Comuns

### "Authentication failed"
- Verifique se copiou o token corretamente
- Certifique-se de usar o token como senha, não sua senha do GitHub

### "Permission denied (publickey)" (SSH)
- Verifique se adicionou a chave pública no GitHub
- Teste a conexão: `ssh -T git@github.com`

### "Could not resolve host"
- Verifique sua conexão com internet
- Tente fazer ping: `ping github.com`

---

## ✅ Teste Final

Depois de configurar, teste:

```bash
# Ver status
git status

# Fazer um push de teste
git push origin main
```

Se aparecer algo como:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
...
To https://github.com/matheusmarques6/clientarea-pro-04841
   abc1234..def5678  main -> main
```

**Está funcionando!** ✅

---

## 📞 Precisa de Ajuda?

Se continuar tendo problemas:
1. Verifique se o token tem as permissões corretas (`repo`)
2. Tente limpar as credenciais salvas: `git credential reject`
3. Configure novamente o credential helper
