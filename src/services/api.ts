const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000/api' : 'http://62.234.163.176:3000/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: number;
  account: string;
  user_name: string;
  role: string;
  avatar?: string;
}

export interface ElderBinding {
  binding_id: number;
  relation_type: string;
  is_primary: number;
  elder: User;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface TrainingCategory {
  id: number;
  name: string;
  parent_id: number | null;
  count: number;
}

export interface TrainingVideo {
  id: number;
  title: string;
  cover_url: string;
  video_url: string;
  description: string;
  duration_seconds: number;
  duration: string;
  categories?: { id: number; name: string }[];
}

export interface TodayPlanItem {
  id: string;
  title: string;
  duration: string;
  order: number;
  completed: boolean;
  current: boolean;
}

export interface TodayPlan {
  date: string;
  totalDuration: string;
  completedCount: number;
  totalCount: number;
  progress: number;
  trainingList: TodayPlanItem[];
}

export interface TrainingRecord {
  id: number;
  title: string;
  date: string;
  duration: string;
  completed: boolean;
  actualDuration?: number;
  targetDuration?: number;
  category?: string;
}

export interface TrainingRecordStats {
  todayTotalMinutes: number;
  todayCompletionRate: number;
  todayDurationPercentage: Array<{
    title: string;
    duration: number;
    percentage: number;
  }>;
  targetMinutesPerDay: number;
}

export interface TrainingRecordResponse {
  records: Array<{
    date: string;
    dayOfWeek: string;
    trainings: TrainingRecord[];
  }>;
  stats: TrainingRecordStats;
}

export interface UserProfile {
  id: number;
  account: string;
  user_name: string;
  role: string;
  gender?: string;
  phone?: string;
  age?: number;
  created_at?: string;
}

export interface AdminUser {
  id: number;
  account: string;
  user_name: string;
  role: string;
  status: string | number;
  created_at: string;
}

export interface Binding {
  id: number;
  elder_id: number;
  elder_name: string;
  child_id: number;
  child_name: string;
  is_primary: number;
  created_at: string;
}

export interface TrainingCategory {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export interface TrainingVideo {
  id: number;
  title: string;
  description: string;
  duration_seconds: number;
  category_id: number;
  category_name: string;
  url: string;
  status: string;
  created_at: string;
}

export interface TrainingTemplate {
  id: number;
  name: string;
  description: string;
  is_public: number;
  created_at: string;
  items?: Array<{
    id: number;
    video_id: number;
    video_title: string;
    duration_seconds: number;
    order_index: number;
  }>;
}

export interface TrainingAssignment {
  id: number;
  elder_id: number;
  elder_name: string;
  template_id: number;
  template_name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  async login(account: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account, password }),
    });
    
    if (response.success && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  }

  async register(account: string, password: string, user_name: string, role: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ account, password, user_name, role }),
    });
  }

  async getTrainingCategories(): Promise<ApiResponse<TrainingCategory[]>> {
    return this.request<TrainingCategory[]>('/training/categories');
  }

  async getTrainingVideos(category_id?: number, page: number = 1, limit: number = 20): Promise<ApiResponse<TrainingVideo[]>> {
    const params = new URLSearchParams();
    if (category_id) params.append('category_id', category_id.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    return this.request<TrainingVideo[]>(`/training/videos?${params.toString()}`);
  }

  async getVideoDetail(id: number): Promise<ApiResponse<TrainingVideo>> {
    return this.request<TrainingVideo>(`/training/videos/${id}`);
  }

  async getTodayPlan(): Promise<ApiResponse<TodayPlan>> {
    return this.request<TodayPlan>('/training/today-plan');
  }

  async getTrainingRecords(days: number = 7): Promise<ApiResponse<TrainingRecordResponse>> {
    return this.request<TrainingRecordResponse>(`/training/training-records?days=${days}`);
  }

  async createTrainingRecord(data: {
    video_id: number;
    daily_plan_id?: number;
    daily_plan_item_id?: number;
    start_time: string;
    end_time?: string;
    actual_duration_seconds: number;
    completed: boolean;
    source: string;
  }): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>('/training/training-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/auth/profile');
  }

  async updateUserProfile(data: { user_name: string; gender: string; phone: string; age: number }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 在ApiService类中添加
  async askAI(question: string): Promise<ApiResponse<{ answer: string }>> {
    return this.request<{ answer: string }>('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question })
    });
  }

  // 管理员API方法
  async getAdminProfile(): Promise<ApiResponse<AdminUser>> {
    return this.request<AdminUser>('/admin/profile');
  }

  async getUsers(params?: { role?: string; account?: string; status?: string }): Promise<ApiResponse<AdminUser[]>> {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.account) queryParams.append('account', params.account);
    if (params?.status) queryParams.append('status', params.status);
    
    return this.request<AdminUser[]>(`/admin/users?${queryParams.toString()}`);
  }

  async createUser(data: { account: string; name: string; password: string; role: string }): Promise<ApiResponse<AdminUser>> {
    return this.request<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUserStatus(userId: number, status: string): Promise<ApiResponse<{ id: number; status: string }>> {
    return this.request<{ id: number; status: string }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getBindings(): Promise<ApiResponse<Binding[]>> {
    return this.request<Binding[]>('/admin/bindings');
  }

  async createBinding(data: { elderId: number; childId: number; isPrimary: boolean }): Promise<ApiResponse<Binding>> {
    return this.request<Binding>('/auth/create-binding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBinding(bindingId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/admin/bindings/${bindingId}`, {
      method: 'DELETE',
    });
  }

  async getCategories(): Promise<ApiResponse<TrainingCategory[]>> {
    return this.request<TrainingCategory[]>('/admin/categories');
  }

  async createCategory(data: { name: string; description?: string; status?: string }): Promise<ApiResponse<TrainingCategory>> {
    return this.request<TrainingCategory>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVideos(params?: { category_id?: number; status?: string; limit?: number }): Promise<ApiResponse<TrainingVideo[]>> {
    const queryParams = new URLSearchParams();
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return this.request<TrainingVideo[]>(`/admin/videos?${queryParams.toString()}`);
  }

  async getAdminVideoDetail(videoId: number): Promise<ApiResponse<TrainingVideo>> {
    return this.request<TrainingVideo>(`/admin/videos/${videoId}`);
  }

  async createVideo(data: {
    title: string;
    description?: string;
    duration_seconds: number;
    category_id: number;
    url: string;
    status?: string;
  }): Promise<ApiResponse<TrainingVideo>> {
    return this.request<TrainingVideo>('/admin/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVideo(videoId: number, data: {
    title?: string;
    description?: string;
    duration_seconds?: number;
    category_id?: number;
    url?: string;
    cover_url?: string;
  }): Promise<ApiResponse<TrainingVideo>> {
    return this.request<TrainingVideo>(`/admin/videos/${videoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateVideoStatus(videoId: number, status: string): Promise<ApiResponse<{ id: number; status: string }>> {
    return this.request<{ id: number; status: string }>(`/admin/videos/${videoId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getTemplates(): Promise<ApiResponse<TrainingTemplate[]>> {
    return this.request<TrainingTemplate[]>('/admin/templates');
  }

  async getTemplateDetail(templateId: number): Promise<ApiResponse<TrainingTemplate>> {
    return this.request<TrainingTemplate>(`/admin/templates/${templateId}`);
  }

  async createTemplate(data: { name: string; description?: string; is_public?: boolean }): Promise<ApiResponse<TrainingTemplate>> {
    return this.request<TrainingTemplate>('/admin/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(templateId: number, data: { name?: string; description?: string; is_public?: boolean }): Promise<ApiResponse<TrainingTemplate>> {
    return this.request<TrainingTemplate>(`/admin/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addTemplateItem(templateId: number, data: { video_id: number; duration_seconds: number; order_index?: number }): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/templates/${templateId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplateItem(templateId: number, itemId: number, data: { video_id?: number; duration_seconds?: number; order_index?: number }): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/templates/${templateId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplateItem(templateId: number, itemId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/admin/templates/${templateId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async getAssignments(params?: { elder_id?: number; template_id?: number; status?: string }): Promise<ApiResponse<TrainingAssignment[]>> {
    const queryParams = new URLSearchParams();
    if (params?.elder_id) queryParams.append('elder_id', params.elder_id.toString());
    if (params?.template_id) queryParams.append('template_id', params.template_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return this.request<TrainingAssignment[]>(`/admin/assignments?${queryParams.toString()}`);
  }

  async createAssignment(data: {
    elder_id: number;
    template_id: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<TrainingAssignment>> {
    return this.request<TrainingAssignment>('/admin/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 搜索老人（公开API）
  async searchElders(name: string): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams();
    params.append('name', name);
    return this.request<User[]>(`/auth/search-elders?${params.toString()}`, {
      method: 'GET'
    });
  }

  // ============ 子女端 API ============

  // 获取绑定老人列表
  async getMyElders(): Promise<ApiResponse<ElderBinding[]>> {
    return this.request<ElderBinding[]>('/child/elders', {
      method: 'GET'
    });
  }

  // 发送训练提醒
  async sendTrainingReminder(elderId: number, content: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/child/elders/${elderId}/reminders`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // 获取最新提醒
  async getLatestReminder(elderId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/child/elders/${elderId}/reminders/latest`, {
      method: 'GET'
    });
  }

  // 老人获取通知
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/elder/notifications', {
      method: 'GET'
    });
  }

  // 标记通知为已读
  async markNotificationRead(notificationId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/elder/notifications/${notificationId}/read`, {
      method: 'POST'
    });
  }

  // 获取老人今日摘要
  async getChildTodaySummary(elderId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/child/elders/${elderId}/today-summary`, {
      method: 'GET'
    });
  }

  // 获取老人训练记录列表
  async getChildTrainingRecords(elderId: number, days?: number): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    const queryString = params.toString();
    return this.request<any[]>(`/child/elders/${elderId}/records${queryString ? '?' + queryString : ''}`, {
      method: 'GET'
    });
  }

  // 获取老人训练趋势
  async getChildTrainingTrend(elderId: number, days?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    const queryString = params.toString();
    return this.request<any>(`/child/elders/${elderId}/training-trend${queryString ? '?' + queryString : ''}`, {
      method: 'GET'
    });
  }

  // 获取老人周总结
  async getChildWeeklySummary(elderId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/child/elders/${elderId}/weekly-summary`, {
      method: 'GET'
    });
  }
}

export const api = new ApiService();
