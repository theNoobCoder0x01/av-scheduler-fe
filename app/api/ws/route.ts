import { WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;

if (typeof process.env.NEXT_PHASE === "undefined") {
  wss = new WebSocketServer({ port: 8082 });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

export function GET(req: any, res: any) {
  // Handle WebSocket upgrade
  if (req.headers.upgrade?.toLowerCase() !== "websocket") {
    res.status(400).json({ message: "Expected WebSocket connection" });
    return;
  }

  if (!wss) {
    res.status(500).json({ message: "WebSocket server not initialized" });
    return;
  }

  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    wss?.emit("connection", ws, req);
  });
}

export const broadcast = (message: any) => {
  if (!wss || wss.clients.size === 0) {
    console.log("No clients connected");
    return;
  }
  wss?.clients?.forEach?.((client) => {
    // Check if the client is open before sending
    if (client.readyState === WebSocket.OPEN) {
      // Send the message to the client
      client.send(JSON.stringify(message));
    }
  });
};
