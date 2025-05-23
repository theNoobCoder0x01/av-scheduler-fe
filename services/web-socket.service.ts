export class WebSocketService {
  private static instance: WebSocket | null = null;
  private static listeners: ((data: any) => void)[] = [];

  static connect() {
    if (!this.instance) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.hostname}:8082`;
      this.instance = new WebSocket(wsUrl);

      this.instance.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.listeners.forEach((listener) => listener(data));
      };

      this.instance.onclose = () => {
        this.instance = null;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      };
    }
  }

  static addListener(listener: (data: any) => void) {
    this.listeners.push(listener);
  }

  static removeListener(listener: (data: any) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}
