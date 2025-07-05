import { ScheduledAction } from "@/models/scheduled-action.model";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export class ScheduledActionService {
  static async getAllScheduledActions(): Promise<ScheduledAction[]> {
    try {
      const { status, data: response } = await axios.get(
        `${API_BASE_URL}/scheduler`,
      );

      if (status !== 200) {
        throw new Error("Failed to fetch scheduled actions");
      }

      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch scheduled actions");
    }
  }

  static async getScheduledActionById(id: string): Promise<ScheduledAction> {
    try {
      const { status, data: response } = await axios.get(
        `${API_BASE_URL}/scheduler/${id}`,
      );

      if (status !== 200) {
        throw new Error("Failed to fetch scheduled action");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch scheduled action");
    }
  }

  static async createAction(
    action: Omit<ScheduledAction, "id">,
  ): Promise<ScheduledAction> {
    try {
      const { status, data: response } = await axios.post(
        `${API_BASE_URL}/scheduler`,
        action,
      );

      if (status !== 201) {
        throw new Error("Failed to create scheduled action");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to create scheduled action");
    }
  }

  static async updateAction(
    id: string,
    action: Partial<ScheduledAction>,
  ): Promise<ScheduledAction> {
    try {
      const { status, data: response } = await axios.put(
        `${API_BASE_URL}/scheduler/${id}`,
        action,
      );

      if (status !== 200) {
        throw new Error("Failed to update scheduled action");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to update scheduled action");
    }
  }

  static async patchAction(
    id: string,
    action: Partial<ScheduledAction>,
  ): Promise<ScheduledAction> {
    try {
      const { status, data: response } = await axios.patch(
        `${API_BASE_URL}/scheduler/${id}`,
        action,
      );

      if (status !== 200) {
        throw new Error("Failed to update scheduled action");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to update scheduled action");
    }
  }

  static async deleteAction(id: string): Promise<void> {
    try {
      const { status, data: response } = await axios.delete(
        `${API_BASE_URL}/scheduler/${id}`,
      );

      if (status !== 200) {
        throw new Error("Failed to delete scheduled action");
      }
      return response.data ?? {};
    } catch (error) {
      throw new Error("Failed to delete scheduled action");
    }
  }
}
