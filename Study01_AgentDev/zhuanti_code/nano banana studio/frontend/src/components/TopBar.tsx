import { useState } from 'react';
import { QRCodeModal } from './QRCodeModal';

export function TopBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="h-20 px-6 py-4 sticky top-0 z-50 bg-gradient-to-r from-[#1a1a1a] to-[#324F78]/30">
        <div className="h-full px-6 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 relative">
          {/* Left: Brand - Absolute positioned */}
          <div className="absolute left-6">
            <span className="text-sm bg-gradient-to-r from-[#9ED1FF] to-white bg-clip-text text-transparent">
              赋范空间出品
            </span>
          </div>

          {/* Center: Title & Subtitle */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl tracking-tight bg-gradient-to-r from-[#9ED1FF] to-white bg-clip-text text-transparent">
              Nano Banana Studio
            </h1>
            <span className="text-xs text-neutral-500 tracking-wide">
              By 九天Hector
            </span>
          </div>

          {/* Right: CTA Button - Absolute positioned */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute right-6 px-5 py-2 rounded-lg bg-gradient-to-r from-[#9ED1FF] to-white hover:from-[#7EC1FF] hover:to-[#9ED1FF] text-[#1a1a1a] transition-all duration-200 text-sm cursor-pointer"
          >
            领取项目源码 & 提示词
          </button>
        </div>
      </header>

      <QRCodeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}