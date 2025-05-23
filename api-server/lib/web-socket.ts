import WebSocket, { WebSocketServer } from "ws";

export let webSocketServer: WebSocketServer | null = null;

export const setupWebSocket = (server: any) => {
  webSocketServer = new WebSocketServer({ server });

  webSocketServer.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  return webSocketServer;
};

export const broadcast = (message: any) => {
  if (!webSocketServer || webSocketServer.clients.size === 0) {
    console.log("No clients connected");
    return;
  }
  webSocketServer?.clients?.forEach?.((client) => {
    // Check if the client is open before sending
    if (client.readyState === WebSocket.OPEN) {
      // Send the message to the client
      client.send(JSON.stringify(message));
    }
  });
};
