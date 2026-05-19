import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ALBUM_TEMPLATES, AlbumPage, AlbumTemplate, LayoutOrientation, PlacedImage } from './templates';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  Plus, Minus, Layout, Palette, Settings, Type, Shuffle, Maximize2, 
  Trash2, X, Download, LayoutTemplate, Square, ChevronLeft,
  Undo2, Redo2, ZoomIn, ZoomOut, Upload, Wand2, RotateCw, ImagePlus, UploadCloud, CropIcon, ImageIcon, SlidersHorizontal, MousePointerClick, Printer,
  ChevronsUp, ChevronsDown, ClipboardPaste, Copy, CheckCheck, Layers
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { ImageItem, CropImageModal } from '../../App';

interface AlbumDesignerProps {
  onClose: () => void;
  initialImages: ImageItem[];
}

const PAGE_ASPECT_RATIO = 1.414;

interface FrameProps {
  slot: any;
  placedImg?: PlacedImage;
  gutter: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdatePlacement?: (updates: Partial<PlacedImage>) => void;
  onEmptyClick?: () => void;
  onCrop?: () => void;
  onTextUpdate: (text: string) => void;
  onRemove: () => void;
  [key: string]: any;
}

const getFilterStyle = (filters?: { brightness: number, contrast: number, bw: boolean }) => {
  if (!filters) return undefined;
  let filterString = '';
  if (filters.brightness !== undefined && filters.brightness !== 0) {
    filterString += `brightness(${1 + filters.brightness / 100}) `;
  }
  if (filters.contrast !== undefined && filters.contrast !== 0) {
    filterString += `contrast(${1 + filters.contrast / 100}) `;
  }
  if (filters.bw) {
    filterString += `grayscale(1) `;
  }
  return filterString.trim() || undefined;
}

const getImageTransform = (placedImg?: PlacedImage) => {
  if (!placedImg) return '';
  let transform = '';
  if (placedImg.rotation) transform += `rotate(${placedImg.rotation}deg) `;
  if (placedImg.flipX) transform += `scaleX(-1) `;
  if (placedImg.flipY) transform += `scaleY(-1) `;
  return transform || 'none';
}

const DraggableFrame = ({ slot, placedImg, gutter, isSelected, onSelect, onUpdatePlacement, onEmptyClick, onCrop, onTextUpdate, onRemove }: FrameProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `drag-${slot.id}`,
    data: { slotId: slot.id, placedImg }
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `drop-${slot.id}`,
    data: { slotId: slot.id }
  });

  const [isEditingText, setIsEditingText] = useState(false);
  const [textVal, setTextVal] = useState(placedImg?.text || '');

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};

  return (
    <div 
      ref={setDropRef}
      className={`absolute transition-all duration-200 ${isOver ? 'ring-4 ring-blue-500 z-50' : ''}`}
      style={{
        left: `${slot.x * 100}%`,
        top: `${slot.y * 100}%`,
        width: `${slot.w * 100}%`,
        height: `${slot.h * 100}%`,
        padding: `${gutter}px`,
        zIndex: isSelected ? 100 : (slot.zIndex || 10)
      }}
      onPointerDown={(e) => {
        // Selection is now handled in the inner div to avoid dnd-kit sensor interference
      }}
      onClick={(e) => {
        // Click on gutter - naturally ignore
      }}
    >
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          if (!placedImg && onEmptyClick) {
            onEmptyClick();
          } else if (placedImg && onSelect) {
            onSelect();
          }
        }}
        className={`w-full h-full relative group rounded overflow-hidden cursor-move border-2 transition-all duration-300 flex flex-col items-center justify-center ${isSelected ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/30'}`}
      >
        {placedImg ? (
          <>
            <img 
              src={placedImg.url} 
              className="absolute inset-0 w-full h-full object-cover transition-transform pointer-events-none" 
              style={{ 
                filter: getFilterStyle(placedImg.filters),
                transform: getImageTransform(placedImg)
              }} 
              alt="" 
            />
            {placedImg.overlayUrl && (
              <img src={placedImg.overlayUrl} className="absolute inset-0 w-full h-full pointer-events-none object-cover" style={{ opacity: placedImg.overlayOpacity ?? 1 }} alt="" />
            )}
            
            {/* Minimal selection indicator */}
            {isSelected && (
              <div className="absolute inset-0 border-4 border-blue-500/30 pointer-events-none z-20"></div>
            )}


            {placedImg.text && !isEditingText && (
              <div 
                className="absolute bottom-2 left-2 right-2 bg-black/50 text-white dark:text-slate-100 text-xs p-1.5 text-center rounded pointer-events-none"
              >
                {placedImg.text}
              </div>
            )}
          </>
        ) : (
          <div 
            className={`flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
          >
            <Plus className="w-6 h-6 mb-1 opacity-60 text-blue-500" />
            <span className="text-[10px] uppercase font-bold opacity-60 text-blue-500">Add Photo</span>
          </div>
        )}
      </div>

      {isEditingText && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full">
            <input 
              autoFocus
              className="w-full px-2 py-1 text-sm rounded border-none outline-none mb-2"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              placeholder="Caption..."
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex justify-end gap-2">
              <button 
                onPointerDown={(e) => { e.stopPropagation(); setIsEditingText(false); }}
                className="px-2 py-1 bg-gray-500 text-white dark:text-slate-100 rounded text-xs"
              >
                Cancel
              </button>
              <button 
                onPointerDown={(e) => { e.stopPropagation(); onTextUpdate(textVal); setIsEditingText(false); }}
                className="px-2 py-1 bg-blue-500 text-white dark:text-slate-100 rounded text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AlbumDesigner: React.FC<AlbumDesignerProps> = ({ onClose, initialImages }) => {
  const [orientation, setOrientation] = useState<LayoutOrientation>('landscape');
  const [albumSize, setAlbumSize] = useState<'A3' | 'A4'>('A3');
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [history, setHistory] = useState<AlbumPage[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.7);
  const isNavigatingHistory = useRef(false);

  // Sync history when pages change
  useEffect(() => {
    if (isNavigatingHistory.current) {
      isNavigatingHistory.current = false;
      return;
    }
    
    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      // Avoid adding duplicate states to history
      if (JSON.stringify(newHistory[newHistory.length - 1]) === JSON.stringify(pages)) {
        return prev;
      }
      newHistory.push(pages);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [pages]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      isNavigatingHistory.current = true;
      setHistoryIndex(newIndex);
      setPages(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      isNavigatingHistory.current = true;
      setHistoryIndex(newIndex);
      setPages(history[newIndex]);
    }
  };
  
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [gutter, setGutter] = useState<number>(8);
  const [showBleed, setShowBleed] = useState<boolean>(true);

  // Auto-layout on mount if images are provided and no pages exist
  useEffect(() => {
    if (pages.length === 0 && initialImages.length > 0) {
      applyAutoLayout(initialImages);
    } else if (pages.length === 0) {
      addNewPage();
    }
  }, []);

  const addNewPage = (layoutId?: string) => {
    const tmpls = ALBUM_TEMPLATES.filter(t => t.orientation === orientation);
    const tmpl = tmpls.find(t => t.id === layoutId) || tmpls[0];
    const newPage: AlbumPage = {
      id: crypto.randomUUID(),
      templateId: tmpl.id,
      bgColor,
      placements: {} as any
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
    return newPage;
  };

  const applyAutoLayout = (images: ImageItem[]) => {
    const tmpls = ALBUM_TEMPLATES.filter(t => t.orientation === orientation);
    let currentImageIndex = 0;
    const newPages: AlbumPage[] = [];
    
    while (currentImageIndex < images.length) {
      const remaining = images.length - currentImageIndex;
      let possibleTmpls = tmpls.filter(t => t.slots.length <= remaining);
      if (possibleTmpls.length === 0) possibleTmpls = tmpls;
      const tmpl = possibleTmpls[Math.floor(Math.random() * possibleTmpls.length)];
      
      const page: AlbumPage = {
        id: crypto.randomUUID(),
        templateId: tmpl.id,
        bgColor,
        placements: {}
      };

      for (const slot of tmpl.slots) {
        if (currentImageIndex < images.length) {
          const img = images[currentImageIndex];
          page.placements[slot.id] = { id: crypto.randomUUID(), url: img.url, sourceImageId: img.id };
          currentImageIndex++;
        }
      }
      newPages.push(page);
    }
    setPages(newPages);
    if (newPages.length > 0) setActivePageId(newPages[0].id);
  };

  const shuffleCurrentPage = () => {
    if (!activePageId) return;
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      const currentPlacements = Object.values(p.placements);
      if (currentPlacements.length === 0) return p;
      
      const tmpls = ALBUM_TEMPLATES.filter(t => t.orientation === orientation && t.slots.length >= currentPlacements.length);
      const tmpl = tmpls.length > 0 ? tmpls[Math.floor(Math.random() * tmpls.length)] : ALBUM_TEMPLATES.filter(t => t.orientation === orientation)[0];
      
      const newPlacements: any = {};
      currentPlacements.forEach((cp, i) => {
        if (tmpl.slots[i]) {
          newPlacements[tmpl.slots[i].id] = cp;
        }
      });
      return { ...p, templateId: tmpl.id, placements: newPlacements };
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !activePageId) return;

    const fromSlotId = active.data.current?.slotId;
    const toSlotId = over.data.current?.slotId;
    
    if (fromSlotId && toSlotId && fromSlotId !== toSlotId) {
      setPages(prev => prev.map(p => {
        if (p.id !== activePageId) return p;
        const newPlacements = { ...p.placements };
        const fromImg = newPlacements[fromSlotId];
        const toImg = newPlacements[toSlotId];
        
        if (fromImg) {
          newPlacements[toSlotId] = fromImg;
        } else {
          delete newPlacements[toSlotId];
        }
        
        if (toImg) {
          newPlacements[fromSlotId] = toImg;
        } else {
          delete newPlacements[fromSlotId];
        }
        return { ...p, placements: newPlacements };
      }));
    }
  };

  const activePage = pages.find(p => p.id === activePageId);
  const activeTemplate = activePage ? ALBUM_TEMPLATES.find(t => t.id === activePage.templateId) : null;

  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfQuality, setPdfQuality] = useState<number>(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(176);
  const [isResizing, setIsResizing] = useState(false);
  const [copiedPlacementSettings, setCopiedPlacementSettings] = useState<any>(null);

  const handleShiftPlacement = (direction: 'first' | 'last') => {
    if (!selectedPlacementId || !activePage) return;
    
    // Gather all placements across all pages in order
    let allPlacements: { image: any, pageId: string, slotId: string }[] = [];
    pages.forEach(p => {
      const tmpl = ALBUM_TEMPLATES.find(t => t.id === p.templateId);
      if (tmpl) {
        tmpl.slots.forEach(slot => {
          const placement = p.placements[slot.id];
          if (placement) {
            allPlacements.push({ image: placement, pageId: p.id, slotId: slot.id });
          }
        });
      }
    });

    const selectedIdx = allPlacements.findIndex(ap => ap.pageId === activePage.id && ap.slotId === selectedPlacementId);
    if (selectedIdx === -1) return;

    const targetItem = allPlacements[selectedIdx];
    allPlacements.splice(selectedIdx, 1); // remove from current position

    if (direction === 'first') {
      allPlacements.unshift(targetItem); // insert at start
    } else {
      allPlacements.push(targetItem); // insert at end
    }

    // Now re-assign to templates
    setPages(prev => {
      let placementIdx = 0;
      return prev.map(p => {
        const tmpl = ALBUM_TEMPLATES.find(t => t.id === p.templateId);
        const newPlacements: { [slotId: string]: any } = {};
        if (tmpl) {
          tmpl.slots.forEach(slot => {
            if (placementIdx < allPlacements.length) {
              const ap = allPlacements[placementIdx];
              newPlacements[slot.id] = ap.image;
              placementIdx++;
            }
          });
        }
        return { ...p, placements: newPlacements };
      });
    });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 60 && newHeight <= 450) {
        setBottomPanelHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const exportPdf = async () => {
    if (!contentRef.current || pages.length === 0) return;
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      const isA3 = albumSize === 'A3';
      const pdfW = isA3 ? 297 : 210;
      const pdfH = isA3 ? 420 : 297;
      
      const format = orientation === 'portrait' ? ([pdfW, pdfH] as [number, number]) : ([pdfH, pdfW] as [number, number]);
      const pdf = new jsPDF({
        orientation: orientation === 'portrait' ? 'p' : 'l',
        unit: 'mm',
        format
      });

      const pageNodes = contentRef.current.querySelectorAll('.album-page-export');
      if (pageNodes.length === 0) {
        throw new Error("No pages found for export");
      }

      for (let i = 0; i < pageNodes.length; i++) {
        const node = pageNodes[i] as HTMLElement;
        const clonedNode = node.cloneNode(true) as HTMLElement;
        
        Object.assign(clonedNode.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          zIndex: '-9999',
          transform: 'none',
          width: orientation === 'portrait' ? '1200px' : '1697px',
          height: orientation === 'portrait' ? '1697px' : '1200px',
          backgroundColor: node.getAttribute('data-bg-color') || '#ffffff',
          visibility: 'visible',
          opacity: '1'
        });

        document.body.appendChild(clonedNode);
        
        try {
          const scale = pdfQuality / 96;
          const canvas = await html2canvas(clonedNode, {
            scale: scale,
            useCORS: true,
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (i > 0) pdf.addPage(format, orientation === 'portrait' ? 'p' : 'l');
          const w = format[0];
          const h = format[1];
          pdf.addImage(imgData, 'JPEG', 0, 0, w, h, undefined, 'FAST');
        } finally {
          document.body.removeChild(clonedNode);
        }
      }
      
      pdf.save(`PhotoAlbum_${albumSize}.pdf`);
    } catch(e: any) {
      console.error(e);
      alert('Error exporting PDF: ' + (e.message || e));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!contentRef.current || pages.length === 0) return;
    setIsPrinting(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      const pageNodes = contentRef.current.querySelectorAll('.album-page-export');
      const dataUrls: string[] = [];
      
      for (let i = 0; i < pageNodes.length; i++) {
        const node = pageNodes[i] as HTMLElement;
        const clonedNode = node.cloneNode(true) as HTMLElement;
        
        Object.assign(clonedNode.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          zIndex: '-9999',
          transform: 'none',
          width: orientation === 'portrait' ? '1200px' : '1697px',
          height: orientation === 'portrait' ? '1697px' : '1200px',
          backgroundColor: node.getAttribute('data-bg-color') || '#ffffff',
          visibility: 'visible',
          opacity: '1'
        });

        document.body.appendChild(clonedNode);
        
        try {
          const canvas = await html2canvas(clonedNode, {
            scale: 2,
            useCORS: true,
            logging: false
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          dataUrls.push(imgData);
        } finally {
          document.body.removeChild(clonedNode);
        }
      }

      const existingIframe = document.getElementById('printIframe');
      if (existingIframe) {
        document.body.removeChild(existingIframe);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'printIframe';
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not create print iframe");

      doc.write(`
          <html>
              <head>
                  <title>Print Album</title>
                  <style>
                      @page { margin: 0; }
                      body { margin: 0; padding: 0; }
                      img { width: 100%; max-height: 100vh; object-fit: contain; page-break-after: always; display: block; margin: 0; padding: 0; }
                  </style>
              </head>
              <body>
                  ${dataUrls.map(url => `<img src="${url}" />`).join('')}
              </body>
          </html>
      `);
      doc.close();

      setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
      }, 500);

    } catch(e: any) {
      console.error(e);
      alert('Error printing: ' + (e.message || e));
    } finally {
      setIsPrinting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingUploadRef = useRef(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const targetSlotForUploadRef = useRef<{pageId: string, slotId: string} | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    if (isProcessingUploadRef.current) return;
    isProcessingUploadRef.current = true;
    
    // Capture slot synchronously before any await
    const currentTargetSlot = targetSlotForUploadRef.current;
    
    try {
      const validFiles = files.filter(f => f.type.startsWith('image/'));
      if (validFiles.length === 0) {
        isProcessingUploadRef.current = false;
        targetSlotForUploadRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const newImages = await Promise.all(validFiles.map(file => {
        return new Promise<ImageItem>((resolve) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => resolve({
            id: crypto.randomUUID(), url, originalUrl: url, rotation: 0, objectFit: 'cover', orientation: img.width > img.height ? 'landscape' : 'portrait'
          });
          img.onerror = () => resolve({
            id: crypto.randomUUID(), url, originalUrl: url, rotation: 0, objectFit: 'cover', orientation: 'portrait'
          });
          img.src = url;
          // Security timeout
          setTimeout(() => resolve({
            id: crypto.randomUUID(), url, originalUrl: url, rotation: 0, objectFit: 'cover', orientation: 'portrait'
          }), 5000);
        });
      }));

      // Auto-layout these new images into empty slots or new pages
      const tmpls = ALBUM_TEMPLATES.filter(t => t.orientation === orientation);
      let currentImageIndex = 0;
      
      targetSlotForUploadRef.current = null;

      setPages(prevPages => {
        const updatedPages = [...prevPages];

        // Target placement if explicitly requested
        if (currentTargetSlot) {
          const pageIdx = updatedPages.findIndex(p => p.id === currentTargetSlot.pageId);
          if (pageIdx !== -1 && currentImageIndex < newImages.length) {
            const page = { ...updatedPages[pageIdx], placements: { ...updatedPages[pageIdx].placements } };
            const img = newImages[currentImageIndex];
            page.placements[currentTargetSlot.slotId] = { id: crypto.randomUUID(), url: img.url, sourceImageId: img.id };
            updatedPages[pageIdx] = page;
            currentImageIndex++;
          }
        }

        // Fill existing empty slots first
        for (let i = 0; i < updatedPages.length; i++) {
          const tmpl = tmpls.find(t => t.id === updatedPages[i].templateId);
          if (!tmpl) continue;
          
          let pageUpdated = false;
          let newPlacements = { ...updatedPages[i].placements };

          for (const slot of tmpl.slots) {
            if (!newPlacements[slot.id] && currentImageIndex < newImages.length) {
              const img = newImages[currentImageIndex];
              newPlacements[slot.id] = { id: crypto.randomUUID(), url: img.url, sourceImageId: img.id };
              currentImageIndex++;
              pageUpdated = true;
            }
          }
          
          if (pageUpdated) {
            updatedPages[i] = { ...updatedPages[i], placements: newPlacements };
          }
        }
        
        // Create new pages if we still have images
        while (currentImageIndex < newImages.length) {
          const remaining = newImages.length - currentImageIndex;
          let possibleTmpls = tmpls.filter(t => t.slots.length <= remaining);
          if (possibleTmpls.length === 0) possibleTmpls = tmpls;
          const tmpl = possibleTmpls[Math.floor(Math.random() * possibleTmpls.length)];
          
          const newPage: AlbumPage = {
            id: crypto.randomUUID(),
            templateId: tmpl.id,
            bgColor,
            placements: {}
          };

          for (const slot of tmpl.slots) {
            if (currentImageIndex < newImages.length) {
              const img = newImages[currentImageIndex];
              newPage.placements[slot.id] = { id: crypto.randomUUID(), url: img.url, sourceImageId: img.id };
              currentImageIndex++;
            }
          }
          updatedPages.push(newPage);
        }
        
        return updatedPages;
      });
    } finally {
      isProcessingUploadRef.current = false;
      targetSlotForUploadRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsDraggingFile(false);
    }
  }, [orientation, bgColor, activePageId]);

  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [cropPlacementId, setCropPlacementId] = useState<string | null>(null);
  
  // Enhancement state
  const [enhancements, setEnhancements] = useState({
    brightness: 0,
    contrast: 0,
    bwScan: 0,
    removeBgVal: 0,
    transparentBg: false
  });

  // Sync enhancements when photo is selected
  useEffect(() => {
    if (selectedPlacementId && activePage) {
      const placement = activePage.placements[selectedPlacementId];
      if (placement && placement.filters) {
        setEnhancements(prev => ({
          ...prev,
          brightness: placement.filters.brightness || 0,
          contrast: placement.filters.contrast || 0,
          bwScan: placement.filters.bw ? 100 : 0
        }));
      } else {
        setEnhancements({
          brightness: 0,
          contrast: 0,
          bwScan: 0,
          removeBgVal: 0,
          transparentBg: false
        });
      }
    }
  }, [selectedPlacementId, activePageId]);

  const applyEnhancements = (toAll: boolean, overrideEnhancements?: any) => {
    const currentEnhancements = overrideEnhancements || enhancements;
    setPages(prevPages => prevPages.map(page => {
      let changed = false;
      const newPlacements = { ...page.placements };
      
      for (const slotId in newPlacements) {
        if (toAll || (selectedPlacementId === slotId && activePageId === page.id)) {
          newPlacements[slotId] = {
            ...newPlacements[slotId],
            filters: {
              brightness: currentEnhancements.brightness,
              contrast: currentEnhancements.contrast,
              bw: currentEnhancements.bwScan > 0
            }
          };
          changed = true;
        }
      }
      return changed ? { ...page, placements: newPlacements } : page;
    }));
  };

  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const handleRemoveBgAI = async () => {
    if (!selectedPlacementId || !activePageId) return;
    const placement = activePage?.placements[selectedPlacementId];
    if (!placement) return;
    
    setIsRemovingBg(true);
    try {
      const srcUrl = placement.originalUrl || placement.url;
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(srcUrl, { 
        model: "isnet_quint8",
        progress: () => {} 
      });
      const bgRemovedUrl = URL.createObjectURL(blob);
      updateSelectedPlacement({ url: bgRemovedUrl, originalUrl: srcUrl });
    } catch (err) {
      console.error("Failed to remove background:", err);
      alert("Failed to remove background. Please try again.");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleEnhancementChange = (key: string, value: any) => {
    const newEnhancements = { ...enhancements, [key]: value };
    setEnhancements(newEnhancements);
    if (selectedPlacementId) {
      applyEnhancements(false, newEnhancements);
    }
  };

  const updateSelectedPlacement = (updates: Partial<PlacedImage>) => {
    if (!selectedPlacementId || !activePageId) return;
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      return {
        ...p,
        placements: {
          ...p.placements,
          [selectedPlacementId]: { ...p.placements[selectedPlacementId], ...updates }
        }
      };
    }));
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-gray-100 dark:bg-slate-900 flex flex-col pt-14"
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDraggingFile(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files?.length > 0) {
          handleFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      {/* Hidden file input for adding more photos */}
      <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => {
        if (e.target.files) handleFiles(Array.from(e.target.files));
      }} />

      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-[200] bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 border-dashed flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
            <Plus className="w-16 h-16 text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold dark:text-slate-100">Drop photos here</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-2">Images will be automatically added to the album</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#314158] border-b border-white/10 flex items-center justify-between px-4 z-20 shadow-xl text-white">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="group flex items-center gap-1.5 text-slate-100 hover:text-white dark:text-slate-100 font-bold text-sm transition bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <ChevronLeft className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" /> Back to Tools
          </button>
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
          <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 tracking-tight drop-shadow-sm">
            Smart Photo Album
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
            <button 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-slate-200 hover:bg-white/10 disabled:opacity-20 rounded-lg transition hover:text-white dark:text-slate-100 shadow-sm"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-slate-200 hover:bg-white/10 disabled:opacity-20 rounded-lg transition hover:text-white dark:text-slate-100 shadow-sm"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            
            <div className="h-5 w-px bg-white/10 mx-2"></div>
            
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-2 text-slate-200 hover:bg-white/10 rounded-lg transition hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-12 text-center text-slate-100">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="p-2 text-slate-200 hover:bg-white/10 rounded-lg transition hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-black/20 rounded-xl p-1 border border-white/10 backdrop-blur-sm shadow-inner">
            <button 
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${orientation === 'landscape' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white dark:text-slate-100 shadow-md shadow-violet-500/30 scale-105' : 'text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10'}`}
              onClick={() => setOrientation('landscape')}
            >
              Landscape
            </button>
            <button 
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${orientation === 'portrait' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white dark:text-slate-100 shadow-md shadow-violet-500/30 scale-105' : 'text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10'}`}
              onClick={() => setOrientation('portrait')}
            >
              Portrait
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={pdfQuality}
              onChange={(e) => setPdfQuality(Number(e.target.value))}
              disabled={isExporting || isPrinting}
              className="bg-white/10 border border-white/20 text-xs font-bold text-white dark:text-slate-100 py-2 pl-3 pr-8 rounded-xl cursor-pointer outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22white%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
            >
              <option value={300} className="bg-[#314158]">300 DPI</option>
              <option value={600} className="bg-[#314158]">600 DPI</option>
              <option value={800} className="bg-[#314158]">800 DPI</option>
            </select>
            <button 
              onClick={exportPdf}
              disabled={isExporting || isPrinting}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 text-white dark:text-slate-100 px-6 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-violet-500/30 transition-all duration-300 hover:scale-105 active:scale-95 border border-violet-400/20"
            >
              {isExporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" strokeWidth={2.5} />}
              {isExporting ? 'DOWNLOADING...' : 'DOWNLOAD PDF'}
            </button>
            <button 
              onClick={handlePrint}
              disabled={isExporting || isPrinting}
              className="flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:opacity-50 text-white dark:text-slate-100 px-5 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-slate-900/25 transition-all hover:scale-105 active:scale-95 ml-2"
            >
              {isPrinting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer className="w-4 h-4" />}
              {isPrinting ? 'PREPARING...' : 'PRINT'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Enhance Documents / Photo Tools */}
        <div className="w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col z-10 shrink-0 text-slate-900 dark:text-slate-100 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 text-gray-500 dark:text-slate-400">
            <Wand2 className="w-4 h-4" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#2d3748] dark:text-slate-300">Photo Tools</h2>
          </div>
          <div className="p-6 flex-col flex gap-8">
            {selectedPlacementId && activePage && activePage.placements[selectedPlacementId] ? (
              <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                 {/* Actions */}
                 <div className="flex flex-col gap-2">
                    <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Actions</h3>
                    
                    {/* Shift Actions */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       <button 
                          onClick={() => handleShiftPlacement('first')}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition text-xs font-bold border border-slate-200 dark:border-slate-700"
                          title="Move to First Slot"
                       >
                          <ChevronsUp className="w-4 h-4 text-violet-500" /> Move First
                       </button>
                       <button 
                          onClick={() => handleShiftPlacement('last')}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition text-xs font-bold border border-slate-200 dark:border-slate-700"
                          title="Move to Last Slot"
                       >
                          <ChevronsDown className="w-4 h-4 text-violet-500" /> Move Last
                       </button>
                    </div>

                    {/* Copy/Paste Actions */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                       <button 
                          onClick={() => {
                            const p = activePage.placements[selectedPlacementId];
                            setCopiedPlacementSettings({
                              rotation: p.rotation,
                              flipX: p.flipX,
                              flipY: p.flipY,
                              filters: p.filters,
                              objectFit: p.objectFit
                            });
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                       >
                          <Copy className="w-4 h-4 text-indigo-500" /> Copy
                       </button>
                       <button 
                          onClick={() => {
                            if (copiedPlacementSettings) {
                              updateSelectedPlacement(copiedPlacementSettings);
                            }
                          }}
                          disabled={!copiedPlacementSettings}
                          className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                       >
                          <ClipboardPaste className="w-4 h-4 text-indigo-500" /> Paste
                       </button>
                       <button 
                          onClick={() => {
                            const current = activePage.placements[selectedPlacementId];
                            setPages(prev => prev.map(p => {
                              const newPlacements = { ...p.placements };
                              Object.keys(newPlacements).forEach(key => {
                                newPlacements[key] = {
                                  ...newPlacements[key],
                                  rotation: current.rotation,
                                  flipX: current.flipX,
                                  flipY: current.flipY,
                                  filters: current.filters ? { ...current.filters } : undefined,
                                  objectFit: current.objectFit
                                };
                              });
                              return { ...p, placements: newPlacements };
                            }));
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                          title="Apply Everything to All Photos"
                       >
                          <CheckCheck className="w-4 h-4 text-emerald-500" /> All
                       </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <button 
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            targetSlotForUploadRef.current = { pageId: activePage.id, slotId: selectedPlacementId };
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition text-xs font-bold border border-blue-100 dark:border-blue-800"
                       >
                          <UploadCloud className="w-4 h-4 text-blue-500" /> Replace
                       </button>
                       <button 
                          onClick={() => setCropPlacementId(selectedPlacementId)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs font-bold border border-gray-200 dark:border-slate-600"
                       >
                          <CropIcon className="w-4 h-4 text-amber-500" /> Crop
                       </button>
                       <button 
                          onClick={() => {
                            const p = activePage.placements[selectedPlacementId];
                            updateSelectedPlacement({ rotation: (p.rotation || 0) + 90 });
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs font-bold border border-gray-200 dark:border-slate-600"
                       >
                          <RotateCw className="w-4 h-4 text-indigo-500" /> Rotate
                       </button>
                       <button 
                          onClick={() => {
                            const p = activePage.placements[selectedPlacementId];
                            updateSelectedPlacement({ flipX: !p.flipX });
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs font-bold border border-gray-200 dark:border-slate-600"
                       >
                          <Shuffle className="w-4 h-4 -rotate-90 text-teal-500" /> Flip
                       </button>
                       
                       {/* Duplicate / Multiply */}
                       <button 
                          onClick={() => {
                            const current = activePage.placements[selectedPlacementId];
                            setPages(prev => {
                              let duplicated = false;
                              return prev.map(p => {
                                if (duplicated) return p;
                                const tmpl = ALBUM_TEMPLATES.find(t => t.id === p.templateId);
                                const newPlacements = { ...p.placements };
                                if (tmpl) {
                                  for (const slot of tmpl.slots) {
                                    if (!newPlacements[slot.id]) {
                                      newPlacements[slot.id] = {
                                        id: crypto.randomUUID(),
                                        url: current.url,
                                        originalUrl: current.originalUrl,
                                        rotation: current.rotation,
                                        flipX: current.flipX,
                                        flipY: current.flipY,
                                        filters: current.filters ? { ...current.filters } : undefined,
                                        objectFit: current.objectFit
                                      };
                                      duplicated = true;
                                      break;
                                    }
                                  }
                                }
                                return { ...p, placements: newPlacements };
                              });
                            });
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs font-bold border border-gray-200 dark:border-slate-600"
                       >
                          <Layers className="w-4 h-4 text-purple-500" /> Duplicate
                       </button>

                       {/* Delete Photo */}
                       <button 
                          onClick={() => {
                            setPages(prev => prev.map(p => {
                              if (p.id !== activePage.id) return p;
                              const newPlacements = { ...p.placements };
                              delete newPlacements[selectedPlacementId];
                              return { ...p, placements: newPlacements };
                            }));
                            setSelectedPlacementId(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition text-xs font-bold border border-red-100 dark:border-red-900/50"
                       >
                          <Trash2 className="w-4 h-4 text-red-500" /> Remove
                       </button>
                    </div>
                 </div>

                 <div className="flex flex-col gap-6 p-5 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-slate-800 shadow-sm">
                   <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider -mb-2">Enhance Adjustments</h3>
                   {/* Brightness */}
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                       <span>Brightness</span>
                       <span className="bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{enhancements.brightness}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <button onClick={() => handleEnhancementChange('brightness', Math.max(-100, enhancements.brightness - 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Decrease" type="button">-</button>
                       <input type="range" min="-100" max="100" value={enhancements.brightness} onChange={(e) => handleEnhancementChange('brightness', Number(e.target.value))} className="flex-1 accent-blue-500 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mx-1" />
                       <button onClick={() => handleEnhancementChange('brightness', Math.min(100, enhancements.brightness + 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Increase" type="button">+</button>
                     </div>
                   </div>
                   {/* Contrast */}
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                       <span>Contrast</span>
                       <span className="bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{enhancements.contrast}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <button onClick={() => handleEnhancementChange('contrast', Math.max(-100, enhancements.contrast - 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Decrease" type="button">-</button>
                       <input type="range" min="-100" max="100" value={enhancements.contrast} onChange={(e) => handleEnhancementChange('contrast', Number(e.target.value))} className="flex-1 accent-blue-500 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mx-1" />
                       <button onClick={() => handleEnhancementChange('contrast', Math.min(100, enhancements.contrast + 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Increase" type="button">+</button>
                     </div>
                   </div>
                   {/* B&W Scan */}
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                       <span>B&W Scan</span>
                       <span className="bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400">{enhancements.bwScan > 0 ? enhancements.bwScan : 'Off'}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <button onClick={() => handleEnhancementChange('bwScan', Math.max(0, enhancements.bwScan - 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Decrease" type="button">-</button>
                       <input type="range" min="0" max="100" value={enhancements.bwScan} onChange={(e) => handleEnhancementChange('bwScan', Number(e.target.value))} className="flex-1 accent-emerald-500 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mx-1" />
                       <button onClick={() => handleEnhancementChange('bwScan', Math.min(100, enhancements.bwScan + 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Increase" type="button">+</button>
                     </div>
                   </div>
                   {/* Remove BG */}
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                       <span>Remove BG (Color Key)</span>
                       <span>{enhancements.removeBgVal > 0 ? enhancements.removeBgVal : 'Off'}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <button onClick={() => handleEnhancementChange('removeBgVal', Math.max(0, enhancements.removeBgVal - 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Decrease" type="button">-</button>
                       <input type="range" min="0" max="100" value={enhancements.removeBgVal} onChange={(e) => handleEnhancementChange('removeBgVal', Number(e.target.value))} className="flex-1 accent-rose-500 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mx-1" />
                       <button onClick={() => handleEnhancementChange('removeBgVal', Math.min(100, enhancements.removeBgVal + 1))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 transition text-xs font-bold leading-none select-none" title="Increase" type="button">+</button>
                     </div>
                   </div>
                   
                   <div className="h-px bg-gray-200 dark:bg-slate-700 my-2"></div>
                   
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-24">AI Background Remove</span>
                      <button 
                         onClick={handleRemoveBgAI} 
                         disabled={isRemovingBg}
                         className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-500 text-white text-xs font-bold py-2 px-3 rounded-lg border border-transparent shadow-md transition-all flex items-center justify-center"
                      >
                         {isRemovingBg ? (
                            <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> Processing...</>
                         ) : 'Remove Background'}
                      </button>
                   </div>
     
                   <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Background Color</span>
                      <div className="flex items-center gap-3">
                         <div className="w-5 h-5 bg-white rounded-sm border border-gray-300 dark:border-gray-500"></div>
                         <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 dark:text-slate-400">
                            <input type="checkbox" checked={enhancements.transparentBg} onChange={e => setEnhancements({...enhancements, transparentBg: e.target.checked})} className="accent-blue-500 scale-110" />
                            Transparent
                         </label>
                      </div>
                   </div>
     
                   <div className="h-px bg-gray-200 dark:bg-slate-700 mt-2 mb-1"></div>
     
                   <div className="flex flex-col gap-2">
                     <button 
                        onClick={() => updateSelectedPlacement({ rotation: 0, flipX: false, flipY: false, filters: undefined })}
                        className="w-full py-2 bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition text-xs font-bold"
                     >
                       Reset All Changes
                     </button>
                   </div>
                 </div>
     
                 <div className="flex flex-col gap-4 p-5 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-slate-800">
                     <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-2">
                         <ImagePlus className="w-4 h-4" />
                         <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">Image Overlay</h3>
                     </div>
                     <div className="flex flex-col gap-3">
                         <label className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg cursor-pointer transition text-xs font-bold text-slate-700 dark:text-slate-300">
                            <UploadCloud className="w-4 h-4" />
                            {activePage.placements[selectedPlacementId].overlayUrl ? 'Change Overlay' : 'Upload Overlay'}
                            <input 
                               type="file" 
                               accept="image/*" 
                               className="hidden" 
                               onChange={(e) => {
                                   if (e.target.files && e.target.files[0]) {
                                       const url = URL.createObjectURL(e.target.files[0]);
                                       setPages(pages => pages.map(p => {
                                           if (p.id !== activePage.id) return p;
                                           return { ...p, placements: { ...p.placements, [selectedPlacementId]: { ...p.placements[selectedPlacementId], overlayUrl: url, overlayOpacity: p.placements[selectedPlacementId].overlayOpacity ?? 1 } } };
                                       }));
                                   }
                               }}
                            />
                         </label>
                         {activePage.placements[selectedPlacementId].overlayUrl && (
                           <div className="flex flex-col gap-2">
                             <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                               <span>Opacity</span>
                               <span>{Math.round((activePage.placements[selectedPlacementId].overlayOpacity ?? 1) * 100)}%</span>
                             </div>
                             <div className="flex items-center gap-3">
                               <input type="range" min="0" max="1" step="0.05" value={activePage.placements[selectedPlacementId].overlayOpacity ?? 1} onChange={(e) => {
                                   const opacity = Number(e.target.value);
                                   setPages(pages => pages.map(p => {
                                       if (p.id !== activePage.id) return p;
                                       return { ...p, placements: { ...p.placements, [selectedPlacementId]: { ...p.placements[selectedPlacementId], overlayOpacity: opacity } } };
                                   }));
                               }} className="flex-1 accent-blue-500 h-1 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none" />
                             </div>
                             <button onClick={() => {
                                 setPages(pages => pages.map(p => {
                                     if (p.id !== activePage.id) return p;
                                     const newPlac = { ...p.placements[selectedPlacementId] };
                                     delete newPlac.overlayUrl;
                                     return { ...p, placements: { ...p.placements, [selectedPlacementId]: newPlac } };
                                 }));
                             }} className="mt-2 py-1.5 text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition">Remove Overlay</button>
                           </div>
                         )}
                     </div>
                 </div>

                 <div className="flex flex-col gap-2 mt-4">
                    <button 
                       onClick={() => {
                         const nextP = { ...activePage.placements };
                         delete nextP[selectedPlacementId];
                         setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, placements: nextP } : p));
                         setSelectedPlacementId(null);
                       }}
                       className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition text-xs font-bold"
                    >
                      <Trash2 className="w-4 h-4" /> Remove Photo
                    </button>
                 </div>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                 <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                    <MousePointerClick className="w-8 h-8 text-blue-400" />
                 </div>
                 <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">No Photo Selected</h3>
                 <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">Click any placed photo on the canvas to access actions and enhancement tools.</p>
               </div>
            )}
          </div>
        </div>

        {/* Center Canvas + Bottom Panel Container */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Main Canvas Area */}
          <div 
            className="flex-1 bg-gray-100 dark:bg-slate-900 overflow-auto flex flex-col items-center justify-center p-8 relative"
            onClick={() => setSelectedPlacementId(null)}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  {activePage && activeTemplate && (
                    <div 
                      className="relative shadow-2xl transition-all duration-300"
                      style={{
                        width: orientation === 'portrait' ? '500px' : '707px',
                        height: orientation === 'portrait' ? '707px' : '500px',
                        backgroundColor: activePage.bgColor
                      }}
                    >
                      {activePage.bgImage && (
                        <img src={activePage.bgImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ opacity: activePage.bgImageOpacity ?? 1 }} alt="" />
                      )}
                      
                      {/* Safe Zone / Bleed Indicator */}
                      {showBleed && (
                        <div className="absolute inset-0 pointer-events-none z-50 p-4">
                          <div className="w-full h-full border border-red-500/50 border-dashed rounded-sm"></div>
                          <div className="absolute top-1 left-4 text-[9px] text-red-500 font-bold bg-white/80 px-1 rounded">SAFE ZONE</div>
                        </div>
                      )}
                  
                  {activeTemplate.slots.map(slot => (
                    <DraggableFrame 
                      key={slot.id} 
                      slot={slot} 
                      placedImg={activePage.placements[slot.id]} 
                      gutter={gutter}
                      isSelected={selectedPlacementId === slot.id}
                      onSelect={() => setSelectedPlacementId(slot.id)}
                      onCrop={() => setCropPlacementId(slot.id)}
                      onUpdatePlacement={(updates) => updateSelectedPlacement(updates)}
                      onEmptyClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                          targetSlotForUploadRef.current = { pageId: activePage.id, slotId: slot.id };
                          fileInputRef.current.click();
                        }
                      }}
                      onTextUpdate={(txt) => {
                        setPages(prev => prev.map(p => {
                          if (p.id !== activePageId) return p;
                          return {
                            ...p,
                            placements: {
                              ...p.placements,
                              [slot.id]: { ...p.placements[slot.id], text: txt }
                            }
                          };
                        }));
                      }}
                      onRemove={() => {
                        setPages(prev => prev.map(p => {
                          if (p.id !== activePageId) return p;
                          const newP = { ...p.placements };
                          delete newP[slot.id];
                          return { ...p, placements: newP };
                        }));
                      }}
                    />
                  ))}
                </div>
              )}
            </DndContext>
          </div>
          </div>

          {/* Bottom Sidebar - Pages */}
          <div 
            style={{ height: `${bottomPanelHeight}px` }}
            className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex flex-col shrink-0 overflow-hidden relative z-10 w-full text-slate-900 dark:text-slate-100 transition-[height] duration-75"
          >
            {/* Drag Handle Divider */}
            <div 
              onMouseDown={handleMouseDown}
              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-gray-100/50 hover:bg-violet-500/30 dark:bg-slate-800/50 dark:hover:bg-violet-500/30 transition-colors z-20 flex items-center justify-center group"
            >
              <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-slate-600 group-hover:bg-violet-500 transition-colors" />
            </div>

            <div className="p-2 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center text-gray-500 dark:text-slate-400 pt-3">
              <h2 className="text-xs font-bold uppercase tracking-wider ml-2 text-slate-700 dark:text-slate-300">Pages ({pages.length})</h2>
              <button onClick={() => addNewPage()} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition mr-2">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-x-auto p-3 flex gap-4 items-center">
              {pages.map((p, idx) => {
                const tmpl = ALBUM_TEMPLATES.find(t => t.id === p.templateId);
                return (
                <div 
                  key={p.id}
                  onClick={() => setActivePageId(p.id)}
                  className={`relative shrink-0 group aspect-[1.414] h-full max-h-28 rounded-md border-2 overflow-hidden cursor-pointer transition ${activePageId === p.id ? 'border-[#3b82f6] shadow-[0_0_0_2px_rgba(59,130,246,0.3)]' : 'border-[#263140] hover:border-[#6e7f96]'}`}
                  style={{
                    aspectRatio: orientation === 'landscape' ? 1.414 : 1/1.414,
                    backgroundColor: p.bgColor
                  }}
                >
                  {p.bgImage && (
                    <img src={p.bgImage} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: p.bgImageOpacity ?? 1 }} alt="" />
                  )}
                  {tmpl && (
                    <div className="absolute inset-0 pointer-events-none p-1">
                      {tmpl.slots.map(slot => {
                        const placedImg = p.placements[slot.id];
                        return (
                          <div 
                            key={slot.id}
                            className="absolute bg-black/10 border border-black/20 flex items-center justify-center overflow-hidden rounded-[2px]"
                            style={{
                              left: `calc(4px + ${slot.x * 100}%)`,
                              top: `calc(4px + ${slot.y * 100}%)`,
                              width: `calc(${slot.w * 100}% - 8px)`,
                              height: `calc(${slot.h * 100}% - 8px)`,
                              zIndex: slot.zIndex || 5
                            }}
                          >
                            {placedImg && (
                              <>
                                <img 
                                  src={placedImg.url} 
                                  className="w-full h-full object-cover" 
                                  style={{ 
                                    filter: getFilterStyle(placedImg.filters),
                                    transform: getImageTransform(placedImg)
                                  }} 
                                  alt="" 
                                />
                                {placedImg.overlayUrl && (
                                  <img src={placedImg.overlayUrl} className="absolute inset-0 w-full h-full pointer-events-none object-cover" style={{ opacity: placedImg.overlayOpacity ?? 1 }} alt="" />
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/70 text-gray-200 text-[9px] px-1.5 py-0.5 rounded font-bold z-10">{idx + 1}</div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextPages = pages.filter(page => page.id !== p.id);
                      setPages(nextPages);
                      if (activePageId === p.id) {
                        setActivePageId(nextPages.length > 0 ? nextPages[0].id : null);
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white dark:text-slate-100 p-1 rounded opacity-0 group-hover:opacity-100 transition z-10 shadow"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* Right Sidebar - Properties */}
        <div className="w-72 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col z-10 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Page Properties</h2>
          </div>
          
          <div className="p-5 flex flex-col gap-6 overflow-y-auto">
            {/* Global Settings */}
            <div>
              <h3 className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Document Setup</h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-slate-200">Target Size</span>
                  <select 
                    value={albumSize} 
                    onChange={(e) => setAlbumSize(e.target.value as any)}
                    className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm rounded outline-none p-1"
                  >
                    <option value="A3">A3 (297x420mm)</option>
                    <option value="A4">A4 (210x297mm)</option>
                  </select>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-slate-200">Show Bleed Area</span>
                  <label className="relative inline-flex items-center cursor-pointer hover:scale-105 transition-transform">
                    <input type="checkbox" checked={showBleed} onChange={e => setShowBleed(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600 shadow-inner"></div>
                  </label>
                </div>
                
                <div className="flex flex-col gap-1 text-sm mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-200">Gutter Size: {gutter}px</span>
                  </div>
                  <input type="range" min="0" max="40" value={gutter} onChange={e => setGutter(Number(e.target.value))} className="w-full accent-blue-600" />
                </div>
                
                <div className="flex flex-col gap-2 text-sm mt-2">
                  <span className="text-gray-600 dark:text-slate-200">Page Background Color</span>
                  <div className="flex gap-2 items-center flex-wrap">
                    {['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#94a3b8', '#0f172a', '#000000'].map(c => (
                      <button 
                        key={c}
                        onClick={() => {
                          setBgColor(c);
                          if (activePageId) {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, bgColor: c } : p));
                          }
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition ${bgColor === c ? 'border-blue-500 scale-110' : 'border-gray-300 dark:border-slate-600'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="h-6 w-px bg-gray-300 mx-1"></div>
                    <label className="w-8 h-8 rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer flex items-center justify-center relative hover:scale-110 transition">
                      <Palette className="w-4 h-4 text-gray-500 absolute pointer-events-none" />
                      <input 
                        type="color" 
                        value={bgColor}
                        onChange={(e) => {
                          setBgColor(e.target.value);
                          if (activePageId) {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, bgColor: e.target.value } : p));
                          }
                        }}
                        className="opacity-0 absolute inset-0 w-16 h-16 cursor-pointer -translate-x-2 -translate-y-2"
                      />
                    </label>
                  </div>
                </div>

                {activePage && (
                  <>
                    <div className="flex flex-col gap-2 text-sm mt-2">
                      <span className="text-gray-600 dark:text-slate-200">Background Image</span>
                      <div className="flex gap-2">
                        <label className="flex-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded flex justify-center items-center py-1.5 cursor-pointer hover:bg-gray-50 transition text-xs font-semibold text-gray-700 dark:text-gray-200">
                          <Upload className="w-4 h-4 mr-1" /> Upload Image
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            if(e.target.files && e.target.files.length > 0) {
                              const url = URL.createObjectURL(e.target.files[0]);
                              setPages(prev => prev.map(p => p.id === activePageId ? { ...p, bgImage: url } : p));
                            }
                          }} />
                        </label>
                        {activePage.bgImage && (
                          <button 
                            onClick={() => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, bgImage: undefined } : p))}
                            className="bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-900 px-2 rounded hover:bg-red-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {activePage.bgImage && (
                      <div className="flex flex-col gap-1 text-sm mt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-slate-200">Image Opacity</span>
                          <span className="text-gray-500 dark:text-slate-400">{Math.round((activePage.bgImageOpacity ?? 1) * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05" 
                          value={activePage.bgImageOpacity ?? 1} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, bgImageOpacity: val } : p));
                          }} 
                          className="w-full accent-blue-600" 
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700"></div>

            {/* Layout Options */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Page Layout</h3>
                <button 
                  onClick={shuffleCurrentPage}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-purple-600 transition flex items-center justify-center gap-1 text-xs font-bold"
                  title="Shuffle template with current photos"
                >
                  <Shuffle className="w-3 h-3" /> Shuffle
                </button>
              </div>
              
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {ALBUM_TEMPLATES.filter(t => t.orientation === orientation).map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                       if (activePageId) {
                         setPages(prev => prev.map(p => p.id === activePageId ? { ...p, templateId: tmpl.id } : p));
                       }
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-3 transition ${
                      activeTemplate?.id === tmpl.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded shrink-0 bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                      <LayoutTemplate className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </div>
                    <div className="flex flex-col flex-1 truncate">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{tmpl.name}</span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase">{tmpl.category}</span>
                    </div>
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      
      {/* Hidden export container */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', zIndex: -1000, pointerEvents: 'none' }}>
        <div ref={contentRef} className="flex flex-col">
          {pages.map(page => {
             const tmpl = ALBUM_TEMPLATES.find(t => t.id === page.templateId);
             if (!tmpl) return null;
             return (
                 <div 
                 key={page.id}
                 className="relative album-page-export"
                 data-bg-color={page.bgColor}
                 style={{
                   width: orientation === 'portrait' ? '1200px' : '1697px', // higher base res for export
                   height: orientation === 'portrait' ? '1697px' : '1200px',
                   backgroundColor: page.bgColor
                 }}
               >
                 {page.bgImage && (
                   <img src={page.bgImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ opacity: page.bgImageOpacity ?? 1 }} alt="" />
                 )}
                 {tmpl.slots.map(slot => {
                   const placedImg = page.placements[slot.id];
                   return (
                     <div
                        key={slot.id}
                        className="absolute"
                        style={{
                          left: `${slot.x * 100}%`,
                          top: `${slot.y * 100}%`,
                          width: `${slot.w * 100}%`,
                          height: `${slot.h * 100}%`,
                          padding: `${gutter * 2.4}px`, // scale gutter proportionally since w/h are ~2.4x larger
                          zIndex: slot.zIndex || 10
                        }}
                     >
                        <div className="w-full h-full relative bg-gray-200 overflow-hidden">
                          {placedImg && (
                            <>
                              <img 
                                src={placedImg.url} 
                                className="absolute inset-0 w-full h-full object-cover" 
                                style={{ 
                                  filter: getFilterStyle(placedImg.filters),
                                  transform: getImageTransform(placedImg)
                                }} 
                                alt="" 
                              />
                              {placedImg.overlayUrl && (
                                <img src={placedImg.overlayUrl} className="absolute inset-0 w-full h-full pointer-events-none object-cover" style={{ opacity: placedImg.overlayOpacity ?? 1 }} alt="" />
                              )}
                              {placedImg.text && (
                                <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white dark:text-slate-100 text-xl p-3 text-center rounded">
                                  {placedImg.text}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                     </div>
                   );
                 })}
               </div>
             )
          })}
        </div>
      </div>
      
      {cropPlacementId && activePage && activePage.placements[cropPlacementId] && (
        <CropImageModal 
          item={{ 
            id: cropPlacementId, 
            url: activePage.placements[cropPlacementId].url, 
            originalUrl: activePage.placements[cropPlacementId].url 
          } as any}
          onClose={() => setCropPlacementId(null)}
          onSave={(newUrl, newCrop) => {
             setPages(pages => pages.map(p => {
                if (p.id !== activePage.id) return p;
                return {
                   ...p,
                   placements: {
                     ...p.placements,
                     [cropPlacementId]: {
                        ...p.placements[cropPlacementId],
                        url: newUrl
                     }
                   }
                }
             }));
             setCropPlacementId(null);
          }}
        />
      )}
    </div>
  );
};
