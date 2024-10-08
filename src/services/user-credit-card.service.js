const { UserCreditCard } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const hasCreditCardCreated = await UserCreditCard.findOne({
        where: {
          user_id: req.params.userId,
        },
      });

      if (hasCreditCardCreated) {
        res
          .status(400)
          .send({ message: "só é possível criar um cartão de crédito" });
        return;
      }

      const userCreditCard = await UserCreditCard.create({
        ...req.body,
        user_id: req.params.userId,
      });
      res.status(200).send({ data: userCreditCard });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAllByUserId(req, res) {
    const where = { user_id: req.params.userId };
    const userCreditCard = await UserCreditCard.findAll({ where });

    return res.status(200).send({ data: userCreditCard });
  }

  async updateById(req, res) {
    try {
      let shouldUpdate = true;
      let self = false;

      const where = { id: Number(req.params.id) };

      const userCreditCard = await UserCreditCard.findOne({ where });

      if (!userCreditCard) {
        return res.status(400).send({ message: "Cartão não encontrado" });
      } else {
        if (req.params.userType === "user") {
          self = true;
        }

        if (shouldUpdate) {
          if (
            self &&
            Number(userCreditCard.user_id) !== Number(req.params.userId)
          ) {
            return res
              .status(401)
              .send({ message: "Você não pode fazer isto!" });
          } else {
            if (
              !req.body.hasOwnProperty("user_id") ||
              Number(req.body.user_id) === Number(userCreditCard.user_id)
            ) {
              await UserCreditCard.update(req.body, { where });

              const newCard = await UserCreditCard.findOne({ where });

              return res.status(200).send({ status: "ok", data: newCard });
            } else {
              return res
                .status(401)
                .send({ message: "Você não pode fazer isto!" });
            }
          }
        } else {
          return res.status(401).send({ message: "Você não pode fazer isto!" });
        }
      }
    } catch (err) {
      return res.status(500).send({ message: err.message });
    }
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const userCreditCard = await UserCreditCard.findOne({ where });

    if (
      !userCreditCard ||
      Number(userCreditCard.user_id) !== Number(req.params.userId)
    ) {
      res.status(400).send({ message: "Cartão de crédito não encontrado" });
      return;
    }

    await UserCreditCard.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
