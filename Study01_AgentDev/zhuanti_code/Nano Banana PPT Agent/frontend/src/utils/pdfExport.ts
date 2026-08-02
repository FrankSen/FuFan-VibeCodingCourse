import jsPDF from 'jspdf';

interface SlideData {
  imageUrl: string;
  index: number;
}

export async function exportToPDF(slides: SlideData[], sessionTitle: string): Promise<void> {
  try {
    // 创建 PDF（横向，标准 16:9 比例 - 使用标准演示文稿尺寸）
    // 254mm x 142.875mm (10 inches x 5.625 inches, 标准 16:9)
    const pageWidth = 254;
    const pageHeight = 142.875;
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      
      // 除了第一页，其他页需要添加新页
      if (i > 0) {
        pdf.addPage();
      }

      try {
        // 加载图片
        const img = await loadImage(slide.imageUrl);
        
        // 直接填充整个页面（标准 PPT 图片应该已经是 16:9 比例）
        pdf.addImage(
          slide.imageUrl,
          'PNG',
          0,
          0,
          pageWidth,
          pageHeight,
          undefined,
          'FAST'
        );

        // 页码已移除 - 不添加水印
        
      } catch (imgError) {
        console.error(`Failed to load image for slide ${i}:`, imgError);
        // 添加错误页面
        pdf.setFontSize(16);
        pdf.setTextColor(200, 0, 0);
        pdf.text('图片加载失败', pageWidth / 2, pageHeight / 2, { align: 'center' });
      }
    }

    // 下载 PDF
    const fileName = `${sessionTitle || 'PPT导出'}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
    
    return Promise.resolve();
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

// 辅助函数：加载图片
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 处理跨域
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}