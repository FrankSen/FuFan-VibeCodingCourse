import { X } from 'lucide-react';
import qrCodeImage from 'figma:asset/0250e49fd76780fadd78f49de2db1ea2f78276cd.png';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col items-center gap-6">
          <h2 className="text-2xl text-center bg-gradient-to-r from-[#9ED1FF] to-white bg-clip-text text-transparent">
            扫码领取资料
          </h2>
          
          {/* QR Code */}
          <div className="w-64 h-64 bg-white rounded-2xl p-4 flex items-center justify-center">
            <img 
              src={qrCodeImage} 
              alt="QR Code" 
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-neutral-400 text-center text-sm">
            扫描二维码添加微信获取完整项目资料
          </p>
        </div>
      </div>
    </div>
  );
}