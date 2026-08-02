import { useState, useEffect } from 'react';
import * as api from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadApiKey();
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setError(false);
      setTestResult(null);
    }
  }, [isOpen]);

  const loadApiKey = async () => {
    setIsLoadingKey(true);
    try {
      // 优先从后端读取 API Key
      const status = await api.getApiKeyStatus();
      if (status.has_key && status.key_preview) {
        // 如果后端有，显示预览（不显示完整的 key）
        setApiKey(''); // 保持为空，显示 placeholder
      } else {
        // 后端没有，尝试从 localStorage 读取
        const storedKey = localStorage.getItem('openrouter_api_key');
        if (storedKey) {
          setApiKey(storedKey);
        }
      }
    } catch (error) {
      console.error('Failed to load API key from backend:', error);
      // 如果后端请求失败，降级到 localStorage
      const storedKey = localStorage.getItem('openrouter_api_key');
      if (storedKey) {
        setApiKey(storedKey);
      }
    } finally {
      setIsLoadingKey(false);
    }
  };

  const handleSave = async () => {
    const key = apiKey.trim();
    
    // 格式验证
    if (!key || !key.startsWith('sk-or-') || key.length < 20) {
      setError(true);
      setTestResult({
        status: 'error',
        message: '格式错误，请输入有效的 OpenRouter Key'
      });
      setTimeout(() => setError(false), 2000);
      return;
    }

    setIsSaving(true);
    setTestResult(null);

    try {
      // 步骤1: 先测试 API Key 是否有效
      const testResult = await api.testApiKey(key);
      
      if (testResult.status === 'error') {
        // 测试失败，显示错误信息，不保存
        setTestResult(testResult);
        setIsSaving(false);
        return;
      }

      // 步骤2: 测试通过，保存到后端 .env 文件
      await api.saveApiKey(key);
      
      // 步骤3: 同时保存到 localStorage（备用）
      localStorage.setItem('openrouter_api_key', key);
      
      // 步骤4: 显示成功消息
      setTestResult({
        status: 'success',
        message: '✅ API Key 验证通过并已保存成功！'
      });
      
      // 延迟关闭，让用户看到成功消息
      setTimeout(() => {
        onSave(key);
        onClose();
      }, 1500);
      
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: '保存失败：' + (err.message || '未知错误')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] transition-opacity duration-300 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className={`modal-glass w-[500px] max-w-[90vw] rounded-xl flex flex-col overflow-hidden transition-all duration-300 p-6 ${isAnimating ? 'modal-enter-active' : 'modal-enter'}`}>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2">
            <i className="ph-fill ph-key text-blue-500"></i>
            配置 API Key
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <i className="ph ph-x"></i>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            本应用使用 <strong>OpenRouter</strong> 提供 AI 服务。请输入您的 API Key 以开启创作。<br />
            <span className="text-xs opacity-60">
              新用户请前往{' '}
              <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                openrouter.ai
              </a>{' '}
              注册并获取 Key。
            </span>
          </p>

          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase">API Key</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null); // 清除之前的测试结果
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                disabled={isLoadingKey || isSaving}
                className={`w-full bg-black/50 border rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:bg-white/5 transition placeholder-gray-600 disabled:opacity-50 ${error ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                placeholder={isLoadingKey ? '加载中...' : 'sk-or-v1-...'}
                autoFocus
              />
              
              {/* 眼睛按钮 */}
              {!isLoadingKey && (
                <button
                  type="button"
                  disabled={isSaving}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <i className="ph-fill ph-eye-slash text-base"></i>
                  ) : (
                    <i className="ph-fill ph-eye text-base"></i>
                  )}
                </button>
              )}
              
              {/* 加载指示器 */}
              {isLoadingKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1 animate-pulse">
                <i className="ph-fill ph-warning-circle"></i> 
                格式错误，请输入有效的 OpenRouter Key
              </p>
            )}
            
            {/* 测试结果 */}
            {testResult && (
              <div className={`text-xs flex items-center gap-2 p-3 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300 ${
                testResult.status === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <i className={`ph-fill ${testResult.status === 'success' ? 'ph-check-circle' : 'ph-x-circle'}`}></i>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            取消
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoadingKey || !apiKey.trim()}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>验证并保存中...</span>
              </>
            ) : (
              <>
                <span>保存</span>
                <i className="ph-bold ph-check"></i>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}