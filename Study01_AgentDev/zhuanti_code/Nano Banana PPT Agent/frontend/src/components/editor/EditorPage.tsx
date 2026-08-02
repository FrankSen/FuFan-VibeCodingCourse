import { useState, useEffect, useRef } from 'react';
import { Slide } from '../../types';
import { FilmStrip } from './FilmStrip';
import { VersionModal } from './VersionModal';

interface EditorPageProps {
  onBackToHome: () => void;
}

export function EditorPage({ onBackToHome }: EditorPageProps) {
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: 0,
      activeVersionId: 'dcc4c9ae',
      versions: [
        {
          id: 'dcc4c9ae',
          url: 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/2dcd5d3d-e8fa-43b6-8d7d-0fba933055b3.png',
          prompt: "Title slide: What is Deep Learning?...",
          timestamp: '10:02 AM'
        }
      ]
    },
    {
      id: 1,
      activeVersionId: '627f6804',
      versions: [
        {
          id: '627f6804',
          url: 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/3dae48b5-1e0b-44d2-b891-41e3d92c3863.png',
          prompt: "Core principles diagram...",
          timestamp: '10:05 AM'
        }
      ]
    },
    {
      id: 2,
      activeVersionId: '72ff975a',
      versions: [
        {
          id: '0b9e843f',
          url: 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/6de1f502-afa1-4bf4-84fd-db7926df3aaf.png',
          prompt: "Future applications collage...",
          timestamp: '10:08 AM'
        },
        {
          id: '72ff975a',
          url: 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/4e8bbd7f-3853-4594-82bf-3bdabd77575b.png',
          prompt: "Changed to red background",
          timestamp: '10:15 AM'
        }
      ]
    }
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'insert'>('edit');
  const [insertTargetIndex, setInsertTargetIndex] = useState(-1);

  const stageRef = useRef<HTMLDivElement>(null);
  const filmStripContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleSlideChange('prev');
      if (e.key === 'ArrowRight') handleSlideChange('next');
      if (e.key === 'Escape') setIsModalOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const getActiveVersion = (slide: Slide) => {
    return slide.versions.find(v => v.id === slide.activeVersionId) || slide.versions[0];
  };

  const handleSlideChange = (direction: 'prev' | 'next' | number) => {
    if (isAnimating) return;

    let nextIndex = currentIndex;
    if (direction === 'next' && currentIndex < slides.length - 1) {
      nextIndex++;
    } else if (direction === 'prev' && currentIndex > 0) {
      nextIndex--;
    } else if (typeof direction === 'number') {
      nextIndex = direction;
    } else {
      return;
    }

    if (nextIndex === currentIndex) return;

    const animDir = nextIndex > currentIndex ? 'next' : 'prev';
    setIsAnimating(true);
    setCurrentIndex(nextIndex);
    animateSlideTransition(slides[nextIndex], animDir);
    scrollActiveThumbnailIntoView(nextIndex);
  };

  const animateSlideTransition = (slideData: Slide, direction: 'next' | 'prev') => {
    if (!stageRef.current) return;

    const url = getActiveVersion(slideData).url;
    const newImg = document.createElement('img');
    newImg.src = url;
    newImg.className = 'slide-img';
    newImg.style.transform = direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)';
    newImg.style.opacity = '0';

    const currentImg = stageRef.current.querySelector('img');
    stageRef.current.appendChild(newImg);

    requestAnimationFrame(() => {
      newImg.style.transition = 'transform 0.5s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.4s ease';
      if (currentImg) {
        currentImg.style.transition = 'transform 0.5s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.4s ease';
      }
      newImg.style.transform = 'translateX(0)';
      newImg.style.opacity = '1';
      if (currentImg) {
        currentImg.style.transform = direction === 'next' ? 'translateX(-30%)' : 'translateX(30%)';
        currentImg.style.opacity = '0';
      }
      setTimeout(() => {
        if (currentImg) currentImg.remove();
        setIsAnimating(false);
      }, 500);
    });
  };

  const updateStageImage = (slide: Slide) => {
    if (!stageRef.current) return;
    
    const existingImgs = stageRef.current.querySelectorAll('img');
    existingImgs.forEach(img => img.remove());
    
    const url = getActiveVersion(slide).url;
    const img = document.createElement('img');
    img.src = url;
    img.className = 'slide-img';
    stageRef.current.appendChild(img);
  };

  const scrollActiveThumbnailIntoView = (index: number) => {
    setTimeout(() => {
      const thumb = document.getElementById(`thumb-${index}`);
      const container = filmStripContainerRef.current;
      if (thumb && container) {
        const center = container.clientWidth / 2;
        const target = thumb.offsetLeft + (thumb.clientWidth / 2);
        container.scrollTo({ left: target - center, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSlideReorder = (dragIndex: number, targetIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(dragIndex, 1);
    newSlides.splice(targetIndex, 0, movedSlide);

    // Adjust currentIndex to follow the active slide
    let newCurrentIndex = currentIndex;
    if (currentIndex === dragIndex) {
      newCurrentIndex = targetIndex;
    } else if (currentIndex > dragIndex && currentIndex <= targetIndex) {
      newCurrentIndex--;
    } else if (currentIndex < dragIndex && currentIndex >= targetIndex) {
      newCurrentIndex++;
    }

    setSlides(newSlides);
    setCurrentIndex(newCurrentIndex);
    updateStageImage(newSlides[newCurrentIndex]);
  };

  const handleDeleteSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      alert("至少保留一张幻灯片");
      return;
    }
    
    if (confirm("确定要删除当前页面吗？")) {
      const newSlides = slides.filter((_, idx) => idx !== currentIndex);
      const newIndex = currentIndex >= newSlides.length ? newSlides.length - 1 : currentIndex;
      setSlides(newSlides);
      setCurrentIndex(newIndex);
      updateStageImage(newSlides[newIndex]);
    }
  };

  const handleOpenVersionModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleInsertSlide = (index: number) => {
    setInsertTargetIndex(index);
    setModalMode('insert');
    setIsModalOpen(true);
  };

  const handleModalSubmit = (prompt: string, mode: 'edit' | 'insert') => {
    setIsModalOpen(false);
    setIsLoading(true);

    setTimeout(() => {
      const newVerId = 'v_new_' + Math.random().toString(36).substr(2, 5);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (mode === 'edit') {
        // Create new version for current slide
        const newSlides = [...slides];
        const currentSlide = newSlides[currentIndex];
        const currentUrl = getActiveVersion(currentSlide).url;
        
        currentSlide.versions.push({
          id: newVerId,
          url: currentUrl,
          prompt: prompt,
          timestamp: time
        });
        currentSlide.activeVersionId = newVerId;
        
        setSlides(newSlides);
        updateStageImage(currentSlide);
      } else {
        // Insert new slide
        const mockUrl = 'https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/4e8bbd7f-3853-4594-82bf-3bdabd77575b.png';
        const newSlide: Slide = {
          id: Date.now(),
          activeVersionId: newVerId,
          versions: [
            {
              id: newVerId,
              url: mockUrl,
              prompt: prompt,
              timestamp: time
            }
          ]
        };

        const newSlides = [...slides];
        newSlides.splice(insertTargetIndex, 0, newSlide);
        setSlides(newSlides);
        setCurrentIndex(insertTargetIndex);
        updateStageImage(newSlide);
      }

      setIsLoading(false);
      scrollActiveThumbnailIntoView(currentIndex);
    }, 1500);
  };

  const handleSelectVersion = (versionId: string) => {
    const newSlides = [...slides];
    const currentSlide = newSlides[currentIndex];
    
    if (currentSlide.activeVersionId === versionId) return;
    
    currentSlide.activeVersionId = versionId;
    setSlides(newSlides);
    updateStageImage(currentSlide);
  };

  const handleDeleteVersion = (versionId: string) => {
    const newSlides = [...slides];
    const currentSlide = newSlides[currentIndex];
    
    if (currentSlide.versions.length <= 1) return;
    
    const versionIndex = currentSlide.versions.findIndex(v => v.id === versionId);
    currentSlide.versions.splice(versionIndex, 1);
    
    // If deleted active version, select the last one
    if (currentSlide.activeVersionId === versionId) {
      currentSlide.activeVersionId = currentSlide.versions[currentSlide.versions.length - 1].id;
      updateStageImage(currentSlide);
    }
    
    setSlides(newSlides);
  };

  const getReferenceUrl = () => {
    if (insertTargetIndex > 0) {
      return getActiveVersion(slides[insertTargetIndex - 1]).url;
    } else if (slides.length > 0) {
      return getActiveVersion(slides[0]).url;
    }
    return '';
  };

  useEffect(() => {
    if (slides.length > 0) {
      updateStageImage(slides[currentIndex]);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col select-none bg-[#121212]">
      
      {/* Header */}
      <header className="h-14 flex-shrink-0 glass-panel flex items-center justify-between px-6 z-40 relative">
        
        <div className="flex items-center gap-4 w-1/3">
          <a 
            href="https://fufan.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white cursor-pointer hover:opacity-80 transition"
          >
            <span className="tracking-tight font-semibold">赋范空间 fufan.ai</span>
          </a>
          <button 
            onClick={onBackToHome}
            className="text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-white/10 ml-2"
            title="返回工作区"
          >
            <i className="ph ph-squares-four"></i>
          </button>
        </div>

        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <h1 className="text-sm font-medium text-white tracking-wide opacity-80">深度学习PPT制作</h1>
        </div>

        <div className="flex items-center justify-end gap-4 w-1/3">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10 transition">
            <button 
              onClick={() => handleSlideChange('prev')}
              className="hover:text-blue-400 text-gray-400 transition flex items-center"
            >
              <i className="ph ph-caret-left"></i>
            </button>
            <span className="text-xs font-mono text-gray-300 w-12 text-center">
              <span>{currentIndex + 1}</span> / <span>{slides.length}</span>
            </span>
            <button 
              onClick={() => handleSlideChange('next')}
              className="hover:text-blue-400 text-gray-400 transition flex items-center"
            >
              <i className="ph ph-caret-right"></i>
            </button>
          </div>
          <div className="h-4 w-[1px] bg-gray-700"></div>
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-lg shadow-blue-600/20 transition">
            <i className="ph ph-export"></i>
            <span>导出</span>
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800/20 to-[#0A0A0A]">
        
        <div className="relative w-full h-full flex items-center justify-center group/stage">
          
          {/* Slide Stage */}
          <div 
            ref={stageRef}
            className="slide-container shadow-2xl bg-black border border-white/5 cursor-pointer overflow-hidden transition-transform duration-500 relative"
            style={{ aspectRatio: '16/9', height: 'auto', width: '100%', maxWidth: '100%', maxHeight: '100%', margin: 'auto' }}
          >
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm transition-opacity duration-300">
                <div className="loader mb-4"></div>
                <span className="text-sm text-blue-400 font-medium animate-pulse">正在生成新页面...</span>
                <span className="text-xs text-gray-500 mt-1">AI 正在基于上下文绘制</span>
              </div>
            )}
          </div>

          {/* Right top controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/stage:opacity-100 transition-all duration-300 z-30 transform translate-y-2 group-hover/stage:translate-y-0">
            <button 
              onClick={handleOpenVersionModal}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-xl hover:bg-blue-600 hover:border-blue-500 transition"
            >
              <i className="ph ph-pencil-simple text-sm"></i>
              <span className="text-xs font-medium">编辑 & 版本选择</span>
            </button>
            <button 
              onClick={handleDeleteSlide}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-gray-400 shadow-xl hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 transition"
              title="删除此页"
            >
              <i className="ph ph-x"></i>
            </button>
          </div>

          {/* Hover navigation */}
          <button 
            onClick={() => handleSlideChange('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full text-white/50 hover:text-white hover:bg-white/5 opacity-0 group-hover/stage:opacity-100 transition duration-300 z-20"
          >
            <i className="ph ph-caret-left text-3xl"></i>
          </button>
          <button 
            onClick={() => handleSlideChange('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full text-white/50 hover:text-white hover:bg-white/5 opacity-0 group-hover/stage:opacity-100 transition duration-300 z-20"
          >
            <i className="ph ph-caret-right text-3xl"></i>
          </button>
        </div>
      </main>

      {/* FilmStrip */}
      <div ref={filmStripContainerRef}>
        <FilmStrip 
          slides={slides}
          currentIndex={currentIndex}
          onSlideClick={handleSlideChange}
          onSlideReorder={handleSlideReorder}
          onInsertSlide={handleInsertSlide}
        />
      </div>

      {/* Version Modal */}
      <VersionModal 
        isOpen={isModalOpen}
        mode={modalMode}
        slide={slides[currentIndex]}
        referenceUrl={getReferenceUrl()}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        onSelectVersion={handleSelectVersion}
        onDeleteVersion={handleDeleteVersion}
      />

    </div>
  );
}