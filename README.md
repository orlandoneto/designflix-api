# 🚀 DesignFlix API - Sistema de Upload Inteligente (REGRAS SIMPLIFICADAS)

## 📋 Visão Geral

Sistema inteligente de upload e processamento de arquivos compactados (ZIP, RAR, 7Z, TAR) com detecção automática de regras e **seleção inteligente simplificada** (JPG sempre preview se tiver PNG + JPG).

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

### **Processamento Inteligente (REGRAS SIMPLIFICADAS):**

#### **NOVA REGRA: JPG sempre será PREVIEW**
- **Se tiver PNG + JPG → JPG SEMPRE será PREVIEW**
- **Não precisa analisar transparência/fundo**
- **Não precisa detectar edição**
- **Regra muito mais simples e direta!**

#### **Cenários de Funcionamento:**

##### **🟢 Cenário: PNG + JPG (qualquer fundo)**
```
📁 arquivo.zip
├── design.png      ← CONTEÚDO (qualquer fundo)
└── preview.jpg     ← PREVIEW (JPG sempre prioridade)

Resultado: JPG como PREVIEW, PNG como CONTEÚDO
Formato: PNG (extensão do CONTEÚDO)
```

Observação: independe de transparência/fundo; não há análise de canal alpha.

### **Detalhes Técnicos:**
- **Regra simplificada**: JPG sempre será preview se tiver PNG + JPG
- **Não analisa**: Transparência, fundo branco, canal alpha
- **Não detecta**: Edição de imagens, metadados EXIF/IPTC
- **Performance**: Muito mais rápida (sem análise de pixels)
- **Simplicidade**: Regra direta e fácil de entender

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
- `src/utils/filenameSanitizer.js` - Sanitização robusta de nomes de arquivos
- `src/utils/imageProcessor.js` - Análise de imagens (mantido para outras operações)
- `src/services/unified-upload.service.js` - Serviço principal de upload

### **Funções Chave:**
- `detectArchiveRule()` - Detecção automática de regras
- `selectPreviewAndContent()` - Seleção inteligente simplificada (JPG sempre preview)
- `sanitizeFilename()` - Sanitização de nomes para evitar problemas de encoding/mojibake

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

### **Exemplo de Logs (Seleção Inteligente + Sanitização):**
```
🔍 Analisando conteúdo para detectar regra aplicável...
📄 Arquivo: "Espiga-de-Milho-...-Sa╠âo.jpg" -> Normalizado/Sanitizado: "Espiga-de-Milho-...-Sao.jpg" -> Ext: ".jpg"
📄 Arquivo: "Espiga de Milho ... Sa╠âo.png" -> Normalizado/Sanitizado: "Espiga-de-Milho-...-Sao.png" -> Ext: ".png"
🎯 REGRA DETECTADA: Zip com 2 imagens (seleção inteligente)
✅ Seleção inteligente: [JPG] como PREVIEW, [PNG] como CONTEÚDO
Método: jpg_always_preview
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
- ✅ **Desenvolvedores**: Imagens com seleção inteligente simplificada (JPG sempre preview)
- ✅ **Marketing**: Figurinhas do Instagram
- ✅ **Geral**: Qualquer arquivo compactado
- ✅ **Performance**: Processamento mais rápido (sem análise complexa de pixels)

---

## 🔒 **Segurança e Robustez**

- **Fallback automático** em caso de erro
- **Validação de arquivos** antes do processamento
- **Logs detalhados** para debugging (inclui nomes sanitizados vs originais)
- **Tratamento de erros** robusto
- **Compatibilidade** com sistema existente
- **Regras simplificadas** para maior confiabilidade
- **Processamento mais rápido** sem análise complexa

---

## 📞 **Suporte**

Para dúvidas ou problemas, consulte os logs detalhados ou entre em contato com a equipe de desenvolvimento.

---

**🎉 Sistema inteligente de upload implementado e funcionando perfeitamente!** do e
