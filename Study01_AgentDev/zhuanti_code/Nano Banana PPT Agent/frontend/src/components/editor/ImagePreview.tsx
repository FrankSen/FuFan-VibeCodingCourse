import { useEffect } from 'react';

interface ImagePreviewProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreview({ imageUrl, isOpen, onClose }: ImagePreviewProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button 
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-10"
        onClick={onClose}
      >
        <i className="ph ph-x text-2xl"></i>
      </button>

      {/* Image container */}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="max-w-full max-h-[95vh] object-contain shadow-2xl rounded-lg"
        />
        
        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 rounded-full text-white text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10">
          <i className="ph ph-magnifying-glass-plus"></i>
          <span>点击背景关闭 / ESC 键退出</span>
        </div>
      </div>
    </div>
  );
}