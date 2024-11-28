const { MercadoPagoConfig, Payment } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000, idempotencyKey: "abc" },
});

const payment = new Payment(client);

module.exports = payment;
