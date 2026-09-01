const axios = require('axios');

const verifyRecaptcha = (formType) => {
  return async (req, res, next) => {
    try {
      const skipRecaptcha =
        process.env.SKIP_RECAPTCHA === 'true' ||
        (!process.env.RECAPTCHA_SECRET_KEY &&
          process.env.NODE_ENV === 'development');

      if (skipRecaptcha) {
        req.recaptchaData = {
          success: true,
          message: 'Skipped in development',
          formType,
        };
        return next();
      }

      const { recaptchaToken } = req.body;

      if (!recaptchaToken) {
        return res.status(400).json({
          success: false,
          message: 'Token do reCAPTCHA não fornecido'
        });
      }

      // Chamada direta para o serviço do Google reCAPTCHA
      const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      );

      if (response.data.success) {
        req.recaptchaData = {
          success: true,
          message: 'Human',
          formType
        };
        next();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Robot',
          error_codes: response.data.error_codes
        });
      }
    } catch (error) {
      console.error('Erro ao verificar reCAPTCHA:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao verificar reCAPTCHA'
      });
    }
  };
};

module.exports = verifyRecaptcha; 