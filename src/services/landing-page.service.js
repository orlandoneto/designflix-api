const { LandingPage } = require("../models");

module.exports = class LandingPageService {
  async createOrUpdate(req, res) {
    try {
      const { username, title, videoUrl, imageUrl, ctaText, ctaLink, trackingCode } = req.body;

      if (!username || !title) {
        res.status(400).json({ message: "username e title são obrigatórios" });
        return;
      }

      const [landing, created] = await LandingPage.findOrCreate({
        where: { username },
        defaults: { username, title, videoUrl, imageUrl, ctaText, ctaLink, trackingCode },
      });

      if (!created) {
        await landing.update({ title, videoUrl, imageUrl, ctaText, ctaLink, trackingCode });
      }

      res.status(created ? 201 : 200).json(landing);
    } catch (err) {
      res.status(500).json({ message: "Erro ao criar/atualizar landpage", error: err.message });
    }
  }

  async getByUsername(req, res) {
    try {
      const { username } = req.params;
      if (!username) {
        res.status(400).json({ message: "username é obrigatório" });
        return;
      }

      const landing = await LandingPage.findOne({ where: { username } });
      if (!landing) {
        res.status(404).json({ message: "Landpage não encontrada" });
        return;
      }

      res.status(200).json(landing);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar landpage", error: err.message });
    }
  }
};


