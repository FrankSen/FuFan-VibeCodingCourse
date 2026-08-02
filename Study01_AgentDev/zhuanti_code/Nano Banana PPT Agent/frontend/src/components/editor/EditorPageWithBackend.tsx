import { useState, useEffect, useRef } from 'react';
import { Slide } from '../../types';
import { FilmStrip } from './FilmStrip';
import { SidePanel } from './SidePanel';
import { ImagePreview } from './ImagePreview';
import * as api from '../../services/api';
import { exportToPDF } from '../../utils/pdfExport';

interface EditorPageProps {
  sessionId: string;
  onBackToHome: () => void;
}

export function EditorPageWithBackend({ sessionId, onBackToHome }: EditorPageProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [sessionTitle, setSessionTitle] = useState('Loading...');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'insert'>('edit');
  const [insertTargetIndex, setInsertTargetIndex] = useState(-1);
  const [isPlanningPPT, setIsPlanningPPT] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessionData();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleSlideChange('prev');
      if (e.key === 'ArrowRight') handleSlideChange('next');
      if (e.key === 'Escape') setIsModalOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 确保在 slides 加载后更新舞台图片
  useEffect(() => {
    if (slides.length > 0 && !isLoading && stageRef.current) {
      updateStageImage(slides[currentIndex]);
    }
  }, [slides, isLoading]);

  const loadSessionData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSessionData(sessionId);
      
      setSessionTitle(data.topic);
      
      // 检查是否是新会话（无幻灯片）
      if (!data.slides || data.slides.length === 0) {
        // 需要执行 PPT 规划
        await planPPTInitial();
      } else {
        // 转换后端数据格式为前端格式
        const convertedSlides: Slide[] = data.slides.map((slide) => ({
          id: slide.index,
          activeVersionId: slide.active_version_id,
          versions: slide.versions.map((v) => ({
            id: v.id,
            url: api.getImageUrl(v.image_url),
            prompt: v.prompt,
            timestamp: new Date(v.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))
        }));
        
        setSlides(convertedSlides);
        if (convertedSlides.length > 0) {
          updateStageImage(convertedSlides[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('加载项目失败');
    } finally {
      setIsLoading(false);
    }
  };

  const planPPTInitial = async () => {
    try {
      setIsPlanningPPT(true);
      
      const prompt = localStorage.getItem('current_project_prompt') || '';
      const contextText = localStorage.getItem('current_context_text') || '';
      
      // 1. 规划 PPT
      const planResult = await api.planPPT({
        session_id: sessionId,
        topic: prompt,
        page_count: 5,
        context_text: contextText
      });
      
      setSessionTitle(planResult.session_title);
      
      // 2. 逐页生成幻灯片
      const newSlides: Slide[] = [];
      for (let i = 0; i < planResult.slides.length; i++) {
        const slidePrompt = planResult.slides[i].visual_prompt;
        
        const genResult = await api.generateSlide({
          session_id: sessionId,
          slide_index: i,
          prompt: slidePrompt,
          is_modification: false,
          is_insertion: false
        });
        
        const newSlide: Slide = {
          id: i,
          activeVersionId: genResult.version_id,
          versions: [{
            id: genResult.version_id,
            url: api.getImageUrl(genResult.image_url),
            prompt: slidePrompt,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]
        };
        
        newSlides.push(newSlide);
        setSlides([...newSlides]);
        
        if (i === 0) {
          updateStageImage(newSlide);
        }
      }
      
      setIsPlanningPPT(false);
    } catch (error) {
      console.error('Failed to plan PPT:', error);
      alert('PPT 规划失败，请检查网络和 API Key');
      setIsPlanningPPT(false);
    }
  };

  const getActiveVersion = (slide: Slide) => {
    return slide.versions.find(v => v.id === slide.activeVersionId) || slide.versions[0];
  };

  const handleSlideChange = (direction: 'prev' | 'next' | number) => {
    if (isAnimating || slides.length === 0) return;

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
    img.className = 'slide-img';
    
    // 预加载图片，加载完成后再显示
    img.style.opacity = '0';
    img.src = url;
    
    img.onload = () => {
      img.style.transition = 'opacity 0.3s ease';
      img.style.opacity = '1';
    };
    
    stageRef.current.appendChild(img);
  };

  const handleSlideReorder = async (dragIndex: number, targetIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(dragIndex, 1);
    newSlides.splice(targetIndex, 0, movedSlide);

    // Update IDs to match new order
    newSlides.forEach((slide, idx) => {
      slide.id = idx;
    });

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
    
    // Note: 后端可能需要一个重排序的 API，这里暂时只更新前端
  };

  const handleDeleteSlide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      alert("至少保留一张幻灯片");
      return;
    }
    
    if (!confirm("确定要删除当前页面吗？")) return;

    try {
      await api.deleteSlide(sessionId, currentIndex);
      
      const newSlides = slides.filter((_, idx) => idx !== currentIndex);
      // Update IDs
      newSlides.forEach((slide, idx) => {
        slide.id = idx;
      });
      
      const newIndex = currentIndex >= newSlides.length ? newSlides.length - 1 : currentIndex;
      setSlides(newSlides);
      setCurrentIndex(newIndex);
      updateStageImage(newSlides[newIndex]);
    } catch (error) {
      console.error('Failed to delete slide:', error);
      alert('删除失败');
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

  const handleModalSubmit = async (prompt: string, mode: 'edit' | 'insert') => {
    setIsModalOpen(false);
    setIsGenerating(true);

    try {
      if (mode === 'edit') {
        // Generate new version for current slide
        const currentSlide = slides[currentIndex];
        const currentVersion = getActiveVersion(currentSlide);
        
        const result = await api.generateSlide({
          session_id: sessionId,
          slide_index: currentIndex,
          prompt: prompt,
          is_modification: true,
          is_insertion: false,
          base_image_url: currentVersion.url
        });
        
        const newVersion = {
          id: result.version_id,
          url: api.getImageUrl(result.image_url),
          prompt: prompt,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const newSlides = [...slides];
        newSlides[currentIndex].versions.push(newVersion);
        newSlides[currentIndex].activeVersionId = result.version_id;
        
        setSlides(newSlides);
        updateStageImage(newSlides[currentIndex]);
        
      } else {
        // Insert new slide
        const result = await api.generateSlide({
          session_id: sessionId,
          slide_index: insertTargetIndex,
          prompt: prompt,
          is_modification: false,
          is_insertion: true
        });
        
        const newSlide: Slide = {
          id: insertTargetIndex,
          activeVersionId: result.version_id,
          versions: [{
            id: result.version_id,
            url: api.getImageUrl(result.image_url),
            prompt: prompt,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]
        };
        
        const newSlides = [...slides];
        newSlides.splice(insertTargetIndex, 0, newSlide);
        
        // Update IDs
        newSlides.forEach((slide, idx) => {
          slide.id = idx;
        });
        
        setSlides(newSlides);
        setCurrentIndex(insertTargetIndex);
        updateStageImage(newSlide);
      }
    } catch (error) {
      console.error('Failed to generate slide:', error);
      alert('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVersion = async (versionId: string) => {
    try {
      await api.setActiveVersion(sessionId, currentIndex, versionId);
      
      const newSlides = [...slides];
      newSlides[currentIndex].activeVersionId = versionId;
      setSlides(newSlides);
      updateStageImage(newSlides[currentIndex]);
    } catch (error) {
      console.error('Failed to set active version:', error);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    const currentSlide = slides[currentIndex];
    if (currentSlide.versions.length <= 1) return;

    try {
      await api.deleteVersion(sessionId, currentIndex, versionId);
      
      const newSlides = [...slides];
      const versionIndex = newSlides[currentIndex].versions.findIndex(v => v.id === versionId);
      newSlides[currentIndex].versions.splice(versionIndex, 1);
      
      if (newSlides[currentIndex].activeVersionId === versionId) {
        newSlides[currentIndex].activeVersionId = newSlides[currentIndex].versions[newSlides[currentIndex].versions.length - 1].id;
        updateStageImage(newSlides[currentIndex]);
      }
      
      setSlides(newSlides);
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('删除失败');
    }
  };

  const getReferenceUrl = () => {
    if (insertTargetIndex > 0 && slides[insertTargetIndex - 1]) {
      return getActiveVersion(slides[insertTargetIndex - 1]).url;
    } else if (slides.length > 0) {
      return getActiveVersion(slides[0]).url;
    }
    return '';
  };

  // 图片预览
  const handleStageClick = () => {
    if (!isGenerating && slides.length > 0) {
      setIsPreviewOpen(true);
    }
  };

  // PDF 导出
  const handleExportPDF = async () => {
    if (slides.length === 0 || isExporting) return;
    
    setIsExporting(true);
    try {
      const slideData = slides.map((slide, index) => ({
        imageUrl: getActiveVersion(slide).url,
        index
      }));
      
      await exportToPDF(slideData, sessionTitle);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || isPlanningPPT) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#121212]">
        <div className="loader mb-4"></div>
        <span className="text-sm text-blue-400 font-medium animate-pulse">
          {isLoading ? '加载项目中...' : '正在规划 PPT 结构...'}
        </span>
        {isPlanningPPT && (
          <span className="text-xs text-gray-500 mt-2">这可能需要几分钟时间</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
      
      {/* Side Panel */}
      {slides.length > 0 && (
        <SidePanel 
          isOpen={isModalOpen}
          mode={modalMode}
          slide={slides[currentIndex]}
          referenceUrl={getReferenceUrl()}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          onSelectVersion={handleSelectVersion}
          onDeleteVersion={handleDeleteVersion}
        />
      )}

      {/* Main Content Area - 整体压缩 */}
      <div 
        className="flex flex-col h-full transition-all duration-300 ease-out"
        style={{
          marginLeft: isModalOpen ? 'min(33.333vw, 500px)' : '0',
          width: isModalOpen ? 'calc(100vw - min(33.333vw, 500px))' : '100vw'
        }}
      >
        
        {/* Top Navigation */}
        <nav className="h-16 glass-nav flex items-center justify-between px-6 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <a 
              href="https://fufan.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-white hover:opacity-80 transition"
            >
              <span className="tracking-tight font-semibold">赋范空间 fufan.ai</span>
            </a>
            <div className="h-4 w-[1px] bg-gray-700"></div>
            <button 
              onClick={onBackToHome}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <i className="ph-bold ph-arrow-left"></i>
              <span className="text-sm">返回主页</span>
            </button>
          </div>
          <h1 className="text-lg font-semibold absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">{sessionTitle}</h1>
          
          {/* Export Button */}
          <button 
            onClick={handleExportPDF}
            disabled={isExporting || slides.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-blue-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>导出中...</span>
              </>
            ) : (
              <>
                <i className="ph-bold ph-file-pdf"></i>
                <span>导出 PDF</span>
              </>
            )}
          </button>
        </nav>

        {/* Stage Area */}
        <div className="flex-1 relative overflow-hidden">
          
          <div className="relative w-full h-full flex items-center justify-center group/stage p-8">
            
            {/* Slide Stage */}
            <div 
              ref={stageRef}
              className="slide-container shadow-2xl bg-black border border-white/5 cursor-pointer overflow-hidden transition-transform duration-500 relative"
              style={{ aspectRatio: '16/9', height: 'auto', width: '100%', maxWidth: '100%', maxHeight: '100%', margin: 'auto' }}
              onClick={handleStageClick}
            >
              {/* Loading Overlay */}
              {isGenerating && (
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
        </div>

        {/* FilmStrip - 放在主内容区域内 */}
        {slides.length > 0 && (
          <FilmStrip 
            slides={slides}
            currentIndex={currentIndex}
            onSlideClick={handleSlideChange}
            onSlideReorder={handleSlideReorder}
            onInsertSlide={handleInsertSlide}
          />
        )}
      </div>

      {/* Image Preview */}
      {slides.length > 0 && (
        <ImagePreview 
          imageUrl={getActiveVersion(slides[currentIndex]).url}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

    </div>
  );
}