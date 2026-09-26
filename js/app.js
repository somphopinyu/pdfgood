/**
 * PDFgood - Application Logic & UI Manager (PDF & Image Merger)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    files: [], // Array of { id, file, type: 'pdf'|'image', name, size, pageCount, previewUrl, dimensions, isLoadingCount }
    isProcessing: false
  };

  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const btnSelectFiles = document.getElementById('btnSelectFiles');
  const btnAddMore = document.getElementById('btnAddMore');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnMerge = document.getElementById('btnMerge');
  
  const emptyState = document.getElementById('emptyState');
  const fileListContainer = document.getElementById('fileListContainer');
  const fileList = document.getElementById('fileList');
  
  const totalFilesSummary = document.getElementById('totalFilesSummary');
  const totalPagesSummary = document.getElementById('totalPagesSummary');
  
  const progressOverlay = document.getElementById('progressOverlay');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatus = document.getElementById('progressStatus');
  
  const toastContainer = document.getElementById('toastContainer');
  const pwaInstallBanner = document.getElementById('pwaInstallBanner');
  const btnInstallPwa = document.getElementById('btnInstallPwa');
  const btnInstallPwaBanner = document.getElementById('btnInstallPwaBanner');

  let sortableInstance = null;
  let deferredPwaPrompt = null;

  // Initialize SortableJS
  if (fileList && typeof Sortable !== 'undefined') {
    sortableInstance = new Sortable(fileList, {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: () => {
        syncStateFromDOM();
      }
    });
  }

  // --- Event Listeners ---

  if (btnSelectFiles) btnSelectFiles.addEventListener('click', () => fileInput.click());
  if (btnAddMore) btnAddMore.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  // Drag & Drop Handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFilesAdded(Array.from(dt.files));
    }
  });

  // Clear All Button
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      if (state.files.length === 0) return;
      if (confirm('คุณต้องการล้างรายการไฟล์ทั้งหมดใช่หรือไม่?')) {
        state.files.forEach(item => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        state.files = [];
        renderFileList();
        showToast('ล้างรายการไฟล์เรียบร้อยแล้ว', 'info');
      }
    });
  }

  // Merge PDF Button
  if (btnMerge) {
    btnMerge.addEventListener('click', () => {
      executeMerge();
    });
  }

  // --- Core Application Functions ---

  /**
   * Process newly added File objects (PDF and Images)
   */
  async function handleFilesAdded(incomingFiles) {
    const validFiles = incomingFiles.filter(file => {
      const isPdf = window.pdfMergerEngine.isPdfFile(file);
      const isImg = window.pdfMergerEngine.isImageFile(file);
      if (!isPdf && !isImg) {
        showToast(`ข้ามไฟล์ "${file.name}" เนื่องจากไม่รองรับ (รองรับเฉพาะ PDF และ รูปภาพ)`, 'warning');
      }
      return isPdf || isImg;
    });

    if (validFiles.length === 0) return;

    const newItems = validFiles.map(file => {
      const isImg = window.pdfMergerEngine.isImageFile(file);
      return {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        file: file,
        type: isImg ? 'image' : 'pdf',
        name: file.name,
        size: formatFileSize(file.size),
        pageCount: isImg ? 1 : null,
        previewUrl: isImg ? URL.createObjectURL(file) : null,
        dimensions: null,
        isLoadingCount: true
      };
    });

    state.files.push(...newItems);
    renderFileList();

    showToast(`เพิ่มไฟล์จำนวน ${newItems.length} ไฟล์แล้ว`, 'success');

    // Asynchronously fetch file info / page count / dimension info
    for (const item of newItems) {
      try {
        const info = await window.pdfMergerEngine.getFileInfo(item.file);
        item.pageCount = info.pageCount;
        if (info.type === 'image') {
          if (info.previewUrl && !item.previewUrl) item.previewUrl = info.previewUrl;
          if (info.dimensions) item.dimensions = info.dimensions;
        }
      } catch (err) {
        if (item.type === 'pdf') item.pageCount = 0;
      } finally {
        item.isLoadingCount = false;
        updateItemUI(item.id);
        updateSummary();
      }
    }
  }

  /**
   * Sync JavaScript state array order with current DOM elements order after drag-and-drop
   */
  function syncStateFromDOM() {
    const domIDs = Array.from(fileList.children).map(el => el.dataset.id);
    const reorderedFiles = [];
    
    domIDs.forEach(id => {
      const found = state.files.find(f => f.id === id);
      if (found) reorderedFiles.push(found);
    });

    state.files = reorderedFiles;
    updateSummary();
  }

  /**
   * Render the entire file list in DOM
   */
  function renderFileList() {
    if (state.files.length === 0) {
      emptyState.classList.remove('hidden');
      fileListContainer.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      fileListContainer.classList.remove('hidden');
    }

    fileList.innerHTML = '';

    state.files.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'file-item bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 group';
      li.dataset.id = item.id;

      const isImg = item.type === 'image';

      li.innerHTML = `
        <!-- Drag Handle & Index -->
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div class="drag-handle text-slate-400 hover:text-slate-600 p-1 rounded cursor-grab active:cursor-grabbing">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <span class="text-xs font-bold text-slate-400 w-5 text-center">${index + 1}</span>
        </div>

        <!-- File Info & Thumbnail -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          ${renderItemIconOrThumbnail(item)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h4 class="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[320px]" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h4>
              <span class="px-1.5 py-0.2 text-[10px] font-bold rounded ${isImg ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}">
                ${isImg ? 'IMAGE' : 'PDF'}
              </span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>${item.size}</span>
              <span class="text-slate-300">•</span>
              <span id="pageBadge_${item.id}" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.isLoadingCount ? 'bg-slate-100 text-slate-500' : (isImg ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}">
                ${renderPageBadgeContent(item)}
              </span>
              ${item.dimensions ? `<span class="text-slate-400 text-[11px]">(${item.dimensions.width}x${item.dimensions.height} px)</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Action Buttons (Move Up, Move Down, Delete) -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button type="button" class="btn-move-up p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="เลื่อนขึ้น">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button type="button" class="btn-move-down p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="เลื่อนลง">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button type="button" class="btn-remove p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1" title="ลบไฟล์">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;

      li.querySelector('.btn-move-up').addEventListener('click', () => moveItem(index, -1));
      li.querySelector('.btn-move-down').addEventListener('click', () => moveItem(index, 1));
      li.querySelector('.btn-remove').addEventListener('click', () => removeItem(item.id));

      fileList.appendChild(li);
    });

    updateSummary();
  }

  function renderItemIconOrThumbnail(item) {
    if (item.type === 'image' && item.previewUrl) {
      return `
        <div class="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 relative group">
          <img src="${item.previewUrl}" alt="preview" class="w-full h-full object-cover">
        </div>
      `;
    }

    return `
      <div class="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      </div>
    `;
  }

  function renderPageBadgeContent(item) {
    if (item.isLoadingCount) {
      return `<svg class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-slate-500 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> อ่านข้อมูล...`;
    }
    if (item.type === 'image') {
      return `ภาพ 1 หน้า`;
    }
    if (item.pageCount > 0) {
      return `${item.pageCount} หน้า`;
    }
    return `ไม่ระบุหน้า`;
  }

  function updateItemUI(id) {
    const item = state.files.find(f => f.id === id);
    if (!item) return;
    const badge = document.getElementById(`pageBadge_${id}`);
    if (badge) {
      badge.innerHTML = renderPageBadgeContent(item);
    }
  }

  function moveItem(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.files.length) return;
    const temp = state.files[index];
    state.files[index] = state.files[newIndex];
    state.files[newIndex] = temp;
    renderFileList();
  }

  function removeItem(id) {
    const target = state.files.find(f => f.id === id);
    if (target && target.previewUrl) URL.revokeObjectURL(target.previewUrl);
    state.files = state.files.filter(f => f.id !== id);
    renderFileList();
    showToast('ลบไฟล์ออกจากรายการแล้ว', 'info');
  }

  function updateSummary() {
    const count = state.files.length;
    let pdfCount = 0;
    let imgCount = 0;
    let totalPages = 0;
    let hasLoading = false;

    state.files.forEach(f => {
      if (f.isLoadingCount) hasLoading = true;
      if (f.type === 'image') {
        imgCount++;
        totalPages += 1;
      } else {
        pdfCount++;
        if (f.pageCount) totalPages += f.pageCount;
      }
    });

    if (totalFilesSummary) {
      let detailParts = [];
      if (pdfCount > 0) detailParts.push(`${pdfCount} PDF`);
      if (imgCount > 0) detailParts.push(`${imgCount} ภาพ`);
      const detailStr = detailParts.length > 0 ? ` (${detailParts.join(', ')})` : '';
      totalFilesSummary.textContent = `${count} ไฟล์${detailStr}`;
    }

    if (totalPagesSummary) {
      totalPagesSummary.textContent = hasLoading ? `(กำลังคำนวณหน้า...)` : `(รวม ${totalPages} หน้า)`;
    }

    if (btnMerge) {
      if (count >= 1) {
        btnMerge.disabled = false;
        btnMerge.classList.remove('opacity-50', 'cursor-not-allowed');
        if (count >= 2) btnMerge.classList.add('pulse-primary');
      } else {
        btnMerge.disabled = true;
        btnMerge.classList.add('opacity-50', 'cursor-not-allowed');
        btnMerge.classList.remove('pulse-primary');
      }
    }
  }

  /**
   * Execute PDF Merge Operation
   */
  async function executeMerge() {
    if (state.files.length === 0) {
      showToast('กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพก่อนดำเนินการ', 'warning');
      return;
    }

    state.isProcessing = true;
    showProgressOverlay(0, 'เริ่มแปลงและรวมไฟล์...');

    try {
      const result = await window.pdfMergerEngine.mergePDFs(state.files, (percent, statusText) => {
        updateProgress(percent, statusText);
      });

      // Auto Download trigger
      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 10000);

      hideProgressOverlay();
      showToast('แปลงและรวมไฟล์ PDF เรียบร้อยแล้ว!', 'success');

    } catch (error) {
      console.error('Merge Error:', error);
      hideProgressOverlay();
      showToast(error.message || 'เกิดข้อผิดพลาดในการรวมไฟล์', 'error');
    } finally {
      state.isProcessing = false;
    }
  }

  // --- UI Helpers ---

  function showProgressOverlay(initialPercent, statusText) {
    if (progressOverlay) {
      progressOverlay.classList.remove('hidden');
      progressOverlay.classList.add('flex');
    }
    updateProgress(initialPercent, statusText);
  }

  function updateProgress(percent, statusText) {
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressStatus) progressStatus.textContent = statusText || '';
  }

  function hideProgressOverlay() {
    if (progressOverlay) {
      progressOverlay.classList.add('hidden');
      progressOverlay.classList.remove('flex');
    }
  }

  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-red-600 text-white',
      warning: 'bg-amber-500 text-white',
      info: 'bg-slate-800 text-white'
    };

    toast.className = `px-4 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- PWA Service Worker & Installation ---

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[SW] Registered scope:', reg.scope))
        .catch(err => console.warn('[SW] Reg failed:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (pwaInstallBanner) pwaInstallBanner.classList.remove('hidden');
    if (btnInstallPwa) btnInstallPwa.classList.remove('hidden');
  });

  const handleInstallClick = async () => {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    deferredPwaPrompt = null;
    if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
    if (btnInstallPwa) btnInstallPwa.classList.add('hidden');
  };

  if (btnInstallPwa) btnInstallPwa.addEventListener('click', handleInstallClick);
  if (btnInstallPwaBanner) btnInstallPwaBanner.addEventListener('click', handleInstallClick);
});
