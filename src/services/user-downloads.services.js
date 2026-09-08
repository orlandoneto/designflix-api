const { UserDownloads, UserMainGrid, sequelize } = require("../models");
const UserService = require("./user.service");
const UserCommissionsServices = require("./user-commissions.service");
const { ok, badRequest, serverError } = require("../utils/httpResponse");
const {
  GRID_LIST_ATTRIBUTES,
  mapLibraryGridItem,
} = require("./library/map-library-grid-item");

class UserDownloadsServices {
  async getUserDownloads(req, res) {
    try {
      const authUserId = Number(req.params.userId);
      const requestedId = Number(req.params.user_id);
      if (!authUserId || !requestedId) {
        return badRequest(res, "Usuário inválido");
      }
      if (authUserId !== requestedId) {
        return badRequest(res, "Só é permitido consultar os próprios downloads");
      }

      const rows = await UserDownloads.findAll({
        where: { user_id: requestedId },
        include: [
          {
            model: UserMainGrid,
            as: "user_main_grid",
            attributes: GRID_LIST_ATTRIBUTES,
            required: false,
          },
        ],
        order: [["updatedAt", "DESC"]],
      });

      const data = rows
        .map((row) => {
          const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
          const item = mapLibraryGridItem(plain.user_main_grid);
          if (!item) return null;
          return {
            id: plain.id,
            user_main_grid_id: plain.user_main_grid_id,
            total_downloads: Number(plain.total_downloads) || 0,
            updatedAt: plain.updatedAt || plain.updated_at || null,
            item,
          };
        })
        .filter(Boolean);

      return ok(res, {
        message: "Downloads listados",
        data,
        meta: { count: data.length },
      });
    } catch (error) {
      console.error("[downloads/getUserDownloads]", error.message);
      return serverError(res, "Erro ao buscar downloads do usuário");
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

      // Quem recebe é o dono do arquivo (`contributor_image_user_id`), não
      // quem baixou. `user_commissions` é o livro-caixa e `user.balance` é
      // só o cache que o saque consulta — por isso a comissão é gravada
      // primeiro: se o cache falhar, o ledger ainda permite reconciliar.
      const createCommissionResult =
        await UserCommissionsServices._createCommission(
          contributor_image_user_id,
          { downloaderUserId: user_id }
        );

      if (createCommissionResult.skipped) {
        return res.status(201).json(download);
      }

      if (!createCommissionResult.success) {
        return res.status(500).json({
          message: "Erro ao criar a comissão",
          error: createCommissionResult.error,
        });
      }

      const updateBalanceResult = await UserService._updateBalance(
        contributor_image_user_id
      );

      if (!updateBalanceResult.success) {
        return res.status(500).json({
          message: "Erro ao atualizar o saldo do colaborador",
          error: updateBalanceResult.error,
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
