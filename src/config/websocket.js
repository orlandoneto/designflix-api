const WebSocket = require("ws");

let wss = null;

const setupWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Novo cliente conectado!");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        // 🛡️ Log de segurança para tipos suspeitos
        if (data.type && data.type.includes('error') && data.payload && data.payload.message) {
          console.log("⚠️  WebSocket - ERRO detectado:", data.type, "|", data.payload.message.substring(0, 200));
        } else {
          console.log("📨 WebSocket - Tipo:", data.type, "| Dados:", data.payload ? JSON.stringify(data.payload).substring(0, 100) + "..." : "sem payload");
        }
      } catch (err) {
        console.log("📨 WebSocket - Mensagem raw:", message.toString().substring(0, 100) + "...");
      }
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
