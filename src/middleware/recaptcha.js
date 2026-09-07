const axios = require('axios');

const verifyRecaptcha = (formType) => {
  return async (req, res, next) => {
    try {
      // SKIP_RECAPTCHA=true → bypass (Jest / CI).
      // SKIP_RECAPTCHA=false → força validação mesmo em development.
      // Sem flag + sem secret em development → bypass (legado).
      const forceRecaptcha = process.env.SKIP_RECAPTCHA === 'false';
      const skipRecaptcha =
        !forceRecaptcha &&
        (process.env.SKIP_RECAPTCHA === 'true' ||
          (!process.env.RECAPTCHA_SECRET_KEY &&
            process.env.NODE_ENV === 'development'));

      if (skipRecaptcha) {
        req.recaptchaData = {
          success: true,
          message: 'Skipped in development',
          formType,
        };
        return next();
      }

      const secret = process.env.RECAPTCHA_SECRET_KEY;
      if (!secret) {
        return res.status(500).json({
          success: false,
          message: 'reCAPTCHA não configurado (RECAPTCHA_SECRET_KEY)',
        });
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
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`
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