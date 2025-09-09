const AuthenticateRoute = require("../../middleware/authentication");
const IAService = require("../../services/ia/remove-background.service");

module.exports = (app) => {
  app.post(
    "/ia/remove-background",
    AuthenticateRoute(["user"]),
    async (req, res) => {
      try {
        const { imageData, imageType } = req.body || {};
        const result = await IAService.removeBackground({ imageData, imageType });
        return res.json({ success: true, processedImageUrl: result.processedImageUrl, message: "Fundo removido com sucesso!" });
      } catch (err) {
        const status = err.status || 500;
        if (status === 200) {
          return res.status(200).json({ success: false, processedImageUrl: "", message: err.message || "Erro ao processar a imagem." });
        }
        return res.status(status).json({ success: false, processedImageUrl: "", message: err.message || "Erro interno do servidor. Tente novamente." });
      }
    }
  );
};


