const WebSocket = require("ws");

let wss = null;

const setupWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Novo cliente conectado!");

    ws.on("message", (message) => {
      console.log("Mensagem recebida: ", message);
    });

    ws.on("close", () => {
      console.log("Cliente desconectado");
    });
  });

  console.log("WebSocket configurado com sucesso.");
};

const broadcastMessage = (message) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

module.exports = { setupWebSocket, broadcastMessage };
