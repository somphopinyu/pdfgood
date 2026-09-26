/**
 * PDFMerger - Client-side PDF & Image manipulation wrapper using pdf-lib
 */
class PDFMerger {
  constructor() {
    this.pdfLib = window.PDFLib;
    if (!this.pdfLib) {
      console.error('PDFLib library is not loaded!');
    }
  }

  /**
   * Helper: Check if a file is an image
   * @param {File} file 
   * @returns {boolean}
   */
  isImageFile(file) {
    if (!file) return false;
    const type = file.type ? file.type.toLowerCase() : '';
    const name = file.name ? file.name.toLowerCase() : '';
    return type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|svg)$/i.test(name);
  }

  /**
   * Helper: Check if a file is a PDF
   * @param {File} file 
   * @returns {boolean}
   */
  isPdfFile(file) {
    if (!file) return false;
    const type = file.type ? file.type.toLowerCase() : '';
    const name = file.name ? file.name.toLowerCase() : '';
    return type === 'application/pdf' || name.endsWith('.pdf');
  }

  /**
   * Extract basic info from PDF or Image file
   * @param {File} file 
   * @returns {Promise<{ type: string, pageCount: number, previewUrl?: string, dimensions?: { width: number, height: number } }>}
   */
  async getFileInfo(file) {
    if (this.isImageFile(file)) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({
            type: 'image',
            pageCount: 1,
            previewUrl: url,
            dimensions: { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
          });
        };
        img.onerror = () => {
          resolve({
            type: 'image',
            pageCount: 1,
            previewUrl: url,
            dimensions: null
          });
        };
        img.src = url;
      });
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await this.pdfLib.PDFDocument.load(arrayBuffer, { 
        ignoreEncryption: true 
      });
      return {
        type: 'pdf',
        pageCount: pdfDoc.getPageCount()
      };
    } catch (err) {
      console.warn(`Error reading info for ${file.name}:`, err);
      return { type: 'pdf', pageCount: 0, error: err.message || 'ไม่สามารถอ่านจำนวนหน้าได้' };
    }
  }

  /**
   * Convert image file to PNG Uint8Array bytes using HTML5 Canvas
   * @param {File} file 
   * @returns {Promise<{ bytes: Uint8Array, width: number, height: number }>}
   */
  async imageToPngBytes(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width || 800;
          const height = img.naturalHeight || img.height || 600;
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          // Fill white background for transparent PNGs/WebPs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          URL.revokeObjectURL(url);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('ไม่สามารถแปลงรูปภาพเป็น Blob ได้'));
              return;
            }
            blob.arrayBuffer().then(buf => {
              resolve({
                bytes: new Uint8Array(buf),
                width: width,
                height: height
              });
            }).catch(reject);
          }, 'image/png');
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(new Error(`ไม่สามารถโหลดไฟล์รูปภาพ "${file.name}" ได้`));
      };

      img.src = url;
    });
  }

  /**
   * Merge multiple PDF and Image files into a single PDF Uint8Array/Blob
   * @param {Array<{ file: File, type: string }|File>} items - Array of items in ordered sequence
   * @param {Function} onProgress - Callback function (progressPercent: number, currentFileName: string)
   * @returns {Promise<{ blob: Blob, fileName: string }>}
   */
  async mergePDFs(items, onProgress = () => {}) {
    if (!this.pdfLib) {
      throw new Error('PDFLib library is missing.');
    }
    if (!items || items.length === 0) {
      throw new Error('กรุณาเลือกไฟล์ PDF หรือรูปภาพอย่างน้อย 1 ไฟล์');
    }

    const mergedPdf = await this.pdfLib.PDFDocument.create();
    const totalItems = items.length;

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];
      const file = item.file || item;
      const isImg = item.type === 'image' || this.isImageFile(file);

      onProgress(Math.round((i / totalItems) * 100), file.name);

      if (isImg) {
        // Embed Image Page
        try {
          const { bytes, width, height } = await this.imageToPngBytes(file);
          const embeddedImage = await mergedPdf.embedPng(bytes);

          // Add a page matching the image dimensions
          const page = mergedPdf.addPage([width, height]);
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: width,
            height: height
          });
        } catch (err) {
          console.error(`Failed to process image file: ${file.name}`, err);
          throw new Error(`ไม่สามารถแปลงรูปภาพ "${file.name}": ${err.message}`);
        }
      } else {
        // Embed PDF Pages
        try {
          const arrayBuffer = await file.arrayBuffer();
          const srcPdf = await this.pdfLib.PDFDocument.load(arrayBuffer, { 
            ignoreEncryption: true 
          });

          const pageIndices = srcPdf.getPageIndices();
          const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);
          
          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
          });
        } catch (err) {
          console.error(`Failed to process PDF file: ${file.name}`, err);
          throw new Error(`ไม่สามารถประมวลผลไฟล์ PDF "${file.name}": ${err.message || 'ไฟล์อาจใสี่รหัสผ่านหรือเสียหาย'}`);
        }
      }
    }

    onProgress(95, 'กำลังสร้างไฟล์ผลลัพธ์...');

    const mergedPdfBytes = await mergedPdf.save();
    onProgress(100, 'เสร็จสมบูรณ์');

    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g, '');
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const fileName = `PDFgood_merged_${dateStr}_${timeStr}.pdf`;

    return { blob, fileName };
  }
}

// Global instance
window.pdfMergerEngine = new PDFMerger();
