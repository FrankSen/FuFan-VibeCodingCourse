import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ImageData {
  url: string;
  prompt?: string;
}

interface ImageLightboxProps {
  imageUrl?: string;  // For backward compatibility
  prompt?: string;    // For backward compatibility
  images?: ImageData[];  // For multiple images support
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, prompt, images, initialIndex = 0, onClose }: ImageLightboxProps) {
  // Convert single image to array format
  const imageList: ImageData[] = images || [{ url: imageUrl || '', prompt }];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  const currentImage = imageList[currentIndex];
  const hasMultipleImages = imageList.length > 1;

  // Navigate to previous image
  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  // Navigate to next image
  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowLeft' && hasMultipleImages) {
        setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight' && hasMultipleImages) {
        setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, hasMultipleImages, imageList.length]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const lightboxContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-200 z-10 cursor-pointer"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Previous button */}
        {hasMultipleImages && (
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-200 z-10 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Next button */}
        {hasMultipleImages && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-200 z-10 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Image counter */}
        {hasMultipleImages && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10">
            <p className="text-sm text-white">
              {currentIndex + 1} / {imageList.length}
            </p>
          </div>
        )}

        {/* Image */}
        <div 
          className="relative flex items-center justify-center w-full h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={currentImage.url}
            alt={currentImage.prompt || "Generated artwork"}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          />
        </div>

        {/* Prompt (if available) - Full width with padding */}
        {currentImage.prompt && (
          <div 
            className="absolute bottom-4 left-4 right-4 px-6 py-3 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-white text-left leading-relaxed">{currentImage.prompt}</p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(lightboxContent, document.body);
}