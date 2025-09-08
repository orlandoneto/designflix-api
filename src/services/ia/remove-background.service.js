const axios = require("axios");

function isValidBase64(input) {
  return typeof input === "string" && input.length > 0;
}

function isValidMime(input) {
  return typeof input === "string" && input.startsWith("image/");
}

module.exports = {
  async removeBackground({ imageData, imageType }) {
    if (!isValidBase64(imageData) || !isValidMime(imageType)) {
      const error = new Error("Parâmetros inválidos. Envie imageData (base64) e imageType (mime).");
      error.status = 400;
      throw error;
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      const error = new Error("Serviço indisponível. Configuração necessária.");
      error.status = 503;
      throw error;
    }

    const params = new URLSearchParams();
    params.append("image_file_b64", `data:${imageType};base64,${imageData}`);
    params.append("size", "auto");

    let response;
    try {
      response = await axios.post(
        "https://api.remove.bg/v1.0/removebg",
        params,
        {
          headers: {
            "X-Api-Key": apiKey,
          },
          responseType: "arraybuffer",
        }
      );
    } catch (e) {
      const status = e?.response?.status || 500;
      let message = "Erro ao processar a imagem. Tente novamente.";
      if (status === 402) {
        message = "Limite de processamento atingido. Tente novamente mais tarde.";
      }
      const error = new Error(message);
      error.status = status === 500 ? 500 : 200; // manter sucesso=false para erros conhecidos
      throw error;
    }

    const resultBase64 = Buffer.from(response.data).toString("base64");
    const dataUrl = `data:image/png;base64,${resultBase64}`;

    return { processedImageUrl: dataUrl };
  },
};


