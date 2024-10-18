const { Tags } = require("../models");

class TagsController {
  // Buscar todas as tags
  async getAll(req, res) {
    try {
      const tags = await Tags.findAll();
      res.status(200).json(tags);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar tags", error: error.message });
    }
  }

  // Criar uma nova tag
  async create(req, res) {
    try {
      const tag = await Tags.create(req.body);
      res.status(201).json(tag);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar tag", error: error.message });
    }
  }

  // Excluir uma tag
  async delete(req, res) {
    try {
      const tag = await Tags.findByPk(req.params.id);
      if (!tag) {
        res.status(404).send({ message: "Tag não encontrada" });
        return;
      }

      await Tags.destroy({ where: { id: req.params.id } });

      res.status(200).json({ message: "Tag excluída com sucesso", tag });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao excluir tag", error: error.message });
    }
  }
}

module.exports = new TagsController();
