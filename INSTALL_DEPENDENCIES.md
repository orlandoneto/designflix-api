# 📦 Instalação de Dependências

## Dependências Necessárias

Para que o **Unified Upload Service** funcione corretamente, você precisa instalar algumas dependências adicionais:

### 🔧 Instalação Automática

```bash
npm install unzipper tar
```

### 📋 Dependências Detalhadas

```bash
# Para processamento de arquivos compactados
npm install unzipper@^0.10.0    # Extração de arquivos ZIP
npm install tar@^6.0.0          # Extração de arquivos TAR

# Dependências já existentes (verificar se estão atualizadas)
npm install sharp@^0.33.5       # Processamento de imagem
npm install multer@^1.4.4       # Upload de arquivos
npm install aws-sdk@^2.1691.0   # AWS S3
```

### 🔍 Verificação de Dependências

Após a instalação, verifique se as dependências foram adicionadas ao `package.json`:

```json
{
  "dependencies": {
    "unzipper": "^0.10.0",
    "tar": "^6.0.0",
    "sharp": "^0.33.5",
    "multer": "^1.4.4",
    "aws-sdk": "^2.1691.0"
  }
}
```

### 🚀 Teste de Instalação

Para verificar se tudo está funcionando:

```bash
# Testar se o servidor inicia
npm run dev

# Verificar se o endpoint está disponível
curl http://localhost:3000/unified-upload/info
```

### ⚠️ Problemas Comuns

#### **Erro: Cannot find module 'unzipper'**
```bash
npm install unzipper
```

#### **Erro: Cannot find module 'tar'**
```bash
npm install tar
```

#### **Erro: Sharp não suporta formato**
```bash
npm install sharp@latest
```

### 🔄 Atualização de Dependências

Se precisar atualizar todas as dependências:

```bash
npm update
npm audit fix
```

---

**Nota**: As dependências `unzipper` e `tar` são necessárias para o processamento de arquivos compactados. Sem elas, o serviço não funcionará corretamente.
