import { useState, useEffect } from 'react';
import { Slide } from '../../types';

interface SidePanelProps {
  isOpen: boolean;
  mode: 'edit' | 'insert';
  slide: Slide | null;
  referenceUrl?: string;
  onClose: () => void;
  onSubmit: (prompt: string, mode: 'edit' | 'insert') => void;
  onSelectVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

export function SidePanel({ 
  isOpen, 
  mode, 
  slide, 
  referenceUrl,
  onClose, 
  onSubmit,
  onSelectVersion,
  onDeleteVersion
}: SidePanelProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit') {
        setView('list');
      } else {
        setView('create');
      }
      setPrompt('');
    }
  }, [isOpen, mode]);

  // 当 slide 变化时，如果是 edit 模式且面板打开，保持在 list 视图
  useEffect(() => {
    if (isOpen && mode === 'edit' && slide) {
      setView('list');
    }
  }, [slide, isOpen, mode]);

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

  return (
    <>
      {/* Side Panel */}
      <div 
        className={`fixed left-0 top-0 h-full w-1/3 min-w-[400px] max-w-[500px] bg-[#0F0F0F] border-r border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <i className={`text-blue-400 ${mode === 'edit' ? 'ph ph-clock-counter-clockwise' : 'ph ph-plus-circle'}`}></i>
            <h2 className="text-sm text-white font-medium">
              {mode === 'edit' ? '版本历史与编辑' : '插入新页面'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
          >
            <i className="ph ph-x text-lg"></i>
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
                    className={`group flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all relative ${
                      isSelected 
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {slide.versions.length > 1 && (
                      <button 
                        onClick={(e) => handleDeleteVersion(e, ver.id)}
                        className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition z-10"
                      >
                        <i className="ph ph-trash text-base"></i>
                      </button>
                    )}
                    
                    {/* Preview Image */}
                    <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0 shadow-lg group-hover:scale-[1.02] transition-transform duration-300">
                      <img src={ver.url} className="w-full h-full object-cover" alt={`Version ${vIndex + 1}`} />
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
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
                      <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed" title={ver.prompt}>
                        {ver.prompt}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="h-16 border-t border-white/10 bg-black/20 flex items-center justify-center px-5 flex-shrink-0">
              <button 
                onClick={() => setView('create')}
                className="w-full h-10 rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition flex items-center justify-center gap-2 group"
              >
                <i className="ph-bold ph-plus group-hover:scale-110 transition-transform"></i>
                <span className="text-sm font-medium">创建新版本</span>
              </button>
            </div>
          </>
        )}

        {/* Create View */}
        {view === 'create' && (
          <>
            <div className="flex-1 flex flex-col p-5 overflow-y-auto">
              
              {/* Input Area */}
              <div className="flex flex-col mb-5">
                <label className="text-[10px] text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="ph ph-pencil-simple"></i>
                  <span>{mode === 'edit' ? '输入修改需求' : '输入页面内容描述'}</span>
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  placeholder="请输入提示词..."
                  autoFocus
                />
              </div>

              {/* Reference Area */}
              <div className="flex flex-col flex-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="ph ph-image"></i>
                    <span>风格参考基底</span>
                  </div>
                  <span className="text-[9px] font-normal normal-case bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                    Reference
                  </span>
                </label>
                <div className="flex-1 min-h-[200px] bg-black rounded-lg border border-white/10 overflow-hidden relative group">
                  <div 
                    className="w-full h-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${getCurrentRefUrl()})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-xs text-white/80 flex items-center gap-2">
                      <i className="ph ph-magic-wand"></i>
                      基于此图片风格生成...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-16 border-t border-white/10 bg-black/20 flex items-center justify-end gap-3 px-5 flex-shrink-0">
              {mode === 'edit' && (
                <button 
                  onClick={() => setView('list')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
                >
                  <i className="ph ph-arrow-left mr-2"></i>
                  返回列表
                </button>
              )}
              <button 
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <i className="ph-bold ph-magic-wand"></i>
                <span>{mode === 'edit' ? '生成新版本' : '插入新页面'}</span>
              </button>
            </div>
          </>
        )}

      </div>
    </>
  );
}