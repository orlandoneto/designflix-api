const { LandingPage } = require("../models");

module.exports = class LandingPageService {
  async createOrUpdate(req, res) {
    try {
      const { username, title, videoUrl, imageUrl, ctaText, ctaLink, trackingCode } = req.body;

      const userId = req.body.user_id

      if (!username || !title) {
        res.status(400).json({ message: "username e title são obrigatórios" });
        return;
      }

      const [landing, created] = await LandingPage.findOrCreate({
        where: { username },
        defaults: { username, title, videoUrl, imageUrl, ctaText, ctaLink, trackingCode, userId },
      });

      if (!created) {
        const updateData = { title, videoUrl, imageUrl, ctaText, ctaLink, trackingCode };
        if (userId !== null) updateData.userId = userId;
        await landing.update(updateData);
      }

      res.status(created ? 201 : 200).json(landing);
    } catch (err) {
      res.status(500).json({ message: "Erro ao criar/atualizar landpage", error: err.message });
    }
  }

  async getByUsername(req, res) {
    try {
      const { username } = req.params;
      const headerUserId = req.headers["x-user-id"] || req.headers["user-id"];
      const userId = headerUserId ? Number(headerUserId) : null;
      if (!username) {
        res.status(400).json({ message: "username é obrigatório" });
        return;
      }

      const where = userId ? { username, user_id: userId } : { username };
      const landing = await LandingPage.findOne({ where });
      if (!landing) {
        res.status(404).json({ message: "Landpage não encontrada" });
        return;
      }

      res.status(200).json(landing);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar landpage", error: err.message });
    }
  }

  async getByUserId(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ message: "userId é obrigatório" });
        return;
      }

      const landing = await LandingPage.findOne({ where: { user_id: Number(userId) } });
      if (!landing) {
        res.status(404).json({ message: "Landpage não encontrada" });
        return;
      }

      res.status(200).json(landing);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar landpage por userId", error: err.message });
    }
  }
};
