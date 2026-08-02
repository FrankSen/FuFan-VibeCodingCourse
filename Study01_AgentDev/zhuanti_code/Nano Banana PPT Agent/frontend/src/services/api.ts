// API 服务层
import { API_CONFIG } from '../config';

const API_BASE_URL = API_CONFIG.BASE_URL;

// 获取 API Key
const getApiKey = (): string | null => {
  return localStorage.getItem('openrouter_api_key');
};

// 通用请求函数
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const headers: HeadersInit = {
    ...options.headers,
  };

  // 如果有 API Key，添加到 header
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  // 如果 body 存在且不是 FormData，确保设置 Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  console.log('fetchAPI request:', {
    endpoint,
    method: options.method,
    headers,
    body: options.body
  });

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ 系统基础 ============
export async function healthCheck(): Promise<{ status: string }> {
  return fetchAPI('/');
}

// ============ API Key 管理 ============
export interface ApiKeyStatus {
  has_key: boolean;
  key_preview?: string; // 前几位和后几位，如 "sk-or-v1-****abc"
}

// 从后端读取 API Key 状态
export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  return fetchAPI('/api/key');
}

// 保存 API Key 到后端 .env 文件
export async function saveApiKey(apiKey: string): Promise<{ status: string; message: string }> {
  return fetchAPI('/api/key/save', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey }),
  });
}

// 测试 API Key 是否有效
export async function testApiKey(apiKey?: string): Promise<{ 
  status: 'success' | 'error'; 
  message: string;
  model_info?: any;
}> {
  const testKey = apiKey || getApiKey();
  return fetchAPI('/api/key/test', {
    method: 'POST',
    body: JSON.stringify({ api_key: testKey }),
  });
}

// ============ 提示词模板管理 ============
// 获取提示词模板
export async function getPromptTemplate(): Promise<string> {
  try {
    const response = await fetchAPI<{ template: string }>('/ppt/template');
    return response.template;
  } catch (error) {
    console.error('Failed to get prompt template:', error);
    return '';
  }
}

// 保存提示词模板
export async function savePromptTemplate(template: string): Promise<{ status: string; message: string }> {
  return fetchAPI('/ppt/template', {
    method: 'POST',
    body: JSON.stringify({ template }),
  });
}

// ============ 会话管理 ============
export interface Session {
  id: string;
  topic: string;
  created_at: number;
  preview_image: string;
}

export interface SessionDetail {
  id: string;
  topic: string;
  slides: SlideData[];
  chat_history: any[];
}

export interface SlideData {
  index: number;
  active_version_id: string;
  versions: VersionData[];
}

export interface VersionData {
  id: string;
  image_url: string;
  prompt: string;
  timestamp: number;
}

export async function listSessions(): Promise<Session[]> {
  return fetchAPI('/sessions');
}

export async function createSession(topic: string): Promise<{ session_id: string; message: string }> {
  return fetchAPI('/session/create', {
    method: 'POST',
    body: JSON.stringify({ topic }),
  });
}

export async function getSessionData(sessionId: string): Promise<SessionDetail> {
  return fetchAPI(`/session/${sessionId}`);
}

export async function renameSession(sessionId: string, newTitle: string): Promise<void> {
  return fetchAPI(`/session/${sessionId}/title`, {
    method: 'PATCH',
    body: JSON.stringify({ new_title: newTitle }),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return fetchAPI(`/session/${sessionId}`, {
    method: 'DELETE',
  });
}

// ============ 幻灯片管理 ============
export async function deleteSlide(sessionId: string, slideIndex: number): Promise<void> {
  return fetchAPI(`/session/${sessionId}/slide/${slideIndex}`, {
    method: 'DELETE',
  });
}

export async function deleteVersion(sessionId: string, slideIndex: number, versionId: string): Promise<void> {
  return fetchAPI(`/session/${sessionId}/slide/${slideIndex}/version/${versionId}`, {
    method: 'DELETE',
  });
}

export async function setActiveVersion(sessionId: string, slideIndex: number, versionId: string): Promise<void> {
  console.log('setActiveVersion called with:', { sessionId, slideIndex, versionId });
  
  const requestBody = { version_id: versionId };
  console.log('Request body object:', requestBody);
  
  return fetchAPI(`/session/${sessionId}/slide/${slideIndex}/version`, {
    method: 'PATCH',
    body: JSON.stringify(requestBody),
  });
}

// ============ AI 核心功能 ============
export interface PlanPPTRequest {
  session_id: string;
  topic: string;
  page_count?: number;
  context_text?: string;
}

export interface PlanPPTResponse {
  session_title: string;
  global_style: string;
  slides: Array<{ index: number; visual_prompt: string }>;
}

export async function planPPT(request: PlanPPTRequest): Promise<PlanPPTResponse> {
  return fetchAPI('/ppt/plan', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export interface GenerateSlideRequest {
  session_id: string;
  slide_index: number;
  prompt: string;
  is_modification: boolean;
  is_insertion: boolean;
  base_image_url?: string;
}

export interface GenerateSlideResponse {
  status: string;
  slide_index: number;
  version_id: string;
  image_url: string;
  inserted_count?: number;
}

export async function generateSlide(request: GenerateSlideRequest): Promise<GenerateSlideResponse> {
  return fetchAPI('/ppt/generate_slide', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============ 文件处理 ============
export interface UploadDocResponse {
  filename: string;
  extracted_text: string;
}

export async function uploadDoc(file: File): Promise<UploadDocResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const apiKey = getApiKey();
  const headers: HeadersInit = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`${API_BASE_URL}/upload/doc`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ 工具函数 ============
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}