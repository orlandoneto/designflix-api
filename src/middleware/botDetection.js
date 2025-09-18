const path = require('path');
const fs = require('fs');

/**
 * Middleware para detectar bots e servir conteúdo otimizado para SEO/Social Media
 * 
 * Detecta:
 * - Telegram Bot
 * - Facebook Bot (FacebookExternalHit)
 * - Google Bot
 * - Twitter Bot
 * - LinkedIn Bot
 * - WhatsApp Bot
 * - Discord Bot
 * - Slack Bot
 */
class BotDetectionMiddleware {
  constructor() {
    // Padrões de User-Agent para bots conhecidos
    this.botPatterns = [
      /telegram/i,
      /facebookexternalhit/i,
      /facebook/i,
      /googlebot/i,
      /bingbot/i,
      /twitterbot/i,
      /linkedinbot/i,
      /whatsapp/i,
      /discordbot/i,
      /slackbot/i,
      /applebot/i,
      /baiduspider/i,
      /yandexbot/i,
      /duckduckbot/i,
      /crawler/i,
      /spider/i,
      /bot/i
    ];

    // Diretório onde ficam os HTMLs pré-renderizados
    this.prerenderedDir = path.join(__dirname, '../../public/prerendered');

    // Garantir que o diretório existe
    this.ensurePrerenderedDir();
  }

  /**
   * Cria o diretório de HTMLs pré-renderizados se não existir
   */
  ensurePrerenderedDir() {
    if (!fs.existsSync(this.prerenderedDir)) {
      fs.mkdirSync(this.prerenderedDir, { recursive: true });
      console.log('📁 Diretório de HTMLs pré-renderizados criado:', this.prerenderedDir);
    }
  }

  /**
   * Verifica se o User-Agent é de um bot
   */
  isBot(userAgent) {
    if (!userAgent) return false;

    return this.botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Gera HTML otimizado para bots com meta tags OG
   */
  generateBotHTML(pageData = {}) {
    const {
      title = 'Flixdesign - Sua galeria de design',
      description = 'Flixdesign: Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.',
      image = '/favflix.png',
      url = process.env.FRONTEND_URL || 'https://flixdesign.com.br',
      type = 'website',
      siteName = 'Flixdesign'
    } = pageData;

    return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <link rel="canonical" href="${url}" />

    <!-- Google Tag Manager -->
    <script>(function (w, d, s, l, i) {
        w[l] = w[l] || []; w[l].push({
          'gtm.start':
            new Date().getTime(), event: 'gtm.js'
        }); var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
            'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
      })(window, document, 'script', 'dataLayer', 'GTM-5HF2H9TM');</script>
    <!-- End Google Tag Manager -->

    <!-- Favicons para todos os navegadores e dispositivos -->
    <link rel="icon" type="image/png" sizes="32x32" href="${url}/favflix.png">
    <link rel="icon" type="image/png" sizes="16x16" href="${url}/favflix.png">
    <link rel="apple-touch-icon" sizes="180x180" href="${url}/favflix.png">
    <link rel="icon" type="image/png" sizes="192x192" href="${url}/favflix.png">
    <link rel="icon" type="image/png" sizes="512x512" href="${url}/favflix.png">

    <!-- Manifest para PWA -->
    <link rel="manifest" href="${url}/manifest.json" />

    <!-- SEO -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="design, galeria, portfólio, imagens, designers, arte, criatividade, recursos gráficos, PSD" />
    <meta name="author" content="Flixdesign" />
    <meta name="robots" content="index, follow" />

    <!-- Open Graph para redes sociais -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${url}${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:locale" content="pt_BR" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${url}${image}" />
    <meta name="twitter:site" content="@flixdesign" />

    <!-- Telegram -->
    <meta property="telegram:channel" content="@flixdesign" />
    
    <!-- WhatsApp -->
    <meta property="whatsapp:image" content="${url}${image}" />
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "${siteName}",
      "url": "${url}",
      "description": "${description}",
      "publisher": {
        "@type": "Organization",
        "name": "${siteName}",
        "logo": {
          "@type": "ImageObject",
          "url": "${url}${image}"
        }
      }
    }
    </script>
    
    <!-- Redirect para SPA após 3 segundos (opcional) -->
    <script>
      setTimeout(function() {
        window.location.href = '${url}';
      }, 3000);
    </script>
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5HF2H9TM" height="0" width="0"
        style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    
    <noscript>Você precisa habilitar o JavaScript para rodar este app.</noscript>
    
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
    ">
      <img src="${url}/favflix.png" alt="${siteName}" style="
        width: 120px;
        height: 120px;
        border-radius: 20px;
        margin: 0 auto 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      ">
      
      <h1 style="
        font-size: 2.5rem;
        margin: 0 0 20px;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${title}</h1>
      
      <p style="
        font-size: 1.2rem;
        margin: 0 0 40px;
        opacity: 0.9;
        line-height: 1.6;
      ">${description}</p>
      
      <div style="
        background: rgba(255,255,255,0.1);
        padding: 30px;
        border-radius: 15px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
      ">
        <h2 style="margin: 0 0 15px; font-size: 1.5rem;">🎨 Galeria de Design</h2>
        <ul style="
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        ">
          <li style="padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">🖼️ Portfólios</li>
          <li style="padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">🎨 Recursos Gráficos</li>
          <li style="padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">👨‍🎨 Designers</li>
          <li style="padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">💡 Criatividade</li>
        </ul>
      </div>
      
      <p style="
        margin-top: 40px;
        opacity: 0.7;
        font-size: 0.9rem;
      ">Redirecionando para o site em 3 segundos...</p>
    </div>
</body>
</html>`;
  }

  /**
   * Salva HTML pré-renderizado em arquivo
   */
  savePrerenderedHTML(filename, html) {
    const filePath = path.join(this.prerenderedDir, filename);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('💾 HTML pré-renderizado salvo:', filePath);
  }

  /**
   * Middleware principal
   */
  middleware() {
    return (req, res, next) => {
      const userAgent = req.headers['user-agent'] || '';
      const isBotRequest = this.isBot(userAgent);

      // Log para debug
      if (isBotRequest) {
        console.log('🤖 Bot detectado:', {
          userAgent: userAgent.substring(0, 100),
          path: req.path,
          ip: req.ip
        });
      }

      // Adicionar flag no request para uso posterior
      req.isBot = isBotRequest;
      req.botUserAgent = userAgent;

      next();
    };
  }

  /**
   * Handler para servir HTML otimizado para bots
   */
  serveBotHTML(pageData = {}) {
    return (req, res) => {
      if (!req.isBot) {
        return res.status(404).send('Not found');
      }

      const html = this.generateBotHTML(pageData);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
      res.send(html);
    };
  }

  /**
   * Handler para servir arquivo HTML pré-renderizado
   */
  servePrerenderedFile(filename) {
    return (req, res) => {
      if (!req.isBot) {
        return res.status(404).send('Not found');
      }

      const filePath = path.join(this.prerenderedDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('Prerendered file not found');
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(filePath);
    };
  }
}

module.exports = BotDetectionMiddleware;
