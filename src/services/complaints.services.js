const { UserComplaints } = require("../models");

class ComplaintsServices {
  // Buscar todas as ComplaintsServices
  async getAll(req, res) {
    try {
      const complaints = await UserComplaints.findAll();
      res.status(200).json(complaints);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Erro ao buscar ComplaintsServices",
          error: error.message,
        });
    }
  }

  // Criar uma nova ComplaintsServices
  async create(req, res) {
    try {
      const complaints = await UserComplaints.create(req.body);
      res.status(201).json(complaints);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Erro ao criar ComplaintsServices",
          error: error.message,
        });
    }
  }

  // Excluir uma ComplaintsServices
  async delete(req, res) {
    try {
      const complaints = await UserComplaints.findByPk(
        req.params.id
      );
      if (!complaints) {
        res.status(404).send({ message: "UserComplaints não encontrada" });
        return;
      }

      await UserComplaints.destroy({ where: { id: req.params.id } });

      res
        .status(200)
        .json({
          message: "UserComplaints excluída com sucesso",
          complaints,
        });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Erro ao excluir UserComplaints",
          error: error.message,
        });
    }
  }
}

module.exports = new ComplaintsServices();
