const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");
const handlebars = require("handlebars");

// Adiciona o helper eq para comparação de igualdade
handlebars.registerHelper('eq', function (v1, v2) {
  return v1 === v2;
});

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST_SMTP,
    port: process.env.EMAIL_PORT_SMTP,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER_SMTP,
      pass: process.env.EMAIL_PASS_SMTP,
    },
  });
};

const sendEmail = async (
  paramsEmail,
  templateName,
  context = {
    baseUrl: process.env.API_URL,
  }
) => {
  const transporter = createTransporter();
  transporter.use(
    "compile",
    hbs({
      viewEngine: {
        extName: ".hbs",
        partialsDir: path.resolve(__dirname, "../views"),
        defaultLayout: false,
        helpers: handlebars.helpers
      },
      viewPath: path.resolve(__dirname, "../views"),
      extName: ".hbs",
    })
  );

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER_SMTP,
      to: paramsEmail.email,
      subject: paramsEmail.title,
      text: paramsEmail.description,
      template: templateName,
      context: {
        ...context,
      },
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
