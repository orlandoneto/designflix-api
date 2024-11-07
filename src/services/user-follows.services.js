const { UserFollows } = require("../models");

class UserFollowsServices {
  async create(req, res) {
    try {
      const { user_id, contributor_image_user_id, contributor_image_admin_id } =
        req.body;
      const userFollows = [];

      if (contributor_image_user_id) {
        const userFollowUser = await UserFollows.create({
          user_id,
          contributor_image_user_id,
          contributor_image_admin_id: null,
        });
        userFollows.push(userFollowUser);
      }

      if (contributor_image_admin_id) {
        const userFollowAdmin = await UserFollows.create({
          user_id,
          contributor_image_user_id: null,
          contributor_image_admin_id,
        });
        userFollows.push(userFollowAdmin);
      }

      if (userFollows.length === 0) {
        return res
          .status(400)
          .json({ message: "Nenhuma informação de seguidor fornecida" });
      }

      res.status(201).json(userFollows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar UserFollows", error: error.message });
    }
  }

  async getIsfollow(req, res) {
    const { contributor_image_user_id, contributor_image_admin_id } =
      req.params;

    try {
      let followExists = null;

      if (contributor_image_user_id !== "null") {
        followExists = await UserFollows.findOne({
          where: { contributor_image_user_id },
        });
      }

      if (contributor_image_admin_id !== "null") {
        followExists = await UserFollows.findOne({
          where: { contributor_image_admin_id },
        });
      }

      return res.json({ isFollowing: !!followExists });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao verificar status de follow" });
    }
  }

  async getTotalFollowers(req, res) {
    try {
      const { contributor_image_user_id } = req.params;

      const totalFollowers = await UserFollows.count({
        where: { contributor_image_user_id },
      });

      res.status(200).json({ contributor_image_user_id, totalFollowers });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao buscar total de seguidores",
        error: error.message,
      });
    }
  }
}

module.exports = new UserFollowsServices();
