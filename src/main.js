const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

require("dotenv").config();

const app = express();
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));
// app.use(express.urlencoded({ extended: true }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: "9999999",
  })
);

app.listen(8080);

const swaggerOptions = {
  swaggerDefinition:{
    openapi: "3.0.0",
    info: {
      title: "Design Flix API",
      description: "Design Flix API documentation",
      contact: {
        name: "Orlando Neto",
        email: "orlandoneto23@gmail.com"
      },
      version: "1.0.0"
    },
    servers: [
      {
        url: process.env.API_URL,
        description: "API"
      }
    ],
    components: {
      securitySchemes: {
        jwt: {
          type: "http",
          scheme: "bearer",
          in: "header",
          name: "Authorization",
          bearerFormat: "JWT"
        },
      }
    },
    security: [{
      jwt: []
    }],
  },
  apis: ['src/main.js', 'src/controller/*.controller.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
if(process.env.API_URL !== 'https://api.designflix.com'){
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

app.get('/favicon.ico', (req, res) => {
  res.sendStatus(204);
});

// otp
require("./controller/otp.controller")(app);

// system
require("./controller/system.controller")(app);

// user
require("./controller/user.controller")(app);
require("./controller/user-credit-card.controller")(app);
require("./controller/user-address.controller")(app);
require("./controller/user-invoice.controller")(app);
require("./controller/product-categories.controller")(app);
require("./controller/product.controller")(app);
require("./controller/product-manual.controller")(app);
require("./controller/product-video.controller")(app);
require("./controller/product-faq.controller")(app);

// installer
require("./controller/installer.controller")(app);

// admin
require("./controller/admin.controller")(app);
require("./controller/problems.controller")(app);

// serviços
require("./controller/upload.controller")(app);

// temas
require("./controller/tema.controller")(app);

// treinamentos
require("./controller/treinamento.controller")(app);

// google
require("./controller/google-api.controller")(app);

module.exports = { app };
