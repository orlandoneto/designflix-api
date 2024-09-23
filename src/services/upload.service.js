module.exports = class {
  async imagem(req, res) {
    res.status(200).send({ data: { url: req.file.location }, message: null });
  }
  async file(req, res) {
    console.log("req", req.file);
    res.status(200).send({ data: { url: req.file.location }, message: null });
  }
};
