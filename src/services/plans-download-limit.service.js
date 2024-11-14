const { PlansDownloadLimits, User } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const { userId, currentCountDownloads } = req.body;
      const newLimit = await PlansDownloadLimits.create({
        user_id: userId,
        current_count_downloads: currentCountDownloads,
      });

      res.status(201).json(newLimit);
    } catch (error) {
      console.error("Erro ao criar limite de downloads:", error);
      res.status(500).json({ error: "Erro ao criar limite de downloads" });
    }
  }

  async getAll(req, res) {
    try {
      const limits = await PlansDownloadLimits.findAll({
        include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      });
      res.status(200).json(limits);
    } catch (error) {
      console.error("Erro ao buscar limites de downloads:", error);
      res.status(500).json({ error: "Erro ao buscar limites de downloads" });
    }
  }

  async findByUserId(req, res) {
    const { user_id } = req.params;

    try {
      const limit = await PlansDownloadLimits.findOne({
        where: { user_id },
      });

      if (!limit) {
        return res
          .status(200)
          .json({ updatedAt: null, current_count_downloads: 0 });
      }

      res.status(200).json(limit);
    } catch (error) {
      console.error(
        "Erro ao buscar limite de downloads pelo ID do usuário:",
        error
      );
      res.status(500).json({ error: "Erro ao buscar limite de downloads" });
    }
  }

  async update(req, res) {
    const { user_id } = req.params;

    try {
      let limit = await PlansDownloadLimits.findOne({
        where: { user_id },
      });

      if (limit) {
        limit = await limit.update({
          current_count_downloads: limit.current_count_downloads + 1,
          updatedAt: new Date(),
        });
      } else {
        limit = await PlansDownloadLimits.create({
          user_id,
          current_count_downloads: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.status(200).json(limit);
    } catch (error) {
      console.error("Erro ao atualizar limite de downloads:", error);
      res.status(500).json({ error: "Erro ao atualizar limite de downloads" });
    }
  }

  async delete(req, res) {
    const { user_id } = req.params;

    try {
      const limit = await PlansDownloadLimits.findOne({
        where: { user_id },
      });

      if (!limit) {
        return res
          .status(200)
          .json({ updatedAt: null, current_count_downloads: 0 });
      }

      await limit.destroy();
      res
        .status(200)
        .json({ message: "Limite de downloads excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir limite de downloads:", error);
      res.status(500).json({ error: "Erro ao excluir limite de downloads" });
    }
  }
};
