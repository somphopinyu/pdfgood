/**
 * PDFMerger - Client-side PDF manipulation wrapper using pdf-lib
 */
class PDFMerger {
  constructor() {
    this.pdfLib = window.PDFLib;
    if (!this.pdfLib) {
      console.error('PDFLib library is not loaded!');
    }
  }

  /**
   * Extract basic info (page count) from a PDF File object
   * @param {File} file 
   * @returns {Promise<{ pageCount: number }>}
   */
  async getPdfInfo(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load document with encryption fallback option if possible
      const pdfDoc = await this.pdfLib.PDFDocument.load(arrayBuffer, { 
        ignoreEncryption: true 
      });
      return {
        pageCount: pdfDoc.getPageCount()
      };
    } catch (err) {
      console.warn(`Error reading info for ${file.name}:`, err);
      // Return 0 if encrypted/corrupted file
      return { pageCount: 0, error: err.message || 'ไม่สามารถอ่านจำนวนหน้าได้' };
    }
  }

  /**
   * Merge multiple PDF File objects into a single PDF Uint8Array/Blob
   * @param {File[]} files - Array of File objects in ordered sequence
   * @param {Function} onProgress - Callback function (progressPercent: number, currentFileName: string)
   * @returns {Promise<{ blob: Blob, fileName: string }>}
   */
  async mergePDFs(files, onProgress = () => {}) {
    if (!this.pdfLib) {
      throw new Error('PDFLib library is missing.');
    }
    if (!files || files.length === 0) {
      throw new Error('กรุณาเลือกไฟล์ PDF อย่างน้อย 1 ไฟล์');
    }

    // Create a new target PDF document
    const mergedPdf = await this.pdfLib.PDFDocument.create();
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      onProgress(Math.round((i / totalFiles) * 100), file.name);

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
        throw new Error(`ไม่สามารถประมวลผลไฟล์ "${file.name}": ${err.message || 'ไฟล์อาจมีการใส่รหัสผ่านหรือเสียหาย'}`);
      }
    }

    onProgress(95, 'กำลังสร้างไฟล์ผลลัพธ์...');

    // Save the combined document to Uint8Array
    const mergedPdfBytes = await mergedPdf.save();
    onProgress(100, 'เสร็จสมบูรณ์');

    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    
    // Generate clean output filename with date/time timestamp
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g, '');
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const fileName = `PDFgood_merged_${dateStr}_${timeStr}.pdf`;

    return { blob, fileName };
  }
}

// Global instance
window.pdfMergerEngine = new PDFMerger();
