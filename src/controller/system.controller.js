const fs = require("fs");
const stream = require("stream");
const path = require("path");

module.exports = (app) => {
  app.get("/", (req, res) => {
    res.status(200).send("API ONLINE!! versão:" + process.env.VERSION_API);
  });

  app.get("/logo", (req, res) => {
    const logo = path.join(__dirname, "../images/logo.png");
    res.sendFile(logo);
  });
};
