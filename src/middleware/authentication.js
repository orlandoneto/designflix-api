const { Admin, User, Installer } = require("../models");
const { ROLES } = require("../utils/constants/constants");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

const authenticateResource = (resources) => {
  return async (req, res, next) => {

    if (!req.headers.authorization) {
      return res.status(401).json({
        data: null,
        message: "Precisa enviar o token via header",
      });
    }



    try {
      const { authorization } = req.headers;
      const token = authorization.replace("Bearer ", "");
      jwt.verify(
        token,
        privateKey,
        { algorithms: "RS256" },
        async function (err, decoded) {
          if (err) {
            return res
              .status(401)
              .json({ auth: false, message: "Failed to authenticate token." });
          }

          let valid = false;

          if (resources.includes(ROLES.ADMIN)) {
            if (decoded.userType === ROLES.ADMIN) {
              const admin = await Admin.findOne({
                where: { id: decoded.id, email: decoded.email, super_admin: 0 },
              });
              if (admin && admin.id) {
                req.params.adminId = admin.id;
                valid = true;
              }
            }
          }

          if (resources.includes(ROLES.SUPER_ADMIN)) {
            if (decoded.userType === ROLES.SUPER_ADMIN) {
              const admin = await Admin.findOne({
                where: { id: decoded.id, email: decoded.email, super_admin: 1 },
              });
              if (admin && admin.id) {
                req.params.adminId = admin.id;
                req.params.superAdminId = admin.id;
                valid = true;
              }
            }
          }
          if (resources.includes(ROLES.USER)) {
            if (decoded.userType === ROLES.USER) {
              const user = await User.findOne({
                where: { id: decoded.id, email: decoded.email },
              });
              if (user && user.id) {
                req.params.userId = user.id;
                valid = true;
              }
            }
          }

          if (!valid) {
            return res.status(401).json({
              auth: false,
              message: "Não foi possível encontrar o usuário!",
            });
          }

          req.params.userType = decoded.userType;

          return next();
        }
      );
    } catch (err) {
      return res.status(401).json({
        data: null,
        message: "Não autorizado",
      });
    }
  };
};

module.exports = authenticateResource;
