module.exports = (app) => {
/**
 * @openapi
 * /:
 *  get:
 *    description: API health check!
 *    tags: ["Misc"]
 *    security: []
 *    responses:
 *      '200':
 *        description: Esse endpoint é para AWS checar se o serviço está online.
 */
  app.get("/", (req, res) => {
    res.status(200).send("API ONLINE!!");
  });
};
