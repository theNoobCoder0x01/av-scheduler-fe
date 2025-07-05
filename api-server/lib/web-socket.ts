import WebSocket, { WebSocketServer } from "ws";

export let webSocketServer: WebSocketServer | null = null;

export const setupWebSocket = (server: any) => {
  webSocketServer = new WebSocketServer({ server });

  webSocketServer.on("connection", (ws) => {
    console.log("📡 WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("📨 WebSocket message received:", data);

        // Broadcast to all other clients
        broadcast(data, ws);
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("📡 WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connection",
        message: "Connected to BAPS Music Scheduler",
        timestamp: new Date().toISOString(),
      }),
    );
  });

  return webSocketServer;
};

export const broadcast = (message: any, excludeClient?: WebSocket) => {
  if (!webSocketServer || webSocketServer.clients.size === 0) {
    console.log("📡 No WebSocket clients connected");
    return;
  }

  console.log(
    "📡 Broadcasting to",
    webSocketServer.clients.size,
    "clients:",
    message.type || "unknown",
  );

  webSocketServer.clients.forEach((client) => {
    // Check if the client is open and not the sender
    if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
      try {
        client.send(
          JSON.stringify({
            ...message,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error("❌ Error sending WebSocket message:", error);
      }
    }
  });
};
