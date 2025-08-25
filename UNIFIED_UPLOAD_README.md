# 🚀 DesignFlix Unified Upload Service

## Visão Geral

O **Unified Upload Service** é uma nova funcionalidade que unifica e moderniza o sistema de upload do DesignFlix, substituindo os endpoints antigos de upload individual por um sistema integrado e inteligente.

## ✨ Características Principais

### 🔄 **Processamento Unificado**
- **Um único endpoint** para todos os tipos de upload
- **Processamento automático** de arquivos compactados (ZIP, RAR, 7Z, TAR)
- **Extração inteligente** de preview + conteúdo
- **Integração automática** com UserMainGrid

### 🎯 **Detecção Inteligente**
- **Detecção automática** do formato real da imagem usando metadados
- **Geração automática** de tags baseada no nome do arquivo
- **Identificação inteligente** de categoria e contexto
- **Suporte a múltiplos idiomas** (português/inglês)

### 🚀 **Performance Otimizada**
- **Node.js Streams** para processamento de arquivos grandes
- **Processamento assíncrono** para múltiplos arquivos
- **Limpeza automática** de arquivos temporários
- **Upload paralelo** para S3

### 🎨 **Processamento de Imagem**
- **Marca d'água automática** (suave para thumb, completa para preview)
- **Conversão automática** para WebP
- **Redimensionamento inteligente** mantendo proporções
- **Qualidade otimizada** para web

## 📁 Estrutura de Pastas S3

### **Development/Test:**
```
s3-bucket/
├── downloads_test/     # Arquivos de conteúdo (PSD, AI, ZIP, etc.)
├── preview_test/       # Imagens de preview com marca d'água
├── thumbs_test/        # Thumbnails com marca d'água suave
└── profile_test/       # Imagens de perfil de usuário
```

### **Production:**
```
s3-bucket/
├── downloads/          # Arquivos de conteúdo (PSD, AI, ZIP, etc.)
├── preview/            # Imagens de preview com marca d'água
├── thumbs/             # Thumbnails com marca d'água suave
└── profile/            # Imagens de perfil de usuário
```

## 🛠️ Endpoints Disponíveis

### 1. **Upload Único**
```
POST /unified-upload/single
```

**Body:**
- `file`: Arquivo compactado (ZIP, RAR, 7Z, TAR, etc.)
- `categoryId`: ID da categoria (opcional)
- `categoryName`: Nome da categoria (opcional)
- `saveToGrid`: Boolean para salvar no UserMainGrid (padrão: true)

### 2. **Upload Múltiplo**
```
POST /unified-upload/multiple
```

**Body:**
- `files`: Array de arquivos compactados (máximo 20)
- `categoryId`: ID da categoria (opcional)
- `categoryName`: Nome da categoria (opcional)

### 3. **Informações do Serviço**
```
GET /unified-upload/info
```

## 🔄 Fluxo de Processamento

### **Arquivo Compactado → Processamento → S3 + Database**

1. **Upload** do arquivo compactado
2. **Extração** usando Node.js streams
3. **Identificação** de preview e conteúdo
4. **Processamento** de imagem (watermark + WebP)
5. **Upload** para S3 (3 pastas diferentes)
6. **Geração** automática de tags
7. **Salvamento** no UserMainGrid
8. **Retorno** dos dados processados

## 📊 Formatos Suportados

### **Arquivos Compactados**
- ZIP, RAR, 7Z, TAR, GZ, BZ2

### **Imagens de Preview**
- JPG, PNG, GIF, SVG, PSD, AI, CDR, EPS, WEBP

### **Conteúdo**
- PSD, AI, CDR, EPS, ZIP, RAR, 7Z, PDF

## 🎯 Regras de Processamento

### **Zip com PNG**
- Preview: PNG processado com marca d'água
- Thumbnail: PNG redimensionado com marca d'água suave
- Conteúdo: PNG original

### **Zip com PSD**
- Preview: PSD convertido para preview com marca d'água
- Thumbnail: PSD redimensionado com marca d'água suave
- Conteúdo: PSD original

### **Zip com Vetor (AI, CDR, EPS)**
- Preview: Vetor renderizado com marca d'água
- Thumbnail: Vetor redimensionado com marca d'água suave
- Conteúdo: Arquivo vetorial original

### **Zip com Figurinhas do Instagram**
- Preview: Imagem com marca d'água
- Thumbnail: Imagem redimensionada com marca d'água suave
- Conteúdo: ZIP original

## 🔧 Configuração

### **Variáveis de Ambiente**
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=your_region
STORAGE_TYPE=s3
NODE_ENV=development|test|production
```

### **Detecção Automática de Ambiente**
O sistema **detecta automaticamente** o ambiente e usa os paths corretos do S3:

- **Development/Test** (`NODE_ENV=development` ou `NODE_ENV=test`):
  - Thumbnails: `thumbs_test/`
  - Previews: `preview_test/`
  - Downloads: `downloads_test/`
  - Profile: `profile_test/`

- **Production** (`NODE_ENV=production`):
  - Thumbnails: `thumbs/`
  - Previews: `preview/`
  - Downloads: `downloads/`
  - Profile: `profile/`

**Logs automáticos** mostram qual ambiente está sendo usado:
```
🔧 Using TEST/DEV paths for environment: development
🚀 Using PRODUCTION paths for environment: production
```

### **Dependências**
```json
{
  "sharp": "^0.33.5",
  "unzipper": "^0.10.0",
  "tar": "^6.0.0",
  "multer": "^1.4.4",
  "aws-sdk": "^2.1691.0"
}
```

## 📈 Performance

### **Limites**
- **Tamanho máximo**: 100MB por arquivo
- **Quantidade máxima**: 20 arquivos por upload
- **Processamento**: Sequencial para estabilidade

### **Otimizações**
- **Streams nativos** do Node.js
- **Processamento em memória** para arquivos pequenos
- **Limpeza automática** de arquivos temporários
- **Upload paralelo** para S3

## 🔄 Migração dos Endpoints Antigos

### **Endpoints Marcados para Remoção**
- `POST /upload/thumb` → Substituído por `/unified-upload/*`
- `POST /upload/preview` → Substituído por `/unified-upload/*`
- `POST /upload/jpeg` → Substituído por `/unified-upload/*`

### **Compatibilidade**
- Os endpoints antigos **continuam funcionando**
- **Não quebram** funcionalidades existentes
- Podem ser **removidos gradualmente**

## 🧪 Testando o Serviço

### **1. Upload Único**
```bash
curl -X POST http://localhost:3000/unified-upload/single \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@design.zip" \
  -F "categoryName=Design" \
  -F "saveToGrid=true"
```

### **2. Upload Múltiplo**
```bash
curl -X POST http://localhost:3000/unified-upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@design1.zip" \
  -F "files=@design2.zip" \
  -F "categoryId=1"
```

### **3. Informações do Serviço**
```bash
curl http://localhost:3000/unified-upload/info
```

## 📝 Logs e Monitoramento

### **Logs de Processamento**
```
Processing archive: design.zip
Archive contains 3 files
Found 1 image files
Using preview.png as preview
Preview processed: https://s3.amazonaws.com/preview/abc123.webp
Thumbnail processed: https://s3.amazonaws.com/thumbs/def456.webp
Content uploaded: https://s3.amazonaws.com/downloads/ghi789.psd
Archive processing completed successfully
```

### **Logs de Integração**
```
Saving to UserMainGrid: { name: 'Design', format: 'PSD' }
UserMainGrid created with ID: 123
Category linked: Design
Tags linked: 5
```

## 🚨 Tratamento de Erros

### **Erros Comuns**
- **Arquivo inválido**: Formato não suportado
- **Sem imagem**: Arquivo compactado sem preview
- **S3 indisponível**: Problemas de conectividade
- **Permissões**: Usuário não autorizado

### **Fallbacks**
- **Watermark falha**: Imagem processada sem marca d'água
- **Conversão WebP falha**: Mantém formato original
- **Upload falha**: Retorna erro com detalhes

## 🔮 Próximos Passos

### **Melhorias Planejadas**
- [ ] **Processamento paralelo** para múltiplos arquivos
- [ ] **Cache Redis** para metadados
- [ ] **Webhooks** para notificações
- [ ] **Dashboard** de monitoramento
- [ ] **Métricas** de performance

### **Integrações Futuras**
- [ ] **CDN** para distribuição global
- [ ] **IA** para detecção de conteúdo
- [ ] **OCR** para extração de texto
- [ ] **Análise** de qualidade de imagem

## 📞 Suporte

### **Documentação**
- Este README
- Código fonte comentado
- Logs detalhados

### **Desenvolvedores**
- **Arquitetura**: Node.js + Express + Sequelize
- **Processamento**: Sharp + Streams
- **Storage**: AWS S3
- **Database**: MySQL/PostgreSQL

---

**Desenvolvido com ❤️ para DesignFlix**

*Versão: 1.0.0 | Data: 2025-01-27*
