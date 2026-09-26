const hbs = require("nodemailer-handlebars");
const path = require("path");
const handlebars = require("handlebars");
const {
  createMailTransport,
  getEmailFrom,
  isMailpitMode,
  ensureMailpitReady,
} = require("./mailTransport");

handlebars.registerHelper("eq", function (v1, v2) {
  return v1 === v2;
});

const sendEmail = async (
  paramsEmail,
  templateName,
  context = {
    baseUrl: process.env.API_URL,
  }
) => {
  const transporter = createMailTransport();
  transporter.use(
    "compile",
    hbs({
      viewEngine: {
        extName: ".hbs",
        partialsDir: path.resolve(__dirname, "../views"),
        defaultLayout: false,
        helpers: handlebars.helpers,
      },
      viewPath: path.resolve(__dirname, "../views"),
      extName: ".hbs",
    })
  );

  try {
    await ensureMailpitReady();

    if (isMailpitMode()) {
      console.log("[Email] Mailpit ativo — inbox em http://localhost:8025");
    }

    const mailOptions = {
      from: getEmailFrom(),
      to: paramsEmail.email,
      subject: paramsEmail.title,
      text: paramsEmail.description,
      template: templateName,
      context: {
        // Padrões para todos os templates (logo e © do rodapé).
        baseUrl: process.env.API_URL,
        year: new Date().getFullYear(),
        ...context,
      },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Enviado:", info.messageId);
    return info;
  } catch (error) {
    console.error("[Email] Erro ao enviar:", error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  createMailTransport,
  getEmailFrom,
};
