import { AppSettings, SettingsUpdateDTO } from '@/models/settings.model';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';

export class SettingsService {
  static async getSettings(): Promise<AppSettings> {
    try {
      const { data: response } = await axios.get(`${API_BASE_URL}/settings`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch settings');
    }
  }

  static async updateSettings(settings: SettingsUpdateDTO): Promise<AppSettings> {
    try {
      const { data: response } = await axios.patch(`${API_BASE_URL}/settings`, settings);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update settings');
    }
  }
}