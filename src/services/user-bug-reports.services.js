const { UserBugReports } = require("../models");

class UserBugController {
  // Buscar todas as userBugReports
  async getAll(req, res) {
    try {
      const userBugReports = await UserBugReports.findAll();
      res.status(200).json(userBugReports);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar userBugReports", error: error.message });
    }
  }

  // Criar uma nova userBugReports
  async create(req, res) {
    try {
      const userBugReports = await UserBugReports.create(req.body);
      res.status(201).json(userBugReports);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar userBugReports", error: error.message });
    }
  }

  // Excluir uma userBugReports
  async delete(req, res) {
    try {
      const userBugReports = await UserBugReports.findByPk(req.params.id);
      if (!userBugReports) {
        res.status(404).send({ message: "UserBugReports não encontrada" });
        return;
      }

      await UserBugReports.destroy({ where: { id: req.params.id } });

      res.status(200).json({ message: "UserBugReports excluída com sucesso", userBugReports });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao excluir UserBugReports", error: error.message });
    }
  }
}

module.exports = new UserBugController();
