import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Upload, Plus, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { SettingsModal } from './SettingsModal';
import { toast } from 'sonner@2.0.3';

const API_BASE = 'http://localhost:8002';

interface GeneratedImage {
  file_url: string;
  prompt?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | { type: string; text: string } | Array<{ type: string; text: string }>;
  images?: string[];
  user_images?: string[];
  generated_images?: GeneratedImage[];
}

interface SessionDetail {
  session_id: string;
  created_at: number;
  is_favorite: boolean;
  messages: Message[];
}

interface ChatPanelProps {
  sessionId: string | null;
  onNewSession: (sessionId: string) => void;
  onChatUpdate: () => void;
}

const MODELS = [
  { id: 'google/gemini-3-pro-image-preview', label: 'Nano Banana Pro - 绘图' },
  { id: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro - 对话' }
];

export function ChatPanel({ sessionId, onNewSession, onChatUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check API Key status on mount
  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  const checkApiKeyStatus = async () => {
    setIsCheckingApiKey(true);
    try {
      const response = await axios.get(`${API_BASE}/api/settings/apikey`);
      const hasKey = response.data.has_key;
      setHasApiKey(hasKey);
      
      // Auto-open settings modal if no API key
      if (!hasKey) {
        setIsSettingsModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking API key status:', error);
      setHasApiKey(false);
      setIsSettingsModalOpen(true);
    } finally {
      setIsCheckingApiKey(false);
    }
  };

  const handleApiKeySaved = () => {
    checkApiKeyStatus();
    toast.success('API Key 配置成功！');
  };

  const loadSession = async (id: string) => {
    try {
      const response = await axios.get<SessionDetail>(`${API_BASE}/api/sessions/${id}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      toast.error('Failed to load session');
      console.error('Error loading session:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/sessions`);
      const newSessionId = response.data.session_id;
      setMessages([]);
      setInput('');
      setUploadedImages([]);
      onNewSession(newSessionId);
      toast.success('New session created');
    } catch (error) {
      toast.error('Failed to create session');
      console.error('Error creating session:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        setUploadedImages((prev) => [...prev, base64Data]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && uploadedImages.length === 0) return;

    let currentSessionId = sessionId;

    // Auto-create session if none is selected (即开即聊)
    if (!currentSessionId) {
      try {
        const response = await axios.post(`${API_BASE}/api/sessions`);
        currentSessionId = response.data.session_id;
        onNewSession(currentSessionId);
        toast.success('New session created');
      } catch (error) {
        toast.error('Failed to create session');
        console.error('Error creating session:', error);
        return;
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      user_images: uploadedImages.length > 0 ? uploadedImages : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setUploadedImages([]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/api/chat`, {
        session_id: currentSessionId,
        message: input,
        model: selectedModel,
        user_images_base64: uploadedImages
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.assistant_message,
        images: response.data.image_urls || [],
        generated_images: response.data.generated_images || []
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onChatUpdate();
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-1/3 flex flex-col">
      <div className="h-full flex flex-col bg-black/30 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg text-white">Workspace</h2>
              {/* API Key Status Indicator */}
              {!isCheckingApiKey && (
                <div className="flex items-center gap-1.5">
                  {hasApiKey ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs text-green-300">API Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs text-yellow-300">No API Key</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={createNewSession}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                title="New Session"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-white" />
                {!hasApiKey && !isCheckingApiKey && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/20 text-white text-sm cursor-pointer"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-black">
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-neutral-500">
                <p className="mb-2">No messages yet</p>
                <p className="text-sm">Start a conversation or create an artwork</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-xl">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#9ED1FF] to-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gradient-to-r from-[#9ED1FF] to-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gradient-to-r from-[#9ED1FF] to-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4">
          {/* API Key Warning Banner */}
          {!hasApiKey && !isCheckingApiKey && (
            <div className="mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-300 mb-1">
                    请先配置 OpenRouter API Key
                  </p>
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="text-xs text-yellow-200 hover:text-white underline cursor-pointer"
                  >
                    点击前往设置
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3">
            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 group">
                    <img
                      src={`data:image/png;base64,${img}`}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-black/70 hover:bg-red-500 rounded-full text-white text-xs transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!hasApiKey}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Upload Image"
              >
                <Upload className="w-5 h-5 text-white" />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!hasApiKey}
                placeholder={hasApiKey ? "Describe what you want to create..." : "Please configure API Key first..."}
                className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none text-white placeholder:text-neutral-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                rows={2}
              />
              
              <button
                onClick={handleSend}
                disabled={!hasApiKey || isLoading || (!input.trim() && uploadedImages.length === 0)}
                className="p-2.5 rounded-lg bg-gradient-to-r from-[#9ED1FF] to-white hover:from-[#7EC1FF] hover:to-[#9ED1FF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                <Send className="w-5 h-5 text-[#1a1a1a]" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onApiKeySaved={handleApiKeySaved} />
    </div>
  );
}