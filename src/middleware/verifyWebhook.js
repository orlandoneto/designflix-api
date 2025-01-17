const getRawBody = require("raw-body");

const verifyWebhook = (req, res, next) => {
  getRawBody(
    req,
    {
      length: req.headers["content-length"],
      limit: "1mb",
      encoding: req.headers["content-type"]?.includes("application/json")
        ? "utf-8"
        : undefined,
    },
    (err, body) => {
      if (err) {
        console.error("Erro ao processar corpo da requisição:", err.message);
        return res.status(400).send("Webhook Error: Corpo inválido");
      }

      req.body = body;
      next();
    }
  );
};

module.exports = verifyWebhook;
