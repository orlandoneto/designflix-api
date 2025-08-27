# 🚀 DesignFlix API - Sistema de Upload Inteligente

## 📋 Visão Geral

Sistema inteligente de upload e processamento de arquivos compactados (ZIP, RAR, 7Z, TAR) com detecção automática de regras e seleção inteligente de preview vs conteúdo.

## 🎯 Regras de Processamento

### **Prioridade das Regras (Ordem de Aplicação)**

| Prioridade | Regra | Descrição | Formato |
|------------|-------|-----------|---------|
| 1 | **PSD Rule** | Zip com PSD | **Extensão do CONTEÚDO** (PSD) |
| 2 | **Vector Rule** | Zip com Vetor (AI/CDR/EPS) | **Extensão do CONTEÚDO** (AI/CDR/EPS) |
| 3 | **Instagram Stickers** | Zip com ZIP (figurinhas) | **Extensão do CONTEÚDO** (ZIP) |
| 4 | **Intelligent Image Selection** | Zip com 2 imagens | **Extensão do CONTEÚDO** (JPG/PNG) |
| 5 | **Single Image** | Zip com 1 imagem | **Extensão do CONTEÚDO** (JPG/PNG) |
| 6 | **Default Rule** | Fallback | **Extensão do CONTEÚDO** |

---

## 🔍 **REGRA 1: Zip com PSD** (Prioridade 1)

### **Detecção:**
- Arquivo contém extensão `.psd`

### **Processamento:**
- **Preview**: Primeira imagem (JPG/PNG) encontrada
- **Conteúdo**: Arquivo PSD
- **Formato**: Extensão do CONTEÚDO (PSD)

### **Exemplo:**
```
📁 arquivo.zip
├── preview.jpg     ← PREVIEW
└── design.psd      ← CONTEÚDO

Resultado: Preview + .psd
Formato: PSD (extensão do CONTEÚDO)
```

---

## 🎨 **REGRA 2: Zip com Vetor** (Prioridade 2)

### **Detecção:**
- Arquivo contém extensões: `.ai`, `.cdr`, `.eps`

### **Processamento:**
- **Preview**: Primeira imagem (JPG/PNG) encontrada
- **Conteúdo**: Arquivo vetorial (AI/CDR/EPS)
- **Formato**: Extensão do CONTEÚDO (AI/CDR/EPS)

### **Exemplo:**
```
📁 arquivo.zip
├── preview.png     ← PREVIEW
└── logo.eps        ← CONTEÚDO

Resultado: Preview + .eps
Formato: EPS (extensão do CONTEÚDO)
```

---

## 📱 **REGRA 3: Zip com Figurinhas do Instagram** (Prioridade 3)

### **Detecção:**
- Arquivo contém extensão `.zip` (ZIP dentro de ZIP)

### **Processamento:**
- **Preview**: Primeira imagem (JPG/PNG) encontrada
- **Conteúdo**: Arquivo ZIP interno
- **Formato**: Extensão do CONTEÚDO (ZIP)

### **Exemplo:**
```
📁 arquivo.zip
├── preview.jpg     ← PREVIEW
└── stickers.zip    ← CONTEÚDO

Resultado: Preview + .zip
Formato: ZIP (extensão do CONTEÚDO)
```

---

## 🧠 **REGRA 4: Seleção Inteligente de Imagens** (Prioridade 4)

### **Detecção:**
- Arquivo contém **exatamente 2 imagens** (JPG/PNG)
- Apenas extensões: `.jpg`, `.jpeg`, `.png`

### **Processamento Inteligente:**

#### **Prioridade JPG (Sempre Primeiro):**
1. **Verificar JPG primeiro** - detectar fundo brano (RGB > 240)
2. **Depois verificar PNG** - detectar canal alpha real (< 128)
3. **JPG tem prioridade absoluta** se ambos forem "transparentes"

#### **Cenários de Funcionamento:**

##### **🟢 Cenário 1: JPG transparente + PNG sólido**
```
📁 arquivo.zip
├── design.png      ← CONTEÚDO (fundo sólido)
└── preview.jpg     ← PREVIEW (fundo brano)

Resultado: JPG como PREVIEW, PNG como CONTEÚDO
Formato: PNG (extensão do CONTEÚDO)
```

##### **🔴 Cenário 2: PNG transparente + JPG sólido**
```
📁 arquivo.zip
├── design.png      ← PREVIEW (fundo transparente)
└── preview.jpg     ← CONTEÚDO (fundo sólido)

Resultado: PNG como PREVIEW, JPG como CONTEÚDO
Formato: JPG (extensão do CONTEÚDO)
```

##### **🟡 Cenário 3: Ambos transparentes (JPG tem prioridade)**
```
📁 arquivo.zip
├── design.png      ← CONTEÚDO (fundo transparente)
└── preview.jpg     ← PREVIEW (fundo brano - prioridade)

Resultado: JPG como PREVIEW (prioridade), PNG como CONTEÚDO
Formato: PNG (extensão do CONTEÚDO)
```

### **Detalhes Técnicos:**
- **JPG**: Fundo brano (RGB > 240) = "transparente"
- **PNG**: Canal alpha real (< 128) = transparente
- **Threshold**: 30% branco para JPG, 15% transparente para PNG

---

## 🖼️ **REGRA 5: Zip com Imagem Única** (Prioridade 5)

### **Detecção:**
- Arquivo contém **exatamente 1 imagem** (JPG/PNG)

### **Processamento:**
- **Preview**: A própria imagem
- **Conteúdo**: Nenhum (mesmo arquivo)
- **Formato**: Extensão da imagem (JPG/PNG)

### **Exemplo:**
```
📁 arquivo.zip
└── design.jpg      ← PREVIEW = CONTEÚDO

Resultado: .jpg (preview é o mesmo do original)
Formato: JPG (extensão da imagem)
```

---

## 🔄 **REGRA 6: Padrão (Fallback)** (Prioridade 999)

### **Detecção:**
- Nenhuma regra específica se aplica
- Fallback para comportamento padrão

### **Processamento:**
- **Preview**: Primeira imagem encontrada
- **Conteúdo**: Segunda imagem (se houver)
- **Formato**: Extensão do CONTEÚDO (segunda imagem)

---

## 📊 **Fluxo de Processamento**

### **1. Upload do Arquivo**
```
📤 Usuário faz upload → 📦 Arquivo compactado recebido
```

### **2. Análise Automática**
```
🔍 Listar conteúdo → 🎯 Detectar regra aplicável → 📋 Aplicar regra
```

### **3. Processamento Específico**
```
📁 Regra detectada → 🖼️ Selecionar preview → 📄 Selecionar conteúdo
```

### **4. Geração de Resultado**
```
✅ Preview processado → 📦 Conteúdo extraído → 🏷️ Formato definido
```

---

## 🛠️ **Implementação Técnica**

### **Arquivos Principais:**
- `src/utils/archiveProcessor.js` - Processamento de arquivos compactados
- `src/utils/imageProcessor.js` - Análise de imagens e detecção de transparência
- `src/services/unified-upload.service.js` - Serviço principal de upload

### **Funções Chave:**
- `detectArchiveRule()` - Detecção automática de regras
- `selectPreviewAndContent()` - Seleção inteligente de imagens
- `analyzeImageAlpha()` - Análise de canal alpha e fundo brano

---

## 📝 **Logs e Monitoramento**

### **Exemplo de Logs:**
```
🔍 Analisando conteúdo para detectar regra aplicável...
📁 Arquivos encontrados: preview.jpg, design.psd
🔤 Extensões: .jpg, .psd
🎯 REGRA DETECTADA: Zip com PSD
🎯 REGRA APLICADA: Zip com PSD - Preview (JPG ou PNG) + .psd
📋 Tipo de regra: psd_rule
🎨 Aplicando regra PSD: preview.jpg como preview, design.psd como conteúdo
```

---

## 🚀 **Como Usar**

### **Endpoint:**
```
POST /unified-upload/single
```

### **Body:**
```json
{
  "file": "arquivo.zip",
  "categoryId": "123",
  "categoryName": "Design",
  "saveToGrid": true
}
```

### **Resposta:**
```json
{
  "status": "success",
  "data": {
    "preview": {
      "url": "https://...",
      "name": "preview.jpg"
    },
    "content": {
      "url": "https://...",
      "name": "design.psd"
    },
    "ruleApplied": "psd_rule",
    "ruleDescription": "Zip com PSD - Preview (JPG ou PNG) + .psd",
    "format": "PSD"
  }
}
```

---

## ✅ **Casos de Uso Cobertos**

- ✅ **Designers**: PSD, AI, CDR, EPS com preview
- ✅ **Desenvolvedores**: Imagens com seleção inteligente
- ✅ **Marketing**: Figurinhas do Instagram
- ✅ **Geral**: Qualquer arquivo compactado

---

## 🔒 **Segurança e Robustez**

- **Fallback automático** em caso de erro
- **Validação de arquivos** antes do processamento
- **Logs detalhados** para debugging
- **Tratamento de erros** robusto
- **Compatibilidade** com sistema existente

---

## 📞 **Suporte**

Para dúvidas ou problemas, consulte os logs detalhados ou entre em contato com a equipe de desenvolvimento.

---

**🎉 Sistema inteligente de upload implementado e funcionando perfeitamente!** do e
