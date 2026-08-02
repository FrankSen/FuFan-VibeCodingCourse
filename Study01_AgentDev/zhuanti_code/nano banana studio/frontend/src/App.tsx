import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { GalleryPanel } from './components/GalleryPanel';
import { ChatPanel } from './components/ChatPanel';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleNewSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setRefreshGallery(prev => prev + 1);
  };

  const handleChatUpdate = () => {
    setRefreshGallery(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#1f2937] to-[#324F78] text-white relative">
      <div className="relative z-10">
        <TopBar />
        
        <div className="flex h-[calc(100vh-88px)] px-6 pb-6 gap-6">
          <GalleryPanel 
            onSessionSelect={handleSessionSelect}
            refreshTrigger={refreshGallery}
          />
          
          <ChatPanel 
            sessionId={currentSessionId}
            onNewSession={handleNewSession}
            onChatUpdate={handleChatUpdate}
          />
        </div>
      </div>

      <Toaster theme="dark" position="top-right" />
    </div>
  );
}