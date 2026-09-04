const { ok, badRequest } = require("../utils/httpResponse");

/**
 * Resposta HTTP do upload de avatar (após gravar no storage).
 * Envelope canônico: { success, message, data: { url } }
 */
module.exports = class UploadService {
  async imagem(req, res) {
    return this.file(req, res);
  }

  async file(req, res) {
    if (!req.file || !req.file.location) {
      return badRequest(res, "Nenhum arquivo enviado");
    }
    return ok(res, {
      message: "Avatar enviado",
      data: { url: req.file.location },
    });
  }
};
