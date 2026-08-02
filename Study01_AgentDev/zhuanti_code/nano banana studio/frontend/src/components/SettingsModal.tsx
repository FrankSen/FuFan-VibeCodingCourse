import { X, ExternalLink, Key, Check } from 'lucide-react';
import { useState } from 'react';

const API_BASE = 'http://localhost:8002';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySaved: () => void;
}

export function SettingsModal({ isOpen, onClose, onApiKeySaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API Key');
      return;
    }

    if (!apiKey.startsWith('sk-or-')) {
      setError('OpenRouter API Key should start with "sk-or-"');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/settings/apikey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to save API Key');
      }

      setSuccess(true);
      setTimeout(() => {
        onApiKeySaved();
        onClose();
        setApiKey('');
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API Key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#9ED1FF]/20 to-white/20">
              <Key className="w-6 h-6 text-[#9ED1FF]" />
            </div>
            <div>
              <h2 className="text-2xl text-white">API 设置</h2>
              <p className="text-sm text-neutral-400">配置 OpenRouter API Key</p>
            </div>
          </div>

          {/* Guide Section */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-300 mb-2">
                  还没有 API Key？
                </p>
                <a
                  href="https://openrouter.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white hover:text-[#9ED1FF] transition-colors cursor-pointer"
                >
                  <span>前往 OpenRouter 官网注册</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-xs text-neutral-400 mt-2">
                  注册后在 Keys 页面创建新的 API Key
                </p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-neutral-300 mb-2 block">
                OpenRouter API Key
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                }}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#9ED1FF]/50 focus:border-[#9ED1FF]/50 text-white placeholder:text-neutral-500 transition-all"
              />
            </label>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <p className="text-sm text-green-300">API Key 保存成功！</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || success}
              className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-[#9ED1FF] to-white hover:from-[#7EC1FF] hover:to-[#9ED1FF] text-[#1a1a1a] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? '保存中...' : success ? '已保存' : '保存设置'}
            </button>
          </div>

          {/* Security Note */}
          <div className="pt-4 border-t border-white/5">
            <p className="text-xs text-neutral-500 text-center">
              🔒 您的 API Key 将安全存储在本地服务器配置文件中
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}