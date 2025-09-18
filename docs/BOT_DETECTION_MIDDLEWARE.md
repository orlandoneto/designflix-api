# 🤖 Bot Detection Middleware - FlixDesign

Middleware para detectar bots (Google, Facebook, Telegram, etc.) e servir conteúdo otimizado para SEO e redes sociais.

## 🎯 Objetivo

- **SEO melhorado**: Bots veem conteúdo real com meta tags otimizadas
- **Social sharing**: Facebook/Telegram mostram previews corretos
- **Performance**: Usuários reais mantêm SPA rápida
- **Flexibilidade**: Controle total sobre o que bots veem

## 🚀 Instalação

O middleware já está integrado no `main.js`. Não precisa de instalação adicional.

## 📋 Como Funciona

### 1. Detecção de Bots
```javascript
// Detecta automaticamente:
- Telegram Bot
- Facebook Bot (FacebookExternalHit)
- Google Bot
- Twitter Bot
- LinkedIn Bot
- WhatsApp Bot
- Discord Bot
- Slack Bot
- E outros crawlers
```

### 2. Rotas Configuradas
```javascript
// Rotas já configuradas no main.js:
app.get('/', botDetection.serveBotHTML({...}));           // Página inicial
app.get('/templates', botDetection.serveBotHTML({...}));   // Templates
app.get('/category/:id', botDetection.serveBotHTML({...})); // Categorias
app.get('/user/:id', botDetection.serveBotHTML({...}));    // Contribuidores
app.get('*', (req, res) => {...});                        // Fallback
```

### 3. Meta Tags Geradas
```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://flixdesign.com">
<meta property="og:title" content="FlixDesign - Design Resources">
<meta property="og:description" content="Descubra os melhores recursos...">
<meta property="og:image" content="https://flixdesign.com/logo.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:title" content="FlixDesign - Design Resources">

<!-- Telegram -->
<meta property="telegram:channel" content="@flixdesign">

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "FlixDesign",
  "url": "https://flixdesign.com"
}
</script>
```

## 🛠️ Uso Básico

### Servir HTML Estático
```javascript
const BotDetectionMiddleware = require('./middleware/botDetection');
const botDetection = new BotDetectionMiddleware();

// Middleware de detecção
app.use(botDetection.middleware());

// Rota para bots
app.get('/', botDetection.serveBotHTML({
  title: 'FlixDesign - Design Resources',
  description: 'Descubra os melhores recursos de design...',
  image: '/logo.png',
  url: 'https://flixdesign.com'
}));
```

### Servir HTML Dinâmico
```javascript
const AdvancedBotDetection = require('./middleware/advancedBotDetection');
const advancedBot = new AdvancedBotDetection();

// HTML baseado em dados do banco
app.get('/category/:id', async (req, res) => {
  if (req.isBot) {
    const html = await advancedBot.generateCategoryHTML(req.params.id);
    res.send(html);
  } else {
    // Servir SPA normal
    res.sendFile('index.html');
  }
});
```

## 📁 Estrutura de Arquivos

```
src/
├── middleware/
│   ├── botDetection.js           # Middleware básico
│   └── advancedBotDetection.js   # Versão avançada com dados dinâmicos
├── scripts/
│   └── generatePrerenderedHTML.js # Script para gerar HTMLs estáticos
└── public/
    └── prerendered/              # HTMLs pré-renderizados
        ├── index.html
        ├── templates.html
        ├── categories.html
        └── contributors.html
```

## 🔧 Scripts Disponíveis

### Gerar HTMLs Pré-renderizados
```bash
# Gerar todos os HTMLs
node scripts/generatePrerenderedHTML.js generate

# Limpar HTMLs existentes
node scripts/generatePrerenderedHTML.js clean

# Ver ajuda
node scripts/generatePrerenderedHTML.js help
```

### Exemplo de HTML Gerado
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlixDesign - Design Resources Premium</title>
    <meta name="description" content="Descubra os melhores recursos...">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://flixdesign.com">
    <meta property="og:title" content="FlixDesign - Design Resources Premium">
    <meta property="og:description" content="Descubra os melhores recursos...">
    <meta property="og:image" content="https://flixdesign.com/logo.png">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "FlixDesign",
      "url": "https://flixdesign.com"
    }
    </script>
</head>
<body>
    <div style="...">
        <img src="https://flixdesign.com/logo.png" alt="FlixDesign">
        <h1>FlixDesign - Design Resources Premium</h1>
        <p>Descubra os melhores recursos de design...</p>
        <!-- Conteúdo visual atrativo -->
    </div>
</body>
</html>
```

## 🎨 Personalização

### Adicionar Nova Rota
```javascript
// No main.js
app.get('/nova-rota', botDetection.serveBotHTML({
  title: 'Nova Rota - FlixDesign',
  description: 'Descrição da nova rota...',
  image: '/logo.png',
  url: 'https://flixdesign.com/nova-rota'
}));
```

### Modificar Meta Tags
```javascript
// Editar src/middleware/botDetection.js
generateBotHTML(pageData = {}) {
  const {
    title = 'FlixDesign - Design Resources',
    description = 'Descubra os melhores recursos...',
    image = '/logo.png',
    url = process.env.FRONTEND_URL || 'https://flixdesign.com',
    type = 'website',
    siteName = 'FlixDesign',
    // Adicionar novos campos
    customMeta = {}
  } = pageData;

  // Adicionar meta tags customizadas
  let customMetaTags = '';
  Object.entries(customMeta).forEach(([key, value]) => {
    customMetaTags += `<meta name="${key}" content="${value}">\n`;
  });

  return `<!DOCTYPE html>...${customMetaTags}...`;
}
```

## 🔍 Debugging

### Verificar Detecção de Bots
```javascript
// No middleware
app.use((req, res, next) => {
  if (req.isBot) {
    console.log('🤖 Bot detectado:', {
      userAgent: req.headers['user-agent'],
      path: req.path,
      ip: req.ip
    });
  }
  next();
});
```

### Testar com User-Agent Simulado
```bash
# Simular Telegram Bot
curl -H "User-Agent: TelegramBot" http://localhost:3000/

# Simular Facebook Bot
curl -H "User-Agent: FacebookExternalHit" http://localhost:3000/

# Simular Google Bot
curl -H "User-Agent: Googlebot" http://localhost:3000/
```

## 📊 Benefícios

### SEO
- ✅ Meta tags otimizadas
- ✅ Structured data (JSON-LD)
- ✅ Conteúdo indexável
- ✅ Rich snippets

### Social Media
- ✅ Facebook previews
- ✅ Twitter cards
- ✅ Telegram previews
- ✅ WhatsApp previews
- ✅ LinkedIn previews

### Performance
- ✅ Cache de 1 hora
- ✅ HTML leve
- ✅ SPA mantida para usuários
- ✅ Redirecionamento automático

## 🚨 Considerações

### Cache
- HTMLs são cacheados por 1 hora
- Use `Cache-Control` apropriado
- Considere invalidação de cache

### Segurança
- Não exponha dados sensíveis
- Valide inputs
- Use HTTPS

### Monitoramento
- Monitore logs de bots
- Acompanhe métricas de SEO
- Teste regularmente

## 🔗 Links Úteis

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview)
- [Schema.org](https://schema.org/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

---

**Desenvolvido para FlixDesign** 🎨
