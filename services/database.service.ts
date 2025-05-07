import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export class DatabaseService {
  static isDBInitialized: boolean = false;

  static async initializeDB(): Promise<void> {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/initialize`);
      console.log("Database initialized:", response);
      this.isDBInitialized = true;
    } catch (error) {
      this.isDBInitialized = false;
      throw new Error("Failed to initialize database");
    }
  }
}
