const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Configuração do storage local usando multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.resolve(__dirname, "..", "..", "uploads");
    cb(null, uploadPath); // Pasta 'uploads' no diretório do projeto
  },
  filename: (req, file, cb) => {
    crypto.randomBytes(16, (err, hash) => {
      if (err) cb(err);

      const fileName = `${hash.toString("hex")}-${file.originalname}`;
      cb(null, fileName);
    });
  },
});

// Definindo o filtro de tipos de arquivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",  // SVG
    "application/postscript",  // EPS
    "application/vnd.corel-draw",  // CDR
    "image/vnd.adobe.photoshop",  // PSD
    "application/x-canva",  // CANVA (não é um formato oficial, mas incluído por especificação)
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo inválido. Permitido apenas PSD, PNG, EPS, SVG, CDR e CANVA."));
  }
};

// Configuração do multer para o armazenamento local
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Aumentei o limite de arquivo para 20MB
  },
  fileFilter: fileFilter,
});

module.exports = upload;
