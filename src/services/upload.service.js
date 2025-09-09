module.exports = class {
  async imagem(req, res) {
    if (!req.file || !req.file.location) {
      return res.status(400).send({ data: null, message: "Nenhum arquivo enviado" });
    }
    res.status(200).send({ data: { url: req.file.location }, message: null });
  }
  async file(req, res) {
    if (!req.file || !req.file.location) {
      return res.status(400).send({ data: null, message: "Nenhum arquivo enviado" });
    }
    res.status(200).send({ data: { url: req.file.location }, message: null });
  }
};
