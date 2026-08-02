import { useState, useEffect } from 'react';
import { Slide, Version } from '../../types';

interface VersionModalProps {
  isOpen: boolean;
  mode: 'edit' | 'insert';
  slide: Slide | null;
  referenceUrl?: string;
  onClose: () => void;
  onSubmit: (prompt: string, mode: 'edit' | 'insert') => void;
  onSelectVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

export function VersionModal({ 
  isOpen, 
  mode, 
  slide, 
  referenceUrl,
  onClose, 
  onSubmit,
  onSelectVersion,
  onDeleteVersion
}: VersionModalProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [prompt, setPrompt] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit') {
        setView('list');
      } else {
        setView('create');
      }
      setTimeout(() => setIsAnimating(true), 10);
      setPrompt('');
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, mode]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    onSubmit(trimmedPrompt, mode);
    setPrompt('');
  };

  const handleDeleteVersion = (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation();
    if (slide && slide.versions.length <= 1) return;
    
    if (confirm("确定删除此版本？")) {
      onDeleteVersion(versionId);
    }
  };

  const getActiveVersion = (slide: Slide) => {
    return slide.versions.find(v => v.id === slide.activeVersionId) || slide.versions[0];
  };

  const getCurrentRefUrl = () => {
    if (mode === 'insert' && referenceUrl) {
      return referenceUrl;
    }
    if (slide) {
      return getActiveVersion(slide).url;
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className={`modal-glass w-[700px] max-w-[95vw] h-[500px] rounded-xl flex flex-col overflow-hidden transition-all duration-300 ${isAnimating ? 'modal-enter-active' : 'modal-enter'}`}>
        
        {/* Header */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-5 bg-white/5">
          <div className="flex items-center gap-2">
            <i className={`text-blue-400 ${mode === 'edit' ? 'ph ph-clock-counter-clockwise' : 'ph ph-plus-circle'}`}></i>
            <h2 className="text-sm text-white">
              {mode === 'edit' ? '版本历史与编辑' : '插入新页面'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <i className="ph ph-x"></i>
          </button>
        </div>

        {/* List View */}
        {view === 'list' && slide && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {slide.versions.map((ver) => {
                const isSelected = ver.id === slide.activeVersionId;
                const vIndex = slide.versions.findIndex(v => v.id === ver.id);
                return (
                  <div
                    key={ver.id}
                    onClick={() => onSelectVersion(ver.id)}
                    className={`group flex gap-4 p-4 rounded-xl border cursor-pointer transition-all relative ${isSelected ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                  >
                    {slide.versions.length > 1 && (
                      <button 
                        onClick={(e) => handleDeleteVersion(e, ver.id)}
                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition z-10"
                      >
                        <i className="ph ph-trash text-base"></i>
                      </button>
                    )}
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-sm ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                          Version {vIndex + 1}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono bg-black/30 px-1.5 py-0.5 rounded">
                          {ver.timestamp}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full tracking-wide shadow-sm">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed" title={ver.prompt}>
                        {ver.prompt}
                      </p>
                    </div>
                    
                    <div className="w-40 aspect-video rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0 relative shadow-lg group-hover:scale-105 transition-transform duration-300">
                      <img src={ver.url} className="w-full h-full object-cover" alt={`Version ${vIndex + 1}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="h-14 border-t border-white/10 bg-black/20 flex items-center justify-center px-5">
              <button 
                onClick={() => setView('create')}
                className="w-full h-9 rounded-lg border border-dashed border-gray-600 hover:border-blue-500 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition flex items-center justify-center gap-2 group"
              >
                <i className="ph-bold ph-plus group-hover:scale-110 transition-transform"></i>
                <span className="text-xs font-medium">创建新版本 (Create New Version)</span>
              </button>
            </div>
          </>
        )}

        {/* Create View */}
        {view === 'create' && (
          <>
            <div className="flex-1 flex flex-col p-5 h-full">
              <div className="flex gap-5 h-full">
                {/* Left: Input */}
                <div className="w-1/2 flex flex-col">
                  <label className="text-[10px] text-blue-400 uppercase tracking-wider mb-2 block">
                    {mode === 'edit' ? '输入修改需求' : '输入页面内容描述'}
                  </label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                    placeholder="请输入提示词..."
                    autoFocus
                  />
                </div>

                {/* Right: Reference */}
                <div className="w-1/2 flex flex-col">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block flex justify-between">
                    <span>风格参考基底</span>
                    <span className="text-[9px] font-normal normal-case bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                      Reference
                    </span>
                  </label>
                  <div className="flex-1 bg-black rounded-lg border border-white/10 overflow-hidden relative group">
                    <div 
                      className="w-full h-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${getCurrentRefUrl()})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <p className="text-[10px] text-white/80">基于此图片风格生成...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-14 border-t border-white/10 bg-black/20 flex items-center justify-end gap-3 px-5">
              {mode === 'edit' && (
                <button 
                  onClick={() => setView('list')}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
                >
                  返回列表
                </button>
              )}
              <button 
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <i className="ph-bold ph-magic-wand"></i>
                <span>{mode === 'edit' ? '生成新版本' : '插入新页面'}</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}