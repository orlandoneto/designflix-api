const LocalObjectStore = require("../utils/localObjectStore");

/**
 * Cópia local do download signed-URL (STORAGE_TYPE=local).
 * downloadS3.service.js (S3) permanece intacto.
 */
class DownloadLocal {
  async getSignedUrlS3(req, res) {
    const key = req.query.key;
    try {
      if (!key) {
        return res.status(400).send({ message: "Parâmetro key é obrigatório" });
      }
      const url = LocalObjectStore.publicUrlForKey(String(key).replace(/^uploads\//, ""));
      return res
        .status(200)
        .send({ data: { url }, message: "URL gerada com sucesso" });
    } catch (error) {
      console.error("Erro ao gerar URL local:", error);
      res.status(500).send({ message: "Erro ao gerar URL local", error });
    }
  }
}

module.exports = new DownloadLocal();
