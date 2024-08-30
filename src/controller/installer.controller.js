const Installer = require("../services/installer.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const InstallerService = new Installer();
/**
 * @openapi
 * /installer:
 *  post:
 *    description: Endpoint de criação de um instalador.
 *    tags: ["Admin", "Instalador"]
 *    security: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string 
 *              fantasy:
 *                type: string
 *              razao_social:
 *                type: string
 *              photo:
 *                type: string
 *              documentPhoto:
 *                type: string
 *              email:
 *                type: string
 *              password:
 *                type: string
 *              documento:
 *                type: string
 *              phone:
 *                type: string
 *              stateRegistration:
 *                type: string
 *              isResetPassword:
 *                type: integer
 *              postalCode:
 *                type: string
 *              street:
 *                type: string
 *              number:
 *                type: integer
 *              complement:
 *                type: string
 *              district:
 *                type: string
 *              city:
 *                type: string
 *              state:
 *                type: string
 *              country:
 *                type: string
 *    responses:
 *      '200':
 *        description: Sucesso. Retorna Token do instalador criado. Este deve ser ignorado pelo admin.
 *      '500':
 *        description: Erro.
 */
  app.post("/installer", (req, res) => InstallerService.create(req, res));



/**
 * @openapi
 * /installer/authenticate:
 *  post:
 *    description: Endpoint de autenticação do instalador! Retorna o Token para ser usado em outras requests.
 *    security: []
 *    tags: ["Auth"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *              password:
 *                type: string
 *    responses:
 *      '200':
 *        description: Login efetuado com sucesso.
 *      '401':
 *        description: Não autorizado.
 *      '500':
 *        description: Erro.
 */
  app.post("/installer/authenticate", (req, res) =>
    InstallerService.authenticate(req, res)
  );


/**
 * @openapi
 * /installer:
 *  get:
 *    description: Este endpoint serve para recuperar os dados de um instalador.
 *    tags: ["Instalador", "Admin"]
 *    parameters:
 *      - in: query
 *        name: installerId
 *        schema:
 *          type: integer
 *        description: Id do instalador a ser recuperado
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.get("/installer", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    InstallerService.get(req, res)
  );



/**
 * @openapi
 * /installerGetSelf:
 *  get:
 *    description: Este endpoint serve para recuperar os dados do instalador logado. Só é possível acioná-lo com um token de instalador válido.
 *    tags: ["Instalador"]
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.get("/installerGetSelf", AuthenticateRoute(['installer']), (req, res) =>
    InstallerService.getSelf(req, res)
  );



  app.get("/installers", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    InstallerService.getAll(req, res)
  );


 /**
 * @openapi
 * /approveInstaller:
 *  get:
 *    description: Endpoint de aprovação de cadastro de um instalador. Só pode ser chamado por admins.
 *    tags: ["Admin"]
 *    parameters:
 *      - in: query
 *        name: installerId
 *        schema:
 *          type: integer
 *        description: Id do instalador a ser aprovado
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '500':
 *        description: Erro.
 * 
 */
  app.get("/approveInstaller", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    InstallerService.approve(req, res)
  );



  /**
 * @openapi
 * /installer/reset-password:
 *  post:
 *    description: Endpoint de recuperação de senha do instalador! Envia e-mail com nova senha
 *    security: []
 *    tags: ["Instalador"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *    responses:
 *      '200':
 *        description: E-mail enviado com sucesso.
 *      '400':
 *        description: Parâmetro E-mail não enviado ou usuário não encontrado.
 *      '500':
 *        description: Erro. E-mail não enviado.
 * 
 */
  app.post("/installer/reset-password", (req, res) =>
    InstallerService.resetPassword(req, res)
  );


/**
 * @openapi
 * /installer:
 *  put:
 *    description: Endpoint de Edição de um instalador. Só pode ser chamado por Admins ou pelo próprio instalador. Se chamado por Admin deve ser fornecido o ID.
 *    tags: ["Admin", "Instalador"]
 *    parameters:
 *      - in: query
 *        name: installerId
 *        schema:
 *          type: integer
 *        required: false
 *        description: ID do instalador em questão. Enviar se chamado por Admin.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string 
 *              fantasy:
 *                type: string
 *              razao_social:
 *                type: string
 *              photo:
 *                type: string
 *              documentPhoto:
 *                type: string
 *              email:
 *                type: string
 *              password:
 *                type: string
 *              documento:
 *                type: string
 *              phone:
 *                type: string
 *              stateRegistration:
 *                type: string
 *              isResetPassword:
 *                type: integer
 *              postalCode:
 *                type: string
 *              street:
 *                type: string
 *              number:
 *                type: integer
 *              complement:
 *                type: string
 *              district:
 *                type: string
 *              city:
 *                type: string
 *              state:
 *                type: string
 *              country:
 *                type: string
 *              status:
 *                type: string
 *                enum: [APEND, BFIX, CACTIVE]
 *              statusMessage:
 *                type: string
 *              bank_bank:
 *                type: string
 *              bank_number:
 *                type: integer
 *              bank_agency:
 *                type: integer
 *              bank_name:
 *                type: string
 *              bank_documento:
 *                type: string
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não Autorizado.
 *      '500':
 *        description: Erro.
 */
  app.put("/installer", AuthenticateRoute(['admin', 'super_admin', 'installer']), (req, res) =>
    InstallerService.update(req, res)
  );


/**
 * @openapi
 * /installer/inscricao:
 *  put:
 *    description: Endpoint de inscrição do instalador em um treinamento. Só pode ser chamado por instaladores.
 *    tags: ["Instalador"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id_treinamento:
 *                type: string
 *              action:
 *                type: string
 *                enum: [inscrever, cancelar]
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '400':
 *        description: Ação inválida.
 *      '500':
 *        description: Erro. 
 * 
 */
  app.put("/installer/inscricao", AuthenticateRoute(['installer']), (req, res) =>
    InstallerService.inscricao(req, res)
  );


/**
 * @openapi
 * /installer/aprovacao/{id}:
 *  put:
 *    description: Endpoint de aprovação do instalador em um treinamento. Só pode ser chamado por admins.
 *    tags: ["Admin"]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: ID do instalador em questão.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id_treinamento:
 *                type: string
 *              action:
 *                type: string
 *                enum: [aprovar, reprovar]
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '400':
 *        description: Ação inválida.
 *      '500':
 *        description: Erro. 
 * 
 */
  app.put("/installer/aprovacao/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    InstallerService.aprovacao_treinamento(req, res)
  );
};
