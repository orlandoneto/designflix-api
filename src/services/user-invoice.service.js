const {
  UserInvoice,
  UserInvoiceProduct,
  ProductCategory,
} = require("../models");

const moment = require("moment");

module.exports = class {
  async create(req, res) {
    try {
      if (!req.body.products) {
        res.status(400).send({ message: "Faltou enviar array de produtos" });
        return;
      }

      const userInvoice = await UserInvoice.create({
        cnpj: req.body.cnpj,
        invoice_number: req.body.invoice_number,
        invoice_date: moment(req.body.invoice_date)
          .utcOffset(0)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }),
        motor_quantity: req.body.motor_quantity,
        remote_control_quantity: req.body.remote_control_quantity,
        photo: req.body.photo,
        user_id: req.params.userId,
        tipo_nota: req.body.tipo_nota,
        termino_garantia: moment(req.body.invoice_date)
          .utcOffset(0)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .add(5, "y"),
        descricao: "",
      });

      for (let index = 0; index < req.body.products.length; index++) {
        const element = req.body.products[index];
        await UserInvoiceProduct.create({
          ...element,
          user_invoice_id: userInvoice.dataValues.id,
        });
      }

      const invoiceData = await UserInvoice.findOne({
        where: { id: userInvoice.dataValues.id },
        include: [
          {
            model: UserInvoiceProduct,
          },
        ],
      });

      res.status(200).send({ data: invoiceData });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAllByUserId(req, res) {
    const userInvoice = await UserInvoice.findAll({
      where: { user_id: req.params.userId },
      include: [
        {
          model: UserInvoiceProduct,
          include: [
            {
              model: ProductCategory,
            },
          ],
        },
      ],
    });

    return res.status(200).send({ data: userInvoice });
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    const invoice = await UserInvoice.findOne({ where });

    if (!invoice || Number(invoice.userId) !== Number(req.params.userId)) {
      res.status(401).send({ message: "Nota fiscal não encontrada" });
      return;
    }

    await UserInvoice.update(req.body, { where });

    res.status(200).send({ status: "ok" });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const invoice = await UserInvoice.findOne({ where });

    if (!invoice || Number(invoice.userId) !== Number(req.params.userId)) {
      res.status(401).send({ message: "Nota fiscal não encontrada" });
      return;
    }

    await UserInvoice.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
