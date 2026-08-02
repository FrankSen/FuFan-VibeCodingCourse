import { useState, useEffect } from 'react';
import * as api from '../../services/api';

interface PromptTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TEMPLATE = `请制作一个现代的科技/互联网公司演示幻灯片。风格：现代SaaS美学，简洁的UI，流畅的矢量艺术，柔和的阴影（玻璃质感）。背景：干净的浅色背景（白色或非常浅的灰色），带有微妙的科技元素（淡淡的网格、柔和的蓝色/紫色网格渐变）。内容：极简的图表，圆角卡片，无衬线字体风格。避免：老式学术风格，沉重的深色边框，逼真的照片，杂乱的文字。`;

export function PromptTemplateModal({ isOpen, onClose }: PromptTemplateModalProps) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 每次打开时重置为默认模板或从后端加载
      loadTemplate();
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setSaveResult(null);
    }
  }, [isOpen]);

  const loadTemplate = async () => {
    try {
      // 尝试从后端加载用户自定义的模板
      const customTemplate = await api.getPromptTemplate();
      if (customTemplate) {
        setTemplate(customTemplate);
      } else {
        setTemplate(DEFAULT_TEMPLATE);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      // 如果加载失败，使用默认模板
      setTemplate(DEFAULT_TEMPLATE);
    }
  };

  const handleResetToDefault = () => {
    setTemplate(DEFAULT_TEMPLATE);
    setSaveResult(null);
  };

  const handleSave = async () => {
    if (!template.trim()) {
      setSaveResult({
        status: 'error',
        message: '提示词模板不能为空'
      });
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      await api.savePromptTemplate(template);
      
      setSaveResult({
        status: 'success',
        message: '✅ 提示词模板已保存成功！'
      });

      // 延迟关闭，让用户看到成功消息
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setSaveResult({
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
      <div className={`modal-glass w-[700px] max-w-[90vw] rounded-xl flex flex-col overflow-hidden transition-all duration-300 p-6 ${isAnimating ? 'modal-enter-active' : 'modal-enter'}`}>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2">
            <i className="ph-fill ph-magic-wand text-purple-500"></i>
            提示词模板
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <i className="ph ph-x"></i>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            设置全局提示词模板，将应用于所有生成的幻灯片。您可以自定义风格、主题和设计偏好。
          </p>

          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase">模板内容</label>
            <textarea 
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setSaveResult(null);
              }}
              disabled={isSaving}
              className="w-full h-64 bg-black/50 border border-white/10 focus:border-blue-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/5 transition placeholder-gray-600 disabled:opacity-50 resize-none leading-relaxed"
              placeholder="输入您的提示词模板..."
            />
          </div>

          {/* 保存结果 */}
          {saveResult && (
            <div className={`text-xs flex items-center gap-2 p-3 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300 ${
              saveResult.status === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <i className={`ph-fill ${saveResult.status === 'success' ? 'ph-check-circle' : 'ph-x-circle'}`}></i>
              <span>{saveResult.message}</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button 
            onClick={handleResetToDefault}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center gap-2 disabled:opacity-50"
          >
            <i className="ph ph-arrow-counter-clockwise"></i>
            <span>恢复默认</span>
          </button>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
            >
              取消
            </button>
            
            <button 
              onClick={handleSave}
              disabled={isSaving || !template.trim()}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm shadow-lg shadow-purple-600/20 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>保存中...</span>
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
    </div>
  );
}
