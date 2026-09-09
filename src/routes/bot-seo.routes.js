/**
 * Rotas HTML para crawlers (SEO / social).
 * Front canônico é o Next.js — estas rotas são legado do SPA antigo.
 * Desligar HTML de bots: ENABLE_BOT_HTML=false (404 JSON permanece).
 */
const { notFoundHandler } = require("../middleware/errorHandler");

module.exports = function registerBotSeoRoutes(app, botDetection) {
  const enabled = process.env.ENABLE_BOT_HTML !== "false";

  if (enabled) {
    app.get(
      "/",
      botDetection.serveBotHTML({
        title: "Flixdesign - Sua galeria de design",
        description:
          "Flixdesign: Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.",
        image: "/favflix.png",
      })
    );

    app.get(
      "/templates",
      botDetection.serveBotHTML({
        title: "Templates Premium - Flixdesign",
        description:
          "Coleção exclusiva de templates profissionais para web, mobile e print. Designs modernos e responsivos prontos para uso.",
        image: "/favflix.png",
      })
    );

    app.get(
      "/category/:id",
      botDetection.serveBotHTML({
        title: "Categoria de Design - Flixdesign",
        description:
          "Explore nossa coleção de recursos de design organizados por categoria. Encontre exatamente o que precisa para seu projeto.",
        image: "/favflix.png",
      })
    );

    app.get(
      "/user/:id",
      botDetection.serveBotHTML({
        title: "Contribuidor - Flixdesign",
        description:
          "Conheça nossos contribuidores e explore seus trabalhos exclusivos de design.",
        image: "/favflix.png",
      })
    );
  } else {
    console.log("[bot-seo] HTML para bots desabilitado (ENABLE_BOT_HTML=false)");
  }

  app.get("*", (req, res) => {
    if (enabled && req.isBot) {
      return botDetection.serveBotHTML({
        title: "Flixdesign - Sua galeria de design",
        description:
          "Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.",
        image: "/favflix.png",
      })(req, res);
    }

    // Este `app.get("*")` captura todo GET que sobrou, então o 404 de GET nasce
    // aqui e não no fim da pilha. Delegar mantém um corpo só para toda a API.
    return notFoundHandler(req, res);
  });
};
