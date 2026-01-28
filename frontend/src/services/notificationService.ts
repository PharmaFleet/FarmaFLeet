import { api } from '@/lib/axios';

export interface Notification {
    id: number;
    user_id: number;
    title: string;
    body: string;
    data?: any;
    is_read: boolean;
    created_at: string;
    sent_at?: string;
}

export const notificationService = {
  getAll: async (params?: { skip?: number; limit?: number }) => {
    const response = await api.get<Notification[]>('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  
  registerDevice: async (token: string) => {
      const response = await api.post('/notifications/register-device', { fcm_token: token });
      return response.data;
  }
};
