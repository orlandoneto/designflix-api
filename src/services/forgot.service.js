const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");

const { User } = require("../models");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

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

      const mailOptions = {
        from: process.env.EMAIL_TO_SEND,
        to: user.email,
        subject: "Redefinição de Senha - DesignFlix",
        template: "forgot",
        context: {
          name: user.name,
          resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
          baseUrl: `${process.env.API_URL}`,
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
    const { password } = req.body;

    try {
      // Decodificar o token
      const decoded = jwt.verify(token, privateKey);

      // Verificar se o usuário existe
      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user) {
        return res.status(404).send({ message: "Usuário não encontrado." });
      }

      // Atualizar a senha do usuário
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.update(
        { password: hashedPassword },
        { where: { id: user.id } }
      );

      res
        .status(200)
        .send({ message: "Senha redefinida com sucesso.", status: 200 });
    } catch (error) {
      res.status(400).send({
        message: "Token inválido ou expirado. Solicite uma nova redefinição.",
      });
    }
  }
};
