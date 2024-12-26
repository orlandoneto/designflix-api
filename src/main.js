const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

require("dotenv").config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(morgan("dev"));
app.use("/", express.static(path.resolve(__dirname, "..", "public")));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: "9999999",
  })
);

console.log("Port:", process.env.NODE_PORT);
app.listen(process.env.NODE_PORT);

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Design Flix API",
      description: "Design Flix API documentation",
      contact: {
        name: "FlixDesign",
        email: process.env.EMAIL_HOST_SMTP,
      },
      version: "1.0.0",
    },
    servers: [
      {
        url: process.env.API_URL,
        description: "API",
      },
    ],
    components: {
      securitySchemes: {
        jwt: {
          type: "http",
          scheme: "bearer",
          in: "header",
          name: "Authorization",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        jwt: [],
      },
    ],
  },
  apis: ["src/main.js", "src/controller/*.controller.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
if (process.env.API_URL.length > 0) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

app.get("/favicon.ico", (req, res) => {
  res.sendStatus(204);
});

// user main grid
require("./controller/user-main-grid.controller")(app);

// category
require("./controller/category.controller")(app);

// tags
require("./controller/tags.controller")(app);

// otp
require("./controller/otps.controller")(app);

// system
require("./controller/system.controller")(app);

// user
require("./controller/user.controller")(app);
require("./controller/user-address.controller")(app);

// admin
require("./controller/admin.controller")(app);

// serviços
require("./controller/upload.controller")(app);

// google
require("./controller/google-api.controller")(app);

// Payment
require("./controller/payment.controller")(app);

// Bug Reports
require("./controller/user-bug.controller")(app);

// Complaints
require("./controller/complaints.controller")(app);

// Favorites
require("./controller/favorites.controller")(app);

// Downloads S3
require("./controller/downloadS3.controller")(app);

// User Downloads
require("./controller/user-downloads.controller")(app);

// User Uploads
require("./controller/user-uploads.controller")(app);

// User Follows
require("./controller/user-follows.controller")(app);

// Plans Download Limits
require("./controller/plans-download-limit.controller")(app);

// Forgot Signup
require("./controller/forgot.controller")(app);
module.exports = { app };
