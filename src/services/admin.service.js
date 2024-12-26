const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");

const { Admin } = require("../models");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

module.exports = class {
  async get(req, res) {
    const admin = await Admin.findOne({
      where: { id: req.params.adminId },
      attributes: { exclude: ["password"] },
    });

    res.status(200).send({ data: admin });
  }

  async getByEmail(email) {
    const admin = await Admin.findOne({
      where: { email },
    });

    return admin;
  }

  async create(req, res) {
    try {
      const { email, password, name } = req.body;

      const hasAdminEmail = await this.getByEmail(email);

      if (hasAdminEmail) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o e-mail informado" });
        return;
      }

      const admin = await Admin.create({
        email,
        password,
        name,
      });

      const adminData = admin.dataValues;

      delete adminData.password;

      res.status(200).send({ data: admin });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async authenticate(req, res) {
    try {
      const { email, password } = req.body;
      const admin = await this.getByEmail(email);

      if (!admin) {
        res.status(401).send({ message: "Usuário não encontrado" });
        return;
      }

      const validatePassword = await bcrypt.compareSync(
        password,
        admin.password
      );

      if (!validatePassword) {
        res.status(401).send({ message: "E-mail ou Senha incorreta" });
        return;
      }

      let adminData = admin.dataValues;

      if (adminData.super_admin) {
        adminData.userType = "super_admin";
      } else {
        adminData.userType = "admin";
      }

      delete adminData.password;

      var token = jwt.sign(adminData, privateKey, {
        algorithm: "RS256",
        expiresIn: 60 * 60 * 24 * 7 * 2,
      });

      res.status(200).send({ data: adminData, token: token });
      return;
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  }

  async resetPassword(req, res) {
    const scramble = (string) => {
      let a = string.split(""),
        n = a.length;

      for (let i = n - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a.join("");
    };

    if (!req.body.email) {
      res.status(400).send({ message: "email é um parâmetro obrigatório" });
      return;
    }

    const time = scramble(String(new Date().getTime()).slice(2, 10));

    const encrypted = await bcrypt.hashSync(time, bcrypt.genSaltSync(10));

    const admin = await this.getByEmail(req.body.email);

    if (!admin) {
      res.status(400).send({ message: "usuário não encontrado" });
    }

    await Admin.update(
      { password: encrypted, isResetPassword: 1 },
      {
        where: {
          id: admin.id,
        },
      }
    );

    let transporter = nodemailer.createTransport({
      host: "email-smtp.us-east-1.amazonaws.com",
      port: 465,
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

    try {
      const mailOptions = {
        from: process.env.EMAIL_TO_SEND,
        to: admin.email,
        subject: "Reset de Senha - Design Flix",
        text: "",
        template: "index",
        context: {
          newPassword: time,
          name: admin.name,
          baseUrl: process.env.API_URL,
        },
      };

      let sent = await transporter.sendMail(mailOptions);

      res
        .status(200)
        .send({ data: { message: "E-mail enviado com sucesso!", sent: sent } });
    } catch (err) {
      res
        .status(500)
        .send({ data: { message: "E-mail não enviado!", sent: err } });
    }
  }

  async update(req, res) {
    const where = { id: req.params.adminId };

    const oldAdmin = await Admin.findOne({ where });

    const updatedAdmin = { ...req.body, ...oldAdmin };

    if (req.body.password) {
      updatedAdmin.password = await bcrypt.hashSync(
        req.body.password,
        bcrypt.genSaltSync(10)
      );
    }

    await Admin.update(updatedAdmin, { where });

    const admin = await Admin.findOne({ where });

    res.status(200).send({ data: admin });
  }
};
