const { Otps } = require("../models");
const randomstring = require("randomstring");
const { sendEmail } = require("../utils/emailService");

function generateOTP() {
  return randomstring.generate({
    length: 6,
    charset: "numeric",
  });
}

module.exports = class {
  sendOTP = async (req, res) => {
    try {
      const { email } = req.query;
      const otp = generateOTP();
      await Otps.create({
        email: email,
        otp: otp,
      });

      const paramsEmail = {
        email: email,
        name: "DesignFlix",   
        title: "DesignFlix - Código de Verificação",
        description: `<p>Your OTP is: <strong>${otp}</strong></p>`,
      };

      const context = {
        name: paramsEmail.name,
        otps: otp,
      };

      sendEmail(paramsEmail, "otps", context)
        .then((response) => {
          console.log("Email enviado com sucesso:", response);
        })
        .catch((error) => {
          console.error("Erro ao enviar email:", error);
        });

      res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };

  verifyOTP = async (req, res) => {
    try {
      const { email, otp } = req.query;
      const existingOTP = await Otps.findOne({
        where: {
          email: email,
          otp: otp,
        },
      });

      if (existingOTP) {
        const where = { email: email };
        await Otps.destroy({ where });

        res
          .status(200)
          .json({ success: true, message: "OTP verification successful" });
      } else {
        res.status(400).json({ success: false, message: "Invalid OTP" });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };
};
