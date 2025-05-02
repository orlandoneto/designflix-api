const fs = require("fs");
const path = require("path");

function imageToBase64(imagePath) {
  try {
    const absolutePath = path.resolve(imagePath);
    const imageBase64 = fs.readFileSync(absolutePath, "base64");
    return `data:image/png;base64,${imageBase64}`;
  } catch (error) {
    console.error("Erro ao converter imagem para Base64:", error);
    return null;
  }
}

module.exports = {
  imageToBase64,
};
