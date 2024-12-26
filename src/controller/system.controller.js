const fs = require("fs");
const stream = require("stream");
const path = require("path");
const logo = path.join(__dirname, "../images/logo.png");
module.exports = (app) => {
  app.get("/", (req, res) => {
    res.status(200).send("API ONLINE!! versão:" + process.env.VERSION_API);
  });

  app.get("/logo", (req, res) => {
    fs.access(logo, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("Logo file not found:", err);
        return res.sendStatus(404);
      }

      res.setHeader("Content-Type", "image/png");
      const r = fs.createReadStream(logo);
      const ps = new stream.PassThrough();

      stream.pipeline(r, ps, (err) => {
        if (err) {
          console.error("Pipeline error:", err);
          return res.sendStatus(500);
        }
      });

      ps.pipe(res);
    });
  });
};
