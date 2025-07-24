const { UserDownloads, sequelize } = require("../models");
const UserService = require("./user.service");
const UserCommissionsServices = require("./user-commissions.service");

class UserDownloadsServices {
  async getUserDownloads(req, res) {
    try {
      const { user_id } = req.params;
      const downloads = await UserDownloads.findAll({
        where: { user_id },
        attributes: [
          "contributor_image_user_id",
          "user_main_grid_id",
          "total_downloads",
        ],
      });

      res.status(200).json(downloads);
    } catch (error) {
      res.status(500).json({
        message: "Erro ao buscar downloads do usuário",
        error: error.message,
      });
    }
  }

  async getContributorDownloads(req, res) {
    try {
      const { contributor_image_user_id } = req.params;

      const downloads = await UserDownloads.findAll({
        where: { contributor_image_user_id },
        attributes: [
          "contributor_image_user_id",
          [
            sequelize.fn("SUM", sequelize.col("total_downloads")),
            "total_downloads",
          ],
        ],
        group: ["contributor_image_user_id"],
      });

      if (downloads.length === 0) {
        return res.status(404).json({
          message: "Nenhum download encontrado para este contribuidor",
        });
      }

      res.status(200).json(downloads);
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Erro ao buscar downloads do contribuidor",
        error: error.message,
      });
    }
  }

  async getTotalDownloadsByImage(req, res) {
    try {
      const { user_main_grid_id } = req.params;

      const downloads = await UserDownloads.sum("total_downloads", {
        where: { user_main_grid_id },
      });

      if (downloads === 0 || downloads === null) {
        return res
          .status(404)
          .json({ message: "Nenhum download encontrado para esta imagem" });
      }

      res.status(200).json({ user_main_grid_id, total_downloads: downloads });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao buscar total de downloads para a imagem",
        error: error.message,
      });
    }
  }

  async createOrUpdateDownload(req, res) {
    try {
      const {
        user_id,
        contributor_image_user_id,
        user_main_grid_id,
      } = req.body;

      if (!user_id || !user_main_grid_id) {
        return res
          .status(400)
          .json({ message: "Parâmetros obrigatórios ausentes" });
      }

      if (!contributor_image_user_id) {
        return res.status(400).json({ message: "ID do contribuidor ausente" });
      }

      const [download, created] = await UserDownloads.findOrCreate({
        where: {
          user_id,
          user_main_grid_id,
          contributor_image_user_id,
        },
        defaults: { total_downloads: 1 },
      });

      if (!created) {
        download.total_downloads += 1;
        await download.save();
      }

      const updateBalanceResult = await UserService._updateBalance(user_id);

      if (!updateBalanceResult.success) {
        return res.status(500).json({
          message: "Erro ao atualizar o saldo do usuário",
          error: updateBalanceResult.error,
        });
      }

      const createCommissionResult =
        await UserCommissionsServices._createCommission(contributor_image_user_id);

      if (!createCommissionResult.success) {
        return res.status(500).json({
          message: "Erro ao criar a comissão",
          error: createCommissionResult.error,
        });
      }

      res.status(201).json(download);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao registrar download", error: error.message });
    }
  }
}

module.exports = new UserDownloadsServices();
