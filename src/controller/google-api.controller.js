const Google = require("../services/google.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const GoogleService = new Google();

  /**
   * @openapi
   * /getAddress:
   *  post:
   *    description: Endpoint para recuperar do google lista de endereços.
   *    tags: ["Misc"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              address:
   *                type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado.
   *      '500':
   *        description: Erro.
   */
  app.post(
    "/getAddress",
    AuthenticateRoute(["super_admin", "admin", "user"]),
    (req, res) => GoogleService.getAddress(req, res)
  );

  /**
   * @openapi
   * /getLatLong:
   *  post:
   *    description: Endpoint para recuperar do google latitude e longitude de um endereço.
   *    tags: ["Misc"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              address:
   *                type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado.
   *      '500':
   *        description: Erro.
   */
  app.post(
    "/getLatLong",
    AuthenticateRoute(["super_admin", "admin", "user"]),
    (req, res) => GoogleService.getLatLong(req, res)
  );

  /**
   * @openapi
   * /getDistance:
   *  post:
   *    description: Endpoint para recuperar distancia a partir de latitudes e longitudes.
   *    tags: ["Misc"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              start:
   *                type: object
   *                properties:
   *                  latitude:
   *                      type: string
   *                  longitude:
   *                      type: string
   *              end:
   *                type: object
   *                properties:
   *                  latitude:
   *                      type: string
   *                  longitude:
   *                      type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '400':
   *        description: Bad request.
   *      '401':
   *        description: Não autorizado.
   *      '500':
   *        description: Erro.
   */
  app.post(
    "/getDistance",
    AuthenticateRoute(["super_admin", "admin", "user"]),
    (req, res) => GoogleService.getDistance(req, res)
  );
};
