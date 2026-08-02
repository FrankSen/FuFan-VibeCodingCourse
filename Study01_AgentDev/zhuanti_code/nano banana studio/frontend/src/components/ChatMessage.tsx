import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE = 'http://localhost:8002';

interface GeneratedImage {
  file_url: string;
  prompt?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | { type: string; text: string } | Array<{ type: string; text: string }>;
  images?: string[];
  user_images?: string[];
  generated_images?: GeneratedImage[];
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [lightboxImage, setLightboxImage] = useState<{ url: string; prompt?: string } | null>(null);

  // Extract text content from various possible formats
  const getTextContent = () => {
    if (typeof message.content === 'string') {
      // If content is just the image placeholder, return empty string
      const trimmed = message.content.trim();
      if (trimmed === '🖼️User uploaded' || 
          trimmed === 'User uploaded' || 
          trimmed === '🖼️') {
        return '';
      }
      return message.content;
    }
    if (Array.isArray(message.content)) {
      const filteredTexts = message.content
        .filter(item => item.type === 'text')
        .map(item => item.text || '')
        .filter(text => {
          // Filter out image placeholder markers from backend
          const trimmedText = text.trim();
          // Exclude placeholders but keep real user text
          return trimmedText !== '🖼️User uploaded' && 
                 trimmedText !== 'User uploaded' &&
                 trimmedText !== '🖼️' &&
                 trimmedText.length > 0;
        });
      
      return filteredTexts.join('\n').trim();
    }
    if (message.content && typeof message.content === 'object' && 'text' in message.content) {
      return message.content.text;
    }
    return '';
  };

  // Extract image URLs from content array (for history loaded messages)
  const getContentImages = (): string[] => {
    if (Array.isArray(message.content)) {
      return message.content
        .filter(item => item.type === 'image_url')
        .map(item => {
          if (typeof item === 'object' && 'image_url' in item) {
            const url = (item as any).image_url?.url || '';
            // If it's a relative path, prepend API_BASE
            if (url.startsWith('/')) {
              return `${API_BASE}${url}`;
            }
            // If it's already a full URL or base64, return as-is
            return url;
          }
          return '';
        })
        .filter(url => url.length > 0);
    }
    return [];
  };

  const textContent = getTextContent();
  const contentImages = getContentImages();

  // Check for generated images (priority for assistant messages)
  const generatedImages = message.generated_images || [];
  const hasGeneratedImages = generatedImages.length > 0;
  const hasText = textContent.length > 0;

  // Open lightbox
  const handleImageClick = (imageUrl: string, prompt?: string) => {
    setLightboxImage({ url: imageUrl, prompt });
  };

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
          {/* User uploaded images - Base64 format (real-time uploads) */}
          {isUser && message.user_images && message.user_images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.user_images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="cursor-pointer rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-200"
                  onClick={() => handleImageClick(`data:image/png;base64,${img}`)}
                >
                  <img
                    src={`data:image/png;base64,${img}`}
                    alt="User uploaded"
                    className="max-w-xs h-auto"
                  />
                </div>
              ))}
            </div>
          )}

          {/* User uploaded images - from content array (history loaded) */}
          {isUser && contentImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contentImages.map((imgUrl, idx) => (
                <div 
                  key={idx} 
                  className="cursor-pointer rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-200"
                  onClick={() => handleImageClick(imgUrl)}
                >
                  <img
                    src={imgUrl}
                    alt="User uploaded"
                    className="max-w-xs h-auto"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Text content - Only show if not empty */}
          {hasText && (
            <div
              className={`px-4 py-2.5 rounded-2xl backdrop-blur-lg text-sm ${
                isUser
                  ? 'bg-gradient-to-r from-[#9ED1FF] to-white text-[#1a1a1a]'
                  : 'bg-white/5 text-white'
              }`}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap">{textContent}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, '')}
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {textContent}
                </ReactMarkdown>
              )}
            </div>
          )}

          {/* Assistant generated images (from generated_images array - NEW LOGIC) */}
          {!isUser && hasGeneratedImages && (
            <div className="flex flex-col gap-2 w-full">
              {generatedImages.map((imgData, idx) => (
                <div 
                  key={idx} 
                  className="rounded-xl overflow-hidden border border-white/10 hover:border-[#9ED1FF]/50 transition-all duration-200 cursor-pointer group relative"
                  onClick={() => handleImageClick(`${API_BASE}${imgData.file_url}`, imgData.prompt)}
                >
                  <img
                    src={`${API_BASE}${imgData.file_url}`}
                    alt={imgData.prompt || "Generated artwork"}
                    className="w-full h-auto"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-all duration-200">
                      点击查看大图
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legacy: Assistant generated images (from images array - fallback) */}
          {!isUser && !hasGeneratedImages && message.images && message.images.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {message.images.map((imgUrl, idx) => (
                <div 
                  key={idx} 
                  className="rounded-xl overflow-hidden border border-white/10 hover:border-[#9ED1FF]/50 transition-all duration-200 cursor-pointer group relative"
                  onClick={() => handleImageClick(`${API_BASE}${imgUrl}`)}
                >
                  <img
                    src={`${API_BASE}${imgUrl}`}
                    alt="Generated artwork"
                    className="w-full h-auto"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-all duration-200">
                      点击查看大图
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content images (for history loaded messages) */}
          {!isUser && contentImages.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {contentImages.map((imgUrl, idx) => (
                <div 
                  key={idx} 
                  className="rounded-xl overflow-hidden border border-white/10 hover:border-[#9ED1FF]/50 transition-all duration-200 cursor-pointer group relative"
                  onClick={() => handleImageClick(imgUrl)}
                >
                  <img
                    src={imgUrl}
                    alt="Generated artwork"
                    className="w-full h-auto"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-all duration-200">
                      点击查看大图
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          prompt={lightboxImage.prompt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}