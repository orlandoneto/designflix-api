const payment = require("../config/mercadopago");

module.exports = class {
  async createPix(req, res) {
    const body = {
      transaction_amount: req.body.transaction_amount,
      description: req.body.description,
      payment_method_id: "pix",
      payer: {
        email: req.body.payer?.email,
      },
      notification_url: process.env.MERCADOPAGO_WEB_HOOK,
    };

    const bodyPlan = {
      user_id: req.body.userId,
      plan_id: req.body.planId,
    };

    payment
      .create({ body })
      .then((response) => {
        res.status(201).json({ data: response });
      })
      .catch((error) => {
        console.error("Erro ao criar transação PIX:", error);
        const errorStatus = error.status || 500;
        const errorMessage = error.message || "Erro ao processar transação";
        res.status(errorStatus).json({ error_message: errorMessage });
      });
  }

  async processPayment(req, res) {
    console.log("req.body", req.body);

    res.status(200).json({ data: "ok" });
  }
};
