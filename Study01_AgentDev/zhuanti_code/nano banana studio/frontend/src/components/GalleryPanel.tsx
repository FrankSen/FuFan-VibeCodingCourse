import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryCard } from './GalleryCard';
import { ImageLightbox } from './ImageLightbox';
import { toast } from 'sonner@2.0.3';

const API_BASE = 'http://localhost:8002';
const ITEMS_PER_PAGE = 12;

interface Session {
  session_id: string;
  last_updated: number;
  is_favorite: boolean;
  cover_image_url: string | null;
  cover_prompt: string | null;
}

interface GalleryPanelProps {
  onSessionSelect: (sessionId: string) => void;
  refreshTrigger: number;
}

interface ImageData {
  url: string;
  prompt?: string;
}

export function GalleryPanel({ onSessionSelect, refreshTrigger }: GalleryPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorite'>('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxImages, setLightboxImages] = useState<ImageData[] | null>(null);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = filter === 'favorite' ? { filter: 'favorite' } : {};
      const response = await axios.get(`${API_BASE}/api/sessions`, { params });
      setSessions(response.data);
      setCurrentPage(1); // Reset to first page when filter changes
    } catch (error) {
      toast.error('Failed to load gallery');
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filter, refreshTrigger]);

  const handleDelete = async (sessionId: string) => {
    try {
      await axios.delete(`${API_BASE}/api/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.session_id !== sessionId));
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Failed to delete session');
      console.error('Error deleting session:', error);
    }
  };

  const handleToggleFavorite = async (sessionId: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/sessions/${sessionId}/favorite`);
      setSessions(sessions.map(s => 
        s.session_id === sessionId ? { ...s, is_favorite: response.data.is_favorite } : s
      ));
    } catch (error) {
      toast.error('Failed to toggle favorite');
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle viewing image in lightbox - fetch all images from session
  const handleViewImage = async (sessionId: string, clickedImageUrl: string) => {
    try {
      // Fetch session data to get all generated images
      const response = await axios.get(`${API_BASE}/api/sessions/${sessionId}`);
      const messages = response.data.messages || [];
      
      // Extract all generated images from assistant messages
      const allImages: ImageData[] = [];
      messages.forEach((msg: any) => {
        if (msg.role === 'assistant' && msg.generated_images) {
          msg.generated_images.forEach((imgData: any) => {
            allImages.push({
              url: `${API_BASE}${imgData.file_url}`,
              prompt: imgData.prompt
            });
          });
        }
      });

      // Find the index of the clicked image
      const clickedIndex = allImages.findIndex(img => img.url === clickedImageUrl);
      
      if (allImages.length > 0) {
        setLightboxImages(allImages);
        setLightboxInitialIndex(clickedIndex >= 0 ? clickedIndex : allImages.length - 1); // Default to last image
      } else {
        // Fallback: just show the cover image
        setLightboxImages([{ url: clickedImageUrl }]);
        setLightboxInitialIndex(0);
      }
    } catch (error) {
      console.error('Error fetching session images:', error);
      // Fallback: just show the cover image
      setLightboxImages([{ url: clickedImageUrl }]);
      setLightboxInitialIndex(0);
    }
  };

  const handleCardClick = (sessionId: string) => {
    onSessionSelect(sessionId);
  };

  // Pagination logic
  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSessions = sessions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <div className="w-2/3 overflow-hidden transition-all duration-300">
        <div className="h-full flex flex-col bg-black/30 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden">
          {/* Header with Filter Tabs */}
          <div className="p-5 border-b border-white/5">
            <div className="flex gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2 rounded-lg transition-all duration-200 text-sm cursor-pointer ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-[#9ED1FF] to-white text-[#1a1a1a]'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                全部作品
              </button>
              <button
                onClick={() => setFilter('favorite')}
                className={`px-5 py-2 rounded-lg transition-all duration-200 text-sm cursor-pointer ${
                  filter === 'favorite'
                    ? 'bg-gradient-to-r from-[#9ED1FF] to-white text-[#1a1a1a]'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                精选收藏
              </button>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-neutral-500">Loading...</div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-neutral-500">
                  <p className="mb-2">No sessions yet</p>
                  <p className="text-sm">Start a new chat to create your first artwork</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-5">
                  {currentSessions.map((session) => (
                    <GalleryCard
                      key={session.session_id}
                      session={session}
                      onClick={() => handleCardClick(session.session_id)}
                      onDelete={() => handleDelete(session.session_id)}
                      onToggleFavorite={() => handleToggleFavorite(session.session_id)}
                      onViewImage={(imageUrl, prompt) => handleViewImage(session.session_id, imageUrl)}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 rounded-lg transition-all text-sm cursor-pointer ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-[#9ED1FF] to-white text-[#1a1a1a]'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxInitialIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </>
  );
}