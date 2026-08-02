import { useState } from 'react';
import { Heart, Trash2, Maximize2 } from 'lucide-react';

const API_BASE = 'http://localhost:8002';

interface Session {
  session_id: string;
  last_updated: number;
  is_favorite: boolean;
  cover_image_url: string | null;
  cover_prompt: string | null;
}

interface GalleryCardProps {
  session: Session;
  onClick: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onViewImage?: (imageUrl: string, prompt?: string) => void;  // New prop for viewing image
}

export function GalleryCard({ session, onClick, onDelete, onToggleFavorite, onViewImage }: GalleryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const imageUrl = session.cover_image_url 
    ? `${API_BASE}${session.cover_image_url}`
    : null;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      onDelete();
    }
  };

  const handleViewImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrl && onViewImage) {
      onViewImage(imageUrl, session.cover_prompt || undefined);
    }
  };

  return (
    <div
      className="group relative w-64 h-64 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] border border-white/5 flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image or Placeholder */}
      {imageUrl ? (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900">
          <img
            src={imageUrl}
            alt={session.cover_prompt || 'Generated artwork'}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
          <p className="text-neutral-600 text-sm">No Image</p>
        </div>
      )}

      {/* Glassmorphic Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Prompt Text */}
        {session.cover_prompt && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-sm text-white/90 line-clamp-3 leading-relaxed">
              {session.cover_prompt}
            </p>
          </div>
        )}

        {/* Action Buttons - Top Right */}
        <div className="absolute top-3 right-3 flex gap-2">
          {/* View Image Button */}
          {imageUrl && onViewImage && (
            <button
              onClick={handleViewImage}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white transition-all duration-200 cursor-pointer"
              title="查看大图"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleFavoriteClick}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all duration-200 cursor-pointer ${
              session.is_favorite
                ? 'bg-gradient-to-r from-[#9ED1FF] to-white text-[#1a1a1a]'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${session.is_favorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 backdrop-blur-xl text-red-300 transition-all duration-200 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}