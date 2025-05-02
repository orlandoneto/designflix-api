module.exports = (app) => {
  app.get("/", (req, res) => {
    res.status(200).send("API ONLINE!! versão:" + process.env.VERSION_API);
  });
};
