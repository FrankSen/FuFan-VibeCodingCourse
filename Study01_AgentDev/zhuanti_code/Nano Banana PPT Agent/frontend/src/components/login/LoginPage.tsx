import { useState, useEffect, useRef } from 'react';
import { SettingsModal } from './SettingsModal';
import { PromptTemplateModal } from './PromptTemplateModal';
import * as api from '../../services/api';

interface LoginPageProps {
  onStartCreation: (sessionId: string) => void;
}

export function LoginPage({ onStartCreation }: LoginPageProps) {
  const [hasValidKey, setHasValidKey] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [sessions, setSessions] = useState<api.Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkBackendKey();
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await api.listSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLocalKey = () => {
    const storedKey = localStorage.getItem('openrouter_api_key');
    if (storedKey && storedKey.startsWith('sk-or-')) {
      setHasValidKey(true);
    } else {
      setHasValidKey(false);
    }
  };

  // 从后端检查 API Key
  const checkBackendKey = async () => {
    try {
      const status = await api.getApiKeyStatus();
      if (status.has_key) {
        setHasValidKey(true);
        // 如果后端有 key 但本地没有，提示用户
        const localKey = localStorage.getItem('openrouter_api_key');
        if (!localKey) {
          console.log('后端已配置 API Key');
        }
      } else {
        // 后端没有，检查本地
        checkLocalKey();
      }
    } catch (error) {
      console.error('Failed to check backend API key:', error);
      // 降级到本地检查
      checkLocalKey();
    }
  };

  const handleApiKeySave = (key: string) => {
    setHasValidKey(true);
    setShowKeyHint(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleStartCreation = async () => {
    if (!hasValidKey) {
      setIsSettingsOpen(true);
      setShowKeyHint(true);
      return;
    }

    const input = inputValue.trim();
    if (!input && !selectedFile) {
      if (textareaRef.current) {
        textareaRef.current.classList.add('animate-pulse');
        textareaRef.current.placeholder = "请先输入主题或上传文档...";
        setTimeout(() => {
          textareaRef.current?.classList.remove('animate-pulse');
        }, 500);
      }
      return;
    }

    try {
      setIsCreating(true);

      // 1. 上传文档（如果有）
      let contextText = '';
      if (selectedFile) {
        const uploadResult = await api.uploadDoc(selectedFile);
        contextText = uploadResult.extracted_text;
      }

      // 2. 创建会话
      const createResult = await api.createSession(input || 'New Project');
      const sessionId = createResult.session_id;

      // 3. 保存上下文信息到 localStorage
      localStorage.setItem('current_session_id', sessionId);
      localStorage.setItem('current_project_prompt', input);
      localStorage.setItem('current_context_text', contextText);

      // 4. 跳转到编辑器
      onStartCreation(sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('创建项目失败，请检查网络连接和 API Key');
      setIsCreating(false);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    localStorage.setItem('current_session_id', sessionId);
    onStartCreation(sessionId);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* 背景特效 */}
      <div className="aurora-bg"></div>

      {/* 导航栏 */}
      <nav className="h-16 glass-nav fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-12">
        <a 
          href="https://fufan.ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition group"
        >
          <span className="tracking-tight font-semibold">赋范空间 fufan.ai</span>
        </a>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition text-sm group"
          >
            <i className="ph ph-gear group-hover:rotate-90 transition-transform duration-500"></i>
            <span>设置 API Key</span>
            <div className={`w-2 h-2 rounded-full ml-1 ${hasValidKey ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}></div>
          </button>
        </div>
      </nav>

      {/* 核心创作区 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-32 pb-16 relative z-10 w-full max-w-4xl mx-auto">
        
        <h1 className="text-4xl md:text-5xl text-center text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-400 mb-4 tracking-tight">
          What will you create today?
        </h1>
        <p className="text-gray-400 text-center mb-10 max-w-2xl">
          输入主题，上传文档，AI 将为您生成专业的演示文稿。
        </p>

        {/* 超级输入框 */}
        <div className="w-full relative group">
          <div className="super-input-container rounded-2xl p-2 flex flex-col">
            {/* 文本输入 */}
            <div className="flex items-start gap-3 p-2">
              <div className="mt-2 text-blue-400">
                <i className="ph-fill ph-sparkle animate-pulse"></i>
              </div>
              <textarea 
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={handleInputChange}
                disabled={isCreating}
                className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none py-1.5 leading-relaxed"
                placeholder="比如：帮我制作一份关于深度学习发展史的 PPT..."
              />
            </div>

            {/* 附件预览区 */}
            {selectedFile && (
              <div className="px-12 pb-2 flex gap-2">
                <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-md px-3 py-1.5">
                  <i className="ph-fill ph-file-text text-blue-400"></i>
                  <span className="text-xs text-white max-w-[150px] truncate">{selectedFile.name}</span>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="hover:text-red-400 ml-1"
                    disabled={isCreating}
                  >
                    <i className="ph ph-x"></i>
                  </button>
                </div>
              </div>
            )}

            {/* 工具栏 */}
            <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition flex items-center gap-2 group/btn disabled:opacity-50 cursor-pointer"
                  title="上传文档/图片"
                >
                  <i className="ph ph-paperclip"></i>
                  <span className="text-xs font-medium group-hover/btn:text-blue-400 text-gray-500">添加参考文档 (PDF/IMG)</span>
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,image/*"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsTemplateOpen(true)}
                  disabled={isCreating}
                  className="px-3 py-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition flex items-center gap-2 text-xs font-medium border border-white/5 hover:border-blue-500/30 disabled:opacity-50 cursor-pointer"
                  title="设置提示词模板"
                >
                  <i className="ph ph-magic-wand"></i>
                  <span>提示词模板</span>
                </button>
                
                <button 
                  onClick={handleStartCreation}
                  disabled={isCreating}
                  className={`bg-white text-black hover:bg-blue-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition shadow-lg shadow-white/10 cursor-pointer ${!hasValidKey || isCreating ? 'btn-disabled' : 'hover:scale-105'}`}
                >
                  {isCreating ? (
                    <>
                      <i className="ph ph-spinner animate-spin"></i>
                      <span>规划中...</span>
                    </>
                  ) : (
                    <>
                      <span>开始制作</span>
                      <i className="ph-bold ph-arrow-right"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* 提示信息 */}
          <div className={`text-center mt-4 text-xs text-red-400 transition-opacity duration-300 ${showKeyHint ? 'opacity-100' : 'opacity-0'}`}>
            请先点击右上角设置 API Key 才能开始制作
          </div>
        </div>

      </main>

      {/* 历史项目 */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2">
            <i className="ph ph-clock-counter-clockwise text-blue-500"></i>
            近期项目
          </h2>
          <button className="text-sm text-gray-500 hover:text-white transition">查看全部</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 加载中 */}
          {isLoading && (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="loader"></div>
            </div>
          )}

          {/* 历史项目卡片 */}
          {!isLoading && sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => handleOpenSession(session.id)}
              className="project-card group bg-[#121212] rounded-xl overflow-hidden cursor-pointer relative"
            >
              <div className="aspect-video bg-gray-800 relative overflow-hidden">
                <img 
                  src={api.getImageUrl(session.preview_image) || 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/2dcd5d3d-e8fa-43b6-8d7d-0fba933055b3.png'} 
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  alt={session.topic}
                  onError={(e) => {
                    e.currentTarget.src = 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/2dcd5d3d-e8fa-43b6-8d7d-0fba933055b3.png';
                  }}
                />
                
                <div className="play-btn absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] opacity-0 transition-all duration-300">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl text-black transform scale-75 transition-transform duration-300">
                    <i className="ph-fill ph-pencil-simple"></i>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-sm text-white mb-1 group-hover:text-blue-400 transition truncate">{session.topic}</h3>
                <p className="text-xs text-gray-500">{api.formatTimestamp(session.created_at)}</p>
              </div>
            </div>
          ))}

          {/* 新建项目卡片 */}
          {!isLoading && (
            <div 
              onClick={() => textareaRef.current?.focus()}
              className="project-card group bg-[#121212] rounded-xl overflow-hidden cursor-pointer border-dashed border-gray-700 flex flex-col items-center justify-center aspect-[4/3] hover:border-blue-500/50 hover:bg-blue-500/5 transition"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <i className="ph ph-plus text-gray-400 group-hover:text-blue-400"></i>
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-white">新建空白项目</span>
            </div>
          )}

        </div>
      </section>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleApiKeySave}
      />

      {/* Prompt Template Modal */}
      <PromptTemplateModal 
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
      />

    </div>
  );
}