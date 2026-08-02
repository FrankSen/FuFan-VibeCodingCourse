import { useRef } from 'react';
import { Slide } from '../../types';

interface FilmStripProps {
  slides: Slide[];
  currentIndex: number;
  onSlideClick: (index: number) => void;
  onSlideReorder: (dragIndex: number, targetIndex: number) => void;
  onInsertSlide: (index: number) => void;
}

export function FilmStrip({ slides, currentIndex, onSlideClick, onSlideReorder, onInsertSlide }: FilmStripProps) {
  const draggedIndexRef = useRef<number | null>(null);

  const getActiveVersion = (slide: Slide) => {
    return slide.versions.find(v => v.id === slide.activeVersionId) || slide.versions[0];
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.currentTarget.classList.add('film-dragging');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const items = document.querySelectorAll('.film-dragging');
    items.forEach(item => item.classList.remove('film-dragging'));

    if (draggedIndexRef.current === null || draggedIndexRef.current === targetIndex) {
      return;
    }

    onSlideReorder(draggedIndexRef.current, targetIndex);
    draggedIndexRef.current = null;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('film-dragging');
    draggedIndexRef.current = null;
  };

  const InsertDivider = ({ index }: { index: number }) => (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onInsertSlide(index);
      }}
      className="w-6 h-full flex flex-col items-center justify-center relative group/insert insert-divider cursor-pointer mx-1"
    >
      <div className="insert-line w-[3px] h-3/4 bg-gray-600 rounded-full transition-all duration-300 group-hover/insert:bg-blue-500 group-hover/insert:shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
      <div className="insert-btn absolute w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs opacity-0 transition-all duration-300 shadow-lg shadow-blue-600/50 scale-50 group-hover/insert:opacity-100 group-hover/insert:scale-100">
        <i className="ph-bold ph-plus"></i>
      </div>
    </div>
  );

  return (
    <div className="h-20 md:h-28 flex-shrink-0 bg-[#0F0F0F] border-t border-white/5 flex flex-col z-40">
      <div className="h-6 px-4 flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider">
        <span>Slides Timeline (Drag to reorder)</span>
        <div className="flex items-center gap-2">
          <i className="ph ph-squares-four hover:text-white cursor-pointer"></i>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center px-4 pb-2">
        
        {slides.map((slide, index) => (
          <div key={`slide-${index}`} className="flex items-center">
            {index > 0 && <InsertDivider index={index} />}
            
            <div
              id={`thumb-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSlideClick(index)}
              className={`relative group flex-shrink-0 cursor-pointer transition-all duration-300 transform hover:scale-105 ${index === currentIndex ? 'z-10' : 'z-0 hover:z-10'}`}
            >
              <div className={`h-12 md:h-16 aspect-video bg-gray-800 rounded-md border-2 overflow-hidden transition-all relative shadow-md pointer-events-none ${index === currentIndex ? 'film-active' : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-500'}`}>
                <img 
                  src={getActiveVersion(slide).url} 
                  className="w-full h-full object-cover"
                  alt={`Slide ${index + 1}`}
                />
              </div>
            </div>
          </div>
        ))}
        
        <InsertDivider index={slides.length} />
      </div>
    </div>
  );
}