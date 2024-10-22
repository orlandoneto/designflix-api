const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const Sequelize = require("sequelize");

const {
  User,
  // UserAddress,
  // UserCreditCard,
  // UserInvoice,
  // UserInvoiceProduct,
  // ProductCategory,
} = require("../models");

const { sendEmail } = require("../utils/emailService");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

module.exports = class {
  async getAll(req, res) {
    const users = await User.findAll({ attributes: { exclude: ["password"] } });

    res.status(200).send({ data: users });
  }

  async get(req, res) {
    const id = req.params.id;
    const user = await User.findOne({
      where: { id: id },
      attributes: { exclude: ["password"] },
      // include: [
      //   {
      //     model: UserAddress,
      //   },
      //   {
      //     model: UserCreditCard,
      //   },
      //   {
      //     model: UserInvoice,
      //     include: [
      //       {
      //         model: UserInvoiceProduct,
      //         include: [
      //           {
      //             model: ProductCategory,
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // ],
    });
    res.status(200).send({ data: user });
  }
///CAI AQUI ---------------
  async getByEmail(email) {
    const user = await User.findOne({
      where: { email },
    });

    return user;
  }

  async create(req, res) {
    try {
      let {
        name,
        email,
        password,
        phone,
        country_code,
        privacy_policy,
        plan_type,
      } = req.body;

      const hasUserEmail = await this.getByEmail(email);
      if (hasUserEmail) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o e-mail informado" });
        return;
      }

      if (typeof password === "undefined") {
        let trimmedPhone = phone.replace(/\D/g, "");
        password = uuidv4() + trimmedPhone;
      }

      const status = "CACTIVE";
      const user = await User.create({
        name,
        email,
        password,
        phone,
        countryCode: country_code,
        privacyPolicy: privacy_policy,
        status,
        planType: plan_type,
      });

      const userData = user.dataValues;
      let getTokenData = await this.authenticateSync(email, password);
      delete userData.password;
      userData.token = getTokenData.token;

      const paramsEmail = {
        email: email,
        name: name,
        title: "DesignFlix - Usuário criado",
        description: "Sua conta foi criada com sucesso!",
      };

      const context = {
        name: paramsEmail.name,
        time: "Sua nova senha temporária é 123456",
      };

      sendEmail(paramsEmail, "index", context)
        .then((response) => {
          console.log("Email enviado com sucesso:", response);
        })
        .catch((error) => {
          console.error("Erro ao enviar email:", error);
        });

      res.status(200).send({ user });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async createFromAdmin(req, res) {
    try {
      const { email, name, photo, phone, cpf } = req.body;

      let { password } = req.body;

      if (typeof password === "undefined") {
        let trimmedDoc = cpf.replace(/\D/g, "");
        let trimmedPhone = phone.replace(/\D/g, "");
        password = trimmedDoc + trimmedPhone;
      }

      const hasUserEmail = await this.getByEmail(email);

      if (hasUserEmail) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o e-mail informado" });
        return;
      }

      const hasUserCPF = await User.findOne({ where: { cpf } });
      if (hasUserCPF) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o cpf informado" });
        return;
      }

      const user = await User.create({
        email,
        password,
        name,
        photo,
        phone,
        cpf,
      });

      const userData = user.dataValues;

      delete userData.password;

      res.status(200).send({ user });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async authenticateSync(email, password) {
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return {
        status: 401,
        token: null,
        message: "Usuário não encontrado",
        userData: null,
      };
    }

    const validatePassword = await bcrypt.compareSync(password, user.password);

    if (!validatePassword) {
      return {
        status: 401,
        token: null,
        message: "E-mail ou senha incorreta",
        userData: null,
      };
    }

    let userData = user.dataValues;

    delete userData.password;

    userData.userType = "user";

    var token = jwt.sign(userData, privateKey, {
      algorithm: "RS256",
      expiresIn: 60 * 60 * 24 * 7 * 2,
    });

    return {
      status: 200,
      token: token,
      message: null,
      userData: userData,
    };
  }

  async authenticate(req, res) {
    try {
      const { email, password } = req.body;
      const user = await this.getByEmail(email);
      if (!user) {
        res.status(400).send({ message: "Usuário não encontrado" });
        return;
      }

      const validatePassword = await bcrypt.compareSync(
        password,
        user.password
      );

      if (!validatePassword) {
        res.status(400).send({ message: "E-mail ou Senha incorreta" });
        return;
      }

      let userData = user.dataValues;

      delete userData.password;

      userData.userType = "user";

      var token = jwt.sign(userData, privateKey, {
        algorithm: "RS256",
        expiresIn: 60 * 60 * 24 * 7 * 2,
      });

      res.status(200).send({ data: userData, token: token });
      return;
    } catch (err) {
      res.status(400).send({ message: err.message });
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
      res.status(400).send({ message: "Email é um parâmetro obrigatório" });
      return;
    }

    const time = scramble(String(new Date().getTime()).slice(2, 10));

    const encrypted = await bcrypt.hashSync(time, bcrypt.genSaltSync(10));
    const user = await this.getByEmail(req.body.email);

    if (!user) {
      res.status(400).send({ message: "Usuário não encontrado" });
    }

    await User.update(
      { password: encrypted, isResetPassword: 1 },
      {
        where: {
          id: user.id,
        },
      }
    );

    let transporter = nodemailer.createTransport({
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

    try {
      const mailOptions = {
        from: process.env.EMAIL_TO_SEND,
        to: user.email,
        subject: "Reset de Senha - DesignFlix",
        text: "",
        template: "index",
        context: {
          newPassword: time,
          name: user.name,
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
    try {
      let shouldUpdate = true;
      let idToUpdate;
      let self = false;

      if (req.params.userType === "admin") {
        idToUpdate = req.params.userId;
      }

      if (req.params.userType === "user") {
        idToUpdate = req.params.userId;
        self = true;
      }

      if (shouldUpdate) {
        const where = { id: idToUpdate };

        const oldUser = await User.findOne({ where });

        let updatedUser = { ...oldUser, ...req.body };

        let codeUpdate = 1;

        if (req.body.password) {
          updatedUser.password = await bcrypt.hashSync(
            req.body.password,
            bcrypt.genSaltSync(10)
          );
          codeUpdate = 2;
        }

        await User.update(updatedUser, { where });

        const user = await User.findOne({ where });

        res.status(200).send({
          data: user,
          statusUpdate: codeUpdate,
          message: "Atualização concluída!",
        });
      } else {
        res.status(401).send({ message: "Você não pode fazer isto!" });
      }
    } catch (err) {
      res.status(500).send({ message: "Ocorreu um erro." });
    }
  }
};
