const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");

const { User } = require("../models");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);
const { FORGOT_REDIRECT_URL } = require("../utils/constants/constants");

module.exports = class {
  async forgotPassword(req, res) {
    const { email } = req.body;

    try {
      // Verificar se o usuário existe
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).send({ message: "Usuário não encontrado" });
      }

      // Gerar token de redefinição de senha
      const resetToken = jwt.sign(
        { id: user.id, email: user.email },
        privateKey,
        {
          algorithm: "RS256",
          expiresIn: "1h", // Token válido por 1 hora
        }
      );

      // Enviar email com o link de redefinição
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST_SMTP,
        port: process.env.EMAIL_PORT_SMTP,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER_SMTP,
          pass: process.env.EMAIL_PASS_SMTP,
        },
      });

      transporter.use(
        "compile",
        hbs({
          viewEngine: {
            extName: ".hbs",
            partialsDir: path.resolve(__dirname, "../views"),
            defaultLayout: false,
          },
          viewPath: path.resolve(__dirname, "../views"),
          extName: ".hbs",
        })
      );

      const redirectUrl = process.env.NODE_ENV === 'production' ? FORGOT_REDIRECT_URL.prod_url : process.env.NODE_ENV === 'development' ? FORGOT_REDIRECT_URL.dev_url : FORGOT_REDIRECT_URL.test_url;

      const mailOptions = {
        from: process.env.EMAIL_USER_SMTP,
        to: user.email,
        subject: "Redefinição de Senha - FlixDesign",
        template: "forgot",
        context: {
          name: user.name,
          resetLink: `${redirectUrl}/reset-password?token=${resetToken}`,
          baseUrl: process.env.API_URL,
        },
      };

      await transporter.sendMail(mailOptions);

      res.status(200).send({
        message: "E-mail de redefinição de senha enviado com sucesso.",
      });
    } catch (error) {
      res.status(500).send({ message: "Erro ao processar a solicitação." });
    }
  }

  async forgotCheckToken(req, res) {
    const { token } = req.params;

    try {
      // Decodificar o token
      const decoded = jwt.verify(token, privateKey);

      // Verificar se o usuário existe
      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user) {
        return res.status(404).send({ message: "Usuário não encontrado." });
      }

      res
        .status(200)
        .send({ data: user, message: "Usuário com token válido." });
    } catch (error) {
      res.status(400).send({
        message: "Token inválido ou expirado. Solicite uma nova redefinição.",
      });
    }
  }

  async forgotUpdatePassword(req, res) {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    try {
      // Validações de entrada
      if (!password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Senha e confirmação de senha são obrigatórias"
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Senha e confirmação não coincidem"
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Senha deve ter pelo menos 6 caracteres"
        });
      }

      // Decodificar o token
      const decoded = jwt.verify(token, privateKey);

      // Verificar se o usuário existe
      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado"
        });
      }

      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "A nova senha deve ser diferente da senha atual"
        });
      }

      // Atualizar a senha do usuário
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.update(
        {
          password: hashedPassword,
          isResetPassword: 0, // Remove flag de reset de senha
          lastPasswordChange: new Date() // Campo para invalidar tokens antigos
        },
        { where: { id: user.id } }
      );

      // Log da alteração de senha
      console.log(`🔐 Senha redefinida via token para usuário ID: ${user.id} - Todos os tokens foram invalidados`);

      res.status(200).json({
        success: true,
        message: "Senha redefinida com sucesso. Faça login novamente.",
        requiresReauth: true // Flag para o frontend saber que precisa fazer login
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token inválido ou expirado. Solicite uma nova redefinição"
        });
      }

      console.error("Erro ao redefinir senha:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor ao redefinir senha"
      });
    }
  }
};
