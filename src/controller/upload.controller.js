const multer = require("multer");
const Upload = require("../services/upload.service");
const AuthenticateRoute = require("../middleware/authentication");
const multerConfig = require("../config/multer");
const multerConfigFile = require("../config/multerFile");
const upload = require("../config/multerLocal");

module.exports = (app) => {
  const UploadService = new Upload();
/**
 * @openapi
 * /upload/imagem:
 *  post:
 *    description: Endpoint de upload de imagem. Tamanho máximo 10MB
 *    security: []
 *    tags: ["Misc"]
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              path:
 *                type: string
 *              file:
 *                type: string
 *                format: binary
 *    responses:
 *      '200':
 *        description: Arquivo enviado com sucesso.
 */
  // app.post("/upload/imagem", multer(multerConfigFileLocal).single("file"), (req, res) =>
  //   UploadService.imagem(req, res)
  // );
/**
 * @openapi
 * /upload/file:
 *  post:
 *    description: Endpoint de upload de arquivo - não imagem. Tamanho máximo 10MB
 *    security: []
 *    tags: ["Misc"]
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              path:
 *                type: string
 *              file:
 *                type: string
 *                format: binary
 *    responses:
 *      '200':
 *        description: Arquivo enviado com sucesso.
 */
  app.post("/upload/file", upload.single("file"), (req, res) => 
    UploadService.file(req, res)
  );
};
