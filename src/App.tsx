import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import domtoimage from 'dom-to-image';

import debounce from 'lodash/debounce';
import { 
  Printer, Undo2, Redo2, UploadCloud, Layout, Grid, 
  CreditCard, SquareUser, AlignJustify, Wallet, Image as ImageIcon, 
  LayoutGrid, Settings2, Plus, Minus, Lightbulb, Download, 
  Trash2, FileUp, ImagePlus, UserCircle, Settings, X, RotateCw, Maximize,
  Copy, ClipboardPaste, ChevronsUp, ChevronsDown, ZoomIn, ZoomOut, AlignCenter, Crop as CropIcon, Square, Sun, Moon, Wand2, SlidersHorizontal, Layers, CheckCheck, RotateCcw, Sparkles
} from 'lucide-react';
import { applyImageFilters } from './utils/imageFilters';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { AlbumDesigner } from './components/AlbumDesigner/AlbumDesigner';
import { A3Designer } from './components/A3Designer/A3Designer';

export interface ImageItem {
  id: string;
  url: string;
  originalUrl?: string;
  bgRemovedUrl?: string;
  isRemovingBg?: boolean;
  lastCrop?: Crop;
  customWidth?: string;
  customHeight?: string;
  rotation: number;
  objectFit: 'fill' | 'contain' | 'cover';
  orientation?: 'landscape' | 'portrait';
  centerInRow?: boolean;
  roundedCorners?: boolean;
}

interface LayoutConfig {
  id: string;
  name: string;
  w: string;
  h: string;
  perPage: number;
  rowGap: string;
  colGap: string;
  icon: React.ElementType;
  color: string;
}

const AUTO_LAYOUT: LayoutConfig = { id: '2x2', name: 'Auto set image in PDF', w: '3.7in', h: '4.8in', perPage: 4, rowGap: '0.2in', colGap: '0.2in', icon: Grid, color: 'text-blue-500' };

const LAYOUT_TEMPLATES: LayoutConfig[] = [
  { id: 'aadhar', name: 'Aadhar Card', w: '3.39in', h: '2.13in', perPage: 8, rowGap: '0.2in', colGap: '0.2in', icon: CreditCard, color: 'text-emerald-500' },
  { id: 'pan', name: 'PAN Card', w: '3.3in', h: '2.1in', perPage: 8, rowGap: '0.2in', colGap: '0.2in', icon: CreditCard, color: 'text-amber-500' },
  { id: 'passport', name: 'Passport Size', w: '1.38in', h: '1.77in', perPage: 30, rowGap: '0.1in', colGap: '0.1in', icon: UserCircle, color: 'text-rose-500' },
  { id: 'vertical', name: 'Vertical Mode', w: '7.5in', h: '3.5in', perPage: 3, rowGap: '0.2in', colGap: '0.2in', icon: AlignJustify, color: 'text-teal-500' },
  { id: 'wallet', name: 'Wallet Size', w: '2.5in', h: '3.5in', perPage: 9, rowGap: '0.2in', colGap: '0.2in', icon: Wallet, color: 'text-pink-500' },
  { id: 'landscape', name: 'Landscape 4x6', w: '6in', h: '4in', perPage: 2, rowGap: '0.2in', colGap: '0.2in', icon: ImageIcon, color: 'text-indigo-500' },
  { id: 'smart', name: 'Smart 4/Page', w: '3.5in', h: '4.8in', perPage: 4, rowGap: '0.2in', colGap: '0.2in', icon: LayoutGrid, color: 'text-cyan-500' },
];

const ALL_LAYOUTS: LayoutConfig[] = [AUTO_LAYOUT, ...LAYOUT_TEMPLATES];

const extractAadharCards = (url: string): Promise<{ frontUrl: string, backUrl: string, originalUrl: string, frontCrop: Crop, backCrop: Crop } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspect = img.height / img.width;
      if (aspect < 1.2) {
        return resolve(null); // Not a tall page
      }
      
      // Tight aadhar crop constants for typical PDF (approx limits)
      const pw = img.width;
      const ph = img.height;
      const cardW = pw * 0.41;
      const cardH = ph * 0.185; 
      const cropY = ph * 0.74; // starts from 74% down the page
      
      const frontX = pw * 0.055;
      const backX = pw * 0.535;
      
      const frontCanvas = document.createElement('canvas');
      const backCanvas = document.createElement('canvas');
      
      frontCanvas.width = cardW;
      frontCanvas.height = cardH;
      backCanvas.width = cardW;
      backCanvas.height = cardH;
      
      const frontCtx = frontCanvas.getContext('2d');
      const backCtx = backCanvas.getContext('2d');
      
      if (frontCtx) { frontCtx.fillStyle = 'white'; frontCtx.fillRect(0,0,cardW,cardH); }
      if (backCtx) { backCtx.fillStyle = 'white'; backCtx.fillRect(0,0,cardW,cardH); }

      frontCtx?.drawImage(img, frontX, cropY, cardW, cardH, 0, 0, cardW, cardH);
      backCtx?.drawImage(img, backX, cropY, cardW, cardH, 0, 0, cardW, cardH);
      
      resolve({
        originalUrl: url,
        frontUrl: frontCanvas.toDataURL('image/jpeg', 0.95),
        frontCrop: { unit: '%', x: (frontX/pw)*100, y: (cropY/ph)*100, width: (cardW/pw)*100, height: (cardH/ph)*100 },
        backUrl: backCanvas.toDataURL('image/jpeg', 0.95),
        backCrop: { unit: '%', x: (backX/pw)*100, y: (cropY/ph)*100, width: (cardW/pw)*100, height: (cardH/ph)*100 }
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const MultiplyModal = ({ 
  item, 
  onClose, 
  onSave 
}: { 
  item: ImageItem; 
  onClose: () => void; 
  onSave: (count: number) => void; 
}) => {
  const [count, setCount] = useState<number>(6);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" /> Multiply Copies
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-4 justify-center">
             <div className="w-20 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
               <img src={item.url} className="w-full h-full object-contain" />
             </div>
             <div className="flex flex-col gap-2 flex-1">
               <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Number of Copies</label>
               <input 
                 type="number" 
                 min="1" 
                 value={count} 
                 onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                 className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
               />
             </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {[3, 6, 12, 24, 60].map(preset => (
              <button
                key={preset}
                onClick={() => setCount(preset)}
                className={`py-2 px-1 text-sm font-semibold rounded-lg transition-colors border ${count === preset ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => onSave(count)} 
            className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white dark:text-slate-100 rounded-xl shadow-md hover:shadow-lg transition-all whitespace-nowrap"
          >
            Create {count} Cop{count !== 1 ? 'ies' : 'y'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CropImageModal = ({ item, onClose, onSave }: { item: any; onClose: () => void; onSave: (url: string, newCrop: any) => void; }) => {
  const [crop, setCrop] = useState<Crop | undefined>(item.lastCrop);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [percentCrop, setPercentCrop] = useState<Crop>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSave = () => {
    if (!completedCrop || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    );

    const base64Image = canvas.toDataURL('image/jpeg', 0.95);
    onSave(base64Image, percentCrop || crop || { unit: '%', x: 0, y: 0, width: 100, height: 100 });
  };

  return (
    <div className={`fixed inset-0 z-[150] bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white dark:bg-slate-900 shadow-xl flex flex-col overflow-hidden w-full transition-all duration-300 ${isFullscreen ? 'max-w-none h-full max-h-full rounded-none border-0' : 'max-w-4xl max-h-[90vh] rounded-2xl border border-gray-200 dark:border-slate-700'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Crop Image</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-500 dark:text-slate-300 dark:text-slate-400" title="Toggle Fullscreen">
              <Maximize className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-500 dark:text-slate-300 dark:text-slate-400" title="Close">
              <X className="w-5 h-5"/>
            </button>
          </div>
        </div>
        <div className="p-6 flex-1 overflow-auto bg-gray-100 dark:bg-slate-800 min-h-[300px]">
          <div className="min-w-full min-h-full flex items-center justify-center">
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={(c, p) => { setCompletedCrop(c); setPercentCrop(p); }}>
              <img 
                ref={imgRef} 
                src={item.originalUrl || item.url} 
                style={{ height: `${zoom * (isFullscreen ? 80 : 60)}vh` }} 
                className="shadow-sm border border-gray-200 dark:border-slate-600 max-w-none bg-white dark:bg-slate-900" 
              />
            </ReactCrop>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-300 dark:text-slate-400 rounded"><ZoomOut size={18} /></button>
            <span className="text-sm font-semibold w-[4.5ch] text-center select-none text-gray-700 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.5, 4))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-300 dark:text-slate-400 rounded"><ZoomIn size={18} /></button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white dark:text-slate-100 transition">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2 font-bold text-white dark:text-slate-100 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">Crop & Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManualSettingsModal = ({ item, layout, onClose, onChange, onApplyToAll }: { item: ImageItem; layout: LayoutConfig; onClose: () => void; onChange: (id: string, changes: Partial<ImageItem>) => void; onApplyToAll: (changes: Partial<ImageItem>) => void; }) => {
  if (!item) return null;
  const parseVal = (val: string) => val.replace('in', '');
  
  const getAutoDimensions = () => {
    const wVal = parseFloat(layout.w);
    const hVal = parseFloat(layout.h);
    const maxDim = Math.max(wVal, hVal) + 'in';
    const minDim = Math.min(wVal, hVal) + 'in';

    if (item.orientation === 'landscape') {
      if (layout.id === '2x2') {
        return { autoW: '7.6in', autoH: '3in' };
      }
      return { autoW: maxDim, autoH: minDim };
    }
    
    return { autoW: minDim, autoH: maxDim };
  };

  const { autoW, autoH } = getAutoDimensions();

  const [wVal, setWVal] = useState(item.customWidth ? parseVal(item.customWidth) : parseVal(autoW));
  const [hVal, setHVal] = useState(item.customHeight ? parseVal(item.customHeight) : parseVal(autoH));
  
  const handleSave = () => { onChange(item.id, { customWidth: `${wVal}in`, customHeight: `${hVal}in` }); onClose(); };
  const handleApplyToAll = () => { onApplyToAll({ customWidth: `${wVal}in`, customHeight: `${hVal}in`, rotation: item.rotation, objectFit: item.objectFit, centerInRow: item.centerInRow, roundedCorners: item.roundedCorners }); onClose(); };
  const handleRotate = () => { onChange(item.id, { rotation: (item.rotation + 90) % 360 }); };
  const toggleFit = () => { onChange(item.id, { objectFit: item.objectFit === 'fill' ? 'contain' : (item.objectFit === 'contain' ? 'cover' : 'fill') }); };
  const handleReset = () => { onChange(item.id, { customWidth: undefined, customHeight: undefined, rotation: 0, objectFit: 'fill', centerInRow: false, roundedCorners: false }); setWVal(parseVal(autoW)); setHVal(parseVal(autoH)); };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Manual Photo Settings</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-500 dark:text-slate-300 dark:text-slate-400"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="flex justify-center bg-gray-100 dark:bg-slate-800 items-center rounded-lg p-4 border border-gray-200 dark:border-slate-700 h-48">
             <div className="relative shadow-sm border border-gray-300 dark:border-slate-600 bg-white" style={{ width: 'auto', height: '100%', aspectRatio: Number(wVal)/Number(hVal) || 1, overflow: 'hidden', borderRadius: item.roundedCorners ? '12px' : '0' }}>
                 <img src={item.url} style={{ transform: `rotate(${item.rotation}deg)`, objectFit: item.objectFit }} className="w-full h-full pointer-events-none transition-transform" />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Width (inches)</label>
              <input type="number" step="0.1" value={wVal} onChange={e => setWVal(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Height (inches)</label>
              <input type="number" step="0.1" value={hVal} onChange={e => setHVal(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRotate} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-semibold text-sm rounded-lg border border-gray-300 dark:border-slate-600 transition">
              <RotateCw className="w-4 h-4"/> Rotate 90°
            </button>
            <button onClick={toggleFit} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-semibold text-sm rounded-lg border border-gray-300 dark:border-slate-600 transition capitalize">
              <Maximize className="w-4 h-4"/> Fit: {item.objectFit}
            </button>
            <button onClick={() => onChange(item.id, { centerInRow: !item.centerInRow })} className={`flex-1 flex items-center justify-center gap-2 py-2 font-semibold text-sm rounded-lg border transition ${item.centerInRow ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border-gray-300 dark:border-slate-600'}`}>
              <AlignCenter className="w-4 h-4"/> Center in Row
            </button>
            <button onClick={() => onChange(item.id, { roundedCorners: !item.roundedCorners })} className={`flex-1 flex items-center justify-center gap-2 py-2 font-semibold text-sm rounded-lg border transition ${item.roundedCorners ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border-gray-300 dark:border-slate-600'}`}>
              <Square className="w-4 h-4"/> PVC Round
            </button>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <button onClick={handleReset} className="text-sm font-semibold text-gray-500 dark:text-slate-300 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200">Reset to Template</button>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button onClick={onClose} className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg text-sm transition">Cancel</button>
            <button onClick={handleApplyToAll} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white dark:text-slate-100 font-bold rounded-lg text-sm shadow-sm transition whitespace-nowrap">Apply to All</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white dark:text-slate-100 font-bold rounded-lg text-sm shadow-sm transition">Apply Size</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableImage: React.FC<{
  item: ImageItem; 
  watermark: boolean; 
  layout: LayoutConfig; 
  isSelected: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onRemove: (id: string) => void; 
  onReplace: (id: string) => void; 
  onEdit: (id: string) => void; 
  onCopySettings: (item: ImageItem) => void;
  onPasteSettings: (id: string) => void;
  hasCopiedSettings: boolean;
  onMoveToFirst: (id: string) => void;
  onMoveToLast: (id: string) => void;
  onCrop: (id: string) => void;
  onMultiply: (id: string) => void;
}> = ({ 
  item, 
  watermark, 
  layout, 
  isSelected,
  onClick,
  onRemove, 
  onReplace, 
  onEdit,
  onCopySettings,
  onPasteSettings,
  hasCopiedSettings,
  onMoveToFirst,
  onMoveToLast,
  onCrop,
  onMultiply
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const getAutoDimensions = () => {
    const wVal = parseFloat(layout.w);
    const hVal = parseFloat(layout.h);
    const maxDim = Math.max(wVal, hVal) + 'in';
    const minDim = Math.min(wVal, hVal) + 'in';

    if (item.orientation === 'landscape') {
      if (layout.id === '2x2') {
        return { autoW: '7.6in', autoH: '3in' };
      }
      return { autoW: maxDim, autoH: minDim };
    }
    
    return { autoW: minDim, autoH: maxDim };
  };

  const { autoW, autoH } = getAutoDimensions();
  const width = item.customWidth || autoW;
  const height = item.customHeight || autoH;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (isSelected ? 40 : 1),
    width,
    height,
    borderRadius: item.roundedCorners ? '0.12in' : '0',
    ...(item.centerInRow ? { marginLeft: 'auto', marginRight: 'auto' } : {})
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => onClick(item.id, e)}
      className={`relative flex-shrink-0 group overflow-hidden ${
        item.roundedCorners ? 'bg-transparent border-transparent' : 'bg-gray-100 border border-gray-200'
      } ${
        isDragging ? 'shadow-2xl opacity-80 ring-4 ring-blue-500' : ''
      } ${
        isSelected && !isDragging && layout.id === 'passport' ? 'ring-[3px] ring-blue-500 ring-offset-2' : ''
      }`}
    >
      {/* Drag handle area covers the whole image but allows pointer events on UI below */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0" 
      />
      
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden" style={{ borderRadius: item.roundedCorners ? '0.12in' : '0' }}>
        <img src={item.url} alt="Uploaded preview" style={{ borderRadius: item.roundedCorners ? '0.12in' : '0', transform: `rotate(${item.rotation || 0}deg)`, objectFit: item.objectFit || 'fill' }} className="w-full h-full transition-transform duration-200" />
      </div>

      {item.roundedCorners && (
        <>
          <div 
            className="absolute border-solid border-white pointer-events-none z-[5]" 
            style={{
              top: '-0.2in', left: '-0.2in', right: '-0.2in', bottom: '-0.2in',
              borderWidth: '0.2in',
              borderRadius: '0.32in'
            }} 
          />
          <div 
            className="absolute inset-0 pointer-events-none z-[6] border border-gray-200"
            style={{ borderRadius: '0.12in' }}
          />
        </>
      )}

      {watermark && (
        <div className="absolute bottom-2 right-2 flex items-center justify-center p-1 px-1.5 text-black bg-white/70 font-semibold border border-black/10 pointer-events-none z-10 shadow-sm" style={{ fontSize: '0.15in' }}>
          Self-Attested
        </div>
      )}

      {/* Hover actions */}
      {layout.id !== 'passport' && (
      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity z-20 no-print flex-col ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="flex gap-1 justify-end mb-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveToFirst(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-md shadow-sm border border-gray-200 transition"
            title="Move to First"
          >
            <ChevronsUp className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveToLast(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-md shadow-sm border border-gray-200 transition"
            title="Move to Last"
          >
            <ChevronsDown className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1 justify-end mb-1">
          {hasCopiedSettings && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPasteSettings(item.id); }}
              className="p-2 bg-green-500 hover:bg-green-600 text-white dark:text-slate-100 rounded-md shadow-sm border border-transparent transition"
              title="Paste Size/Settings"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
          )}
          <button 
             onClick={(e) => { e.stopPropagation(); onCopySettings(item); }}
             className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-md shadow-sm border border-gray-200 transition"
             title="Copy Size/Settings"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1 justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); onMultiply(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-indigo-600 rounded-md shadow-sm border border-gray-200 transition"
            title="Create Copies"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onCrop(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-md shadow-sm border border-gray-200 transition"
            title="Crop Image"
          >
            <CropIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-md shadow-sm border border-gray-200 transition"
            title="Manual Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onReplace(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-blue-600 rounded-md shadow-sm border border-gray-200 transition"
            title="Replace Photo"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-md shadow-sm border border-gray-200 transition"
            title="Remove Photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

const BgRemoverToolModal = ({ onClose }: { onClose: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [removedBgUrl, setRemovedBgUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const url = URL.createObjectURL(f);
      setOriginalUrl(url);
      setRemovedBgUrl(null);
      setIsProcessing(true);
      setErrorMsg("");
      try {
        const { removeBackground } = await import('@imgly/background-removal');
        const blob = await removeBackground(url, { 
          model: "isnet_quint8",
          progress: () => {} 
        });
        setRemovedBgUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to remove background. Ensure the image is valid.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const currentPreview = removedBgUrl || originalUrl;

  const handleDownload = () => {
    if (!removedBgUrl && !originalUrl) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `bg-changed-${file?.name || 'image'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = removedBgUrl || originalUrl || '';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full flex flex-col overflow-hidden shadow-2xl h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
           <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-purple-600"/> AI Background Remover Tool</h3>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-300 transition"><X size={20} /></button>
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-auto bg-gray-100 dark:bg-slate-900 gap-6">
          {!originalUrl ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-8">
               <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
                 <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center border border-blue-100 dark:border-blue-900">
                    <UploadCloud size={32} />
                 </div>
                 <div className="text-center">
                   <p className="text-lg font-bold text-gray-700 dark:text-slate-200">Upload Photo to Remove BG</p>
                   <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">JPEG, PNG, WEBP</p>
                 </div>
                 <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleUpload} />
               </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
               <div className="flex-1 relative border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMHViIi8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZmZmZiIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmZmZmZmYiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2YwZjB1YiIvPjwvc3ZnPg==')] bg-white dark:bg-slate-800 flex items-center justify-center min-h-0" 
                    style={{ backgroundColor: bgColor !== 'transparent' ? bgColor : undefined }}>
                 {currentPreview && (
                   <img src={currentPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                 )}
                 {isProcessing && (
                   <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 space-y-4">
                     <RotateCw className="w-10 h-10 text-blue-600 animate-spin" />
                     <p className="text-sm font-bold text-blue-800 dark:text-blue-200 bg-white/80 dark:bg-black/80 px-4 py-2 rounded-lg backdrop-blur-md">AI Background Removal in Progress...</p>
                   </div>
                 )}
                 {errorMsg && (
                   <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-black/80">
                     <p className="text-red-600 font-bold px-4 py-2 bg-red-50 dark:bg-red-900/50 rounded-lg border border-red-200 dark:border-red-800">{errorMsg}</p>
                   </div>
                 )}
               </div>

               <div className="flex items-center flex-wrap gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
                  <div className="flex-1 flex items-center gap-3 min-w-[200px]">
                     <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Background Color:</span>
                     <div className="flex items-center gap-2">
                       <input type="color" value={bgColor === 'transparent' ? '#ffffff' : bgColor} onChange={e => setBgColor(e.target.value)} disabled={bgColor === 'transparent'} className="w-8 h-8 rounded cursor-pointer shrink-0 border-0 p-0" />
                       <label className="flex items-center gap-1.5 cursor-pointer ml-2 bg-gray-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600">
                         <input type="checkbox" checked={bgColor === 'transparent'} onChange={e => setBgColor(e.target.checked ? 'transparent' : '#ffffff')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                         <span className="text-xs font-bold text-gray-600 dark:text-slate-200">Transparent</span>
                       </label>
                     </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                     <button onClick={() => { setFile(null); setOriginalUrl(null); setRemovedBgUrl(null); }} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition flex-1 sm:flex-none">Upload New</button>
                     <button onClick={handleDownload} disabled={isProcessing || (!removedBgUrl && !originalUrl)} className="px-4 py-2 text-sm font-bold text-white dark:text-slate-100 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition flex items-center justify-center gap-2 flex-1 sm:flex-none"><Download size={16} /> Download</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const [images, _setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const historyRef = useRef<ImageItem[][]>([[]]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const setImages = (action: React.SetStateAction<ImageItem[]>) => {
    _setImages(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next !== prev) {
         historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
         historyRef.current.push(next);
         historyIndexRef.current += 1;
         setTimeout(updateUndoRedoState, 0);
      }
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      _setImages(historyRef.current[historyIndexRef.current]);
      updateUndoRedoState();
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      _setImages(historyRef.current[historyIndexRef.current]);
      updateUndoRedoState();
    }
  };

  const [watermark, setWatermark] = useState(false);
  const [globalObjectFit, setGlobalObjectFit] = useState<'fill' | 'cover'>('fill');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [activeLayoutId, setActiveLayoutId] = useState<string>('2x2');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const [multiplyId, setMultiplyId] = useState<string | null>(null);
  const [copiedSettings, setCopiedSettings] = useState<Partial<ImageItem> | null>(null);
  const [showEmptyPage, setShowEmptyPage] = useState<boolean>(true);
  const [customRowGap, setCustomRowGap] = useState<number | null>(null);
  const [customColGap, setCustomColGap] = useState<number | null>(null);
  const [showBgRemoverTool, setShowBgRemoverTool] = useState(false);
  const [showAlbumDesigner, setShowAlbumDesigner] = useState(false);
  const [showA3Designer, setShowA3Designer] = useState(false);

  // User Opinion States
  const [opinions, setOpinions] = useState<{ id: string; name: string; rating: number; text: string; date: string }[]>(() => {
    const saved = localStorage.getItem('printmaster_opinions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: '1', name: 'Rahul Sharma (Delhi)', rating: 5, text: 'PrintMaster is incredibly fast! I created a passport photo page in just 10 seconds. The local printing layout fits perfectly.', date: 'May 19, 2026' },
      { id: '2', name: 'Pooja Verma (Mumbai)', rating: 5, text: 'A3 Page Designer is amazing. The Maroon Shubh Vivah template and gold gradients look very professional. Clients loved the results.', date: 'May 18, 2026' },
      { id: '3', name: 'Karan Malhotra (Kolkata)', rating: 4, text: 'Great application! The new update with manual border adjustments and opacity controls gives full editing freedom.', date: 'May 17, 2026' }
    ];
  });
  const [opinionName, setOpinionName] = useState('');
  const [opinionText, setOpinionText] = useState('');
  const [opinionRating, setOpinionRating] = useState(5);

  const handleOpinionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opinionName.trim() || !opinionText.trim()) return;
    const newOpinion = {
      id: crypto.randomUUID(),
      name: opinionName.trim(),
      rating: opinionRating,
      text: opinionText.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    const updated = [newOpinion, ...opinions];
    setOpinions(updated);
    localStorage.setItem('printmaster_opinions', JSON.stringify(updated));
    setOpinionName('');
    setOpinionText('');
    setOpinionRating(5);
  };

  const [globalEnhancements, setGlobalEnhancements] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    threshold: 0,
    removeBg: 0,
    bgColor: '#FFFFFF'
  });

  const processImageSettings = async (item: ImageItem, settings: any) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.bgRemovedUrl || item.originalUrl || item.url;
    
    await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => resolve(null);
    });
    
    if (!ctx || !img.naturalWidth) return null;
    
    let drawX = 0, drawY = 0, drawW = img.naturalWidth, drawH = img.naturalHeight;
    let canvasW = img.naturalWidth;
    let canvasH = img.naturalHeight;

    if (item.lastCrop && item.lastCrop.width > 0 && item.lastCrop.height > 0) {
       if (item.lastCrop.unit === '%') {
         drawX = (item.lastCrop.x / 100) * img.naturalWidth;
         drawY = (item.lastCrop.y / 100) * img.naturalHeight;
         drawW = (item.lastCrop.width / 100) * img.naturalWidth;
         drawH = (item.lastCrop.height / 100) * img.naturalHeight;
       } else {
         drawX = item.lastCrop.x;
         drawY = item.lastCrop.y;
         drawW = item.lastCrop.width;
         drawH = item.lastCrop.height;
       }
       canvasW = drawW;
       canvasH = drawH;
    }

    canvas.width = canvasW;
    canvas.height = canvasH;
    
    // Fill with background color unless we are making it transparent (removeBg threshold slider > 0 or "transparent" selected)
    if (settings.removeBg <= 0 && settings.bgColor !== 'transparent') {
       ctx.fillStyle = settings.bgColor || '#FFFFFF';
       ctx.fillRect(0, 0, canvasW, canvasH);
    }
    
    ctx.drawImage(img, drawX, drawY, drawW, drawH, 0, 0, canvasW, canvasH);
    
    applyImageFilters(ctx, canvas, settings);
    
    if (settings.removeBg > 0 || settings.bgColor === 'transparent') {
      return canvas.toDataURL('image/png');
    } else {
      return canvas.toDataURL('image/jpeg', 0.98);
    }
  };

  const debouncedEnhanceSelected = useRef(
    debounce(async (id: string, item: ImageItem, settings: any) => {
      const newUrl = await processImageSettings(item, settings);
      if (newUrl) {
         setImages(prev => prev.map(img => img.id === id ? { ...img, url: newUrl } : img));
      }
    }, 100)
  ).current;

  const handleGlobalEnhancements = (key: string, value: number | string) => {
    const newSettings = { ...globalEnhancements, [key]: value };
    setGlobalEnhancements(newSettings);
    
    if (selectedImageId) {
      const selectedImage = images.find(img => img.id === selectedImageId);
      if (selectedImage) {
        debouncedEnhanceSelected(selectedImageId, selectedImage, newSettings);
      }
    }
  };

  const handleRemoveBgAI = async () => {
    if (!selectedImageId) return;
    const selectedItem = images.find(img => img.id === selectedImageId);
    if (!selectedItem) return;

    if (selectedItem.bgRemovedUrl) {
      setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, bgRemovedUrl: undefined } : img));
      setTimeout(() => {
        const item = images.find(img => img.id === selectedImageId);
        if (item) debouncedEnhanceSelected(selectedImageId, { ...item, bgRemovedUrl: undefined }, globalEnhancements);
      }, 10);
      return;
    }

    setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, isRemovingBg: true } : img));
    try {
      const srcUrl = selectedItem.originalUrl || selectedItem.url;
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(srcUrl, { 
        model: "isnet_quint8",
        progress: () => {} 
      });
      const bgRemovedUrl = URL.createObjectURL(blob);
      setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, bgRemovedUrl, isRemovingBg: false } : img));
      
      setTimeout(() => {
        const item = images.find(img => img.id === selectedImageId);
        if (item) debouncedEnhanceSelected(selectedImageId, { ...item, bgRemovedUrl }, globalEnhancements);
      }, 10);

    } catch (e) {
      console.error(e);
      alert('Failed to remove background.');
      setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, isRemovingBg: false } : img));
    }
  };

  const [isEnhancing, setIsEnhancing] = useState(false);

  const applyEnhancementsGlobally = async () => {
    setIsEnhancing(true);
    const newImages = [...images];
    
    try {
      for(let i=0; i<newImages.length; i++) {
          const item = newImages[i];
          const newUrl = await processImageSettings(item, globalEnhancements);
          if (newUrl) {
            newImages[i] = { ...item, url: newUrl, originalUrl: item.originalUrl || item.url };
          }
      }
      setImages(newImages);
    } catch (e) {
      console.error("Enhancement failed:", e);
      alert("Failed to apply enhancements: " + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsEnhancing(false);
    }
  };
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDpi, setPdfDpi] = useState<number>(600);
  const [pdfZoom, setPdfZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopySettings = (item: ImageItem) => {
    setCopiedSettings({
      customWidth: item.customWidth,
      customHeight: item.customHeight,
      rotation: item.rotation,
      objectFit: item.objectFit,
      centerInRow: item.centerInRow,
      roundedCorners: item.roundedCorners,
    });
  };

  const handlePasteSettings = (id: string) => {
    if (copiedSettings) {
      setImages(prev => prev.map(img => img.id === id ? { ...img, ...copiedSettings } : img));
    }
  };

  const handleMoveToFirst = (id: string) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx <= 0) return prev;
      const newImages = [...prev];
      const [item] = newImages.splice(idx, 1);
      newImages.unshift(item);
      return newImages;
    });
  };

  const handleMoveToLast = (id: string) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const newImages = [...prev];
      const [item] = newImages.splice(idx, 1);
      newImages.push(item);
      return newImages;
    });
  };

  const activeLayout = ALL_LAYOUTS.find(l => l.id === activeLayoutId) || ALL_LAYOUTS[0];

  const handleGlobalFitChange = (fit: 'fill' | 'cover') => {
    setGlobalObjectFit(fit);
    setImages(prev => prev.map(img => ({ ...img, objectFit: fit })));
  };

  useEffect(() => {
    setShowEmptyPage(true);
  }, [images.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const processFiles = async (files: File[]) => {
    const results = await Promise.all(files.map(async file => {
      let urls: string[] = [];
      if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = await import('pdfjs-dist');
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) {
              await page.render({ canvasContext: context, viewport } as any).promise;
              urls.push(canvas.toDataURL('image/jpeg', 0.9));
            }
          }
        } catch (error) {
          console.error("Error parsing PDF:", error);
        }
      } else {
        urls.push(URL.createObjectURL(file));
      }

      let fileImages: ImageItem[] = [];
      for (const url of urls) {
        if (activeLayoutId === 'aadhar') {
          const extracted = await extractAadharCards(url);
          if (extracted) {
             fileImages.push({
               id: crypto.randomUUID(), url: extracted.frontUrl, originalUrl: extracted.originalUrl, lastCrop: extracted.frontCrop, rotation: 0, objectFit: globalObjectFit, orientation: 'landscape', roundedCorners: true
             });
             fileImages.push({
               id: crypto.randomUUID(), url: extracted.backUrl, originalUrl: extracted.originalUrl, lastCrop: extracted.backCrop, rotation: 0, objectFit: globalObjectFit, orientation: 'landscape', roundedCorners: true
             });
             break;
          }
        }
        
        fileImages.push(await new Promise<ImageItem>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({
            id: crypto.randomUUID(), url, originalUrl: url, rotation: 0, objectFit: globalObjectFit, orientation: img.width > img.height ? 'landscape' : 'portrait'
          });
          img.onerror = () => resolve({
            id: crypto.randomUUID(), url, originalUrl: url, rotation: 0, objectFit: globalObjectFit, orientation: 'portrait'
          });
          img.src = url;
        }));
      }
      return fileImages;
    }));
    return results.flat();
  };

  const isProcessingUploadRef = useRef(false);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    if (isProcessingUploadRef.current) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      isProcessingUploadRef.current = true;
      try {
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(file => 
          file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || 
          (activeLayoutId === 'aadhar' && file.type === 'application/pdf')
        );
        
        let newImages = await processFiles(files);
        if (activeLayoutId === 'passport') {
          const multipliedImages: ImageItem[] = [];
          for (const img of newImages) {
            for (let i = 0; i < 6; i++) {
              multipliedImages.push({ ...img, id: crypto.randomUUID() });
            }
          }
          newImages = multipliedImages;
        }
        setImages((prev) => [...prev, ...newImages]);
      } finally {
        isProcessingUploadRef.current = false;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles) return;
    
    if (isProcessingUploadRef.current) return;
    isProcessingUploadRef.current = true;
    
    try {
      const files = (Array.from(rawFiles) as File[]).filter(file => 
        file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || 
        (activeLayoutId === 'aadhar' && file.type === 'application/pdf')
      );

      let newImages = await processFiles(files);

      if (replaceId && newImages.length > 0) {
        // Replace specific image
        setImages(prev => prev.map(img => {
          if (img.id === replaceId) {
            URL.revokeObjectURL(img.url); // cleanup old
            return newImages[0];
          }
          return img;
        }).concat(newImages.slice(1))); // Append any extra uploaded files
      } else {
        if (activeLayoutId === 'passport') {
          const multipliedImages: ImageItem[] = [];
          for (const img of newImages) {
            for (let i = 0; i < 6; i++) {
              multipliedImages.push({ ...img, id: crypto.randomUUID() });
            }
          }
          newImages = multipliedImages;
        }
        setImages((prev) => [...prev, ...newImages]);
      }
      
      setReplaceId(null);
    } finally {
      isProcessingUploadRef.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter(i => i.id !== id);
    });
  };

  const triggerReplace = (id: string) => {
    setReplaceId(id);
    fileInputRef.current?.click();
  };

  const triggerUpload = () => {
    setReplaceId(null);
    fileInputRef.current?.click();
  };

  const clearImages = (e: React.MouseEvent) => {
    e.preventDefault();
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
  };

  const contentRef = useRef<HTMLDivElement>(null);

  const downloadPdf = async () => {
    if (images.length === 0) return;
    
    // Deselect any selected image before PDF generation so the selection ring is removed
    setSelectedImageId(null);
    
    // Wait a moment for React to re-render without the selection rings
    await new Promise(resolve => setTimeout(resolve, 150));

    setIsGeneratingPdf(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [8.27, 11.69] // A4 size
      });

      const pagesElements = document.querySelectorAll('.print-page');
      
      for (let i = 0; i < pagesElements.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const originalPage = pagesElements[i] as HTMLElement;
        const clonedNode = originalPage.cloneNode(true) as HTMLElement;
        
        // Ensure no-print elements are hidden
        const noPrintElements = clonedNode.querySelectorAll('.no-print');
        noPrintElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        // Set fixed isolated styles to bypass viewport/scroll issues
        Object.assign(clonedNode.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          zIndex: '-9999',
          transform: 'none',
          padding: '0.3in',
          width: '8.27in',
          height: '11.69in',
          backgroundColor: 'white'
        });

        document.body.appendChild(clonedNode);
        
        try {
          // Standard browser DPI is 96.
          const scale = pdfDpi / 96;
          const imgData = await domtoimage.toJpeg(clonedNode, {
            quality: 0.95,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: clonedNode.offsetWidth + 'px',
              height: clonedNode.offsetHeight + 'px'
            },
            width: clonedNode.offsetWidth * scale,
            height: clonedNode.offsetHeight * scale
          });
          
          pdf.addImage(imgData, 'JPEG', 0, 0, 8.27, 11.69);
        } finally {
          document.body.removeChild(clonedNode);
        }
      }
      
      pdf.save(`photos_document_${Date.now()}.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const printDocument = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (images.length === 0) return;
    
    // Deselect any selected image before printing
    setSelectedImageId(null);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      window.print();
    } catch (error) {
      console.error(error);
      alert('Printing is currently blocked by your browser. Please try using "Download PDF" instead, or open the app in a new tab.');
    }
  };

  const pages: ImageItem[][] = [];
  let currentPage: ImageItem[] = [];
  let currentY = 0;
  let currentX = 0;
  let currentRowHeight = 0;

  const contentW = 8.27 - 0.6 + 0.05; // 7.67in + epsilon
  const contentH = 11.69 - 0.6 + 0.05; // 11.09in + epsilon
  
  const parseInches = (val: string | undefined, defaultVal: string) => {
    let v = parseFloat(String(val || defaultVal).replace('in', ''));
    if (isNaN(v)) v = 0;
    return v;
  };

  const colGap = customColGap !== null ? customColGap : parseInches(activeLayout.colGap, '0');
  const rowGap = customRowGap !== null ? customRowGap : parseInches(activeLayout.rowGap, '0');

  images.forEach(img => {
    const autoDimm = () => {
      const wVal = parseFloat(activeLayout.w);
      const hVal = parseFloat(activeLayout.h);
      const maxDim = Math.max(wVal, hVal) + 'in';
      const minDim = Math.min(wVal, hVal) + 'in';

      if (img.orientation === 'landscape') {
        if (activeLayout.id === '2x2') {
          return { w: '7.6in', h: '3in' };
        }
        return { w: maxDim, h: minDim };
      }
      
      return { w: minDim, h: maxDim };
    };
    
    const autoSize = autoDimm();
    const w = parseInches(img.customWidth, autoSize.w);
    const h = parseInches(img.customHeight, autoSize.h);

    if (currentX + w > contentW && currentX > 0) {
      currentX = 0;
      currentY += currentRowHeight + rowGap;
      currentRowHeight = 0;
    }

    if (currentY + h > contentH && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentX = 0;
      currentY = 0;
      currentRowHeight = 0;
    }

    currentPage.push(img);
    currentX += w + colGap;
    currentRowHeight = Math.max(currentRowHeight, h);
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Automatically add an empty page if the last page cannot fit a default slot
  if (images.length > 0 && showEmptyPage) {
     const lastPage = pages[pages.length - 1] || [];
     const getAutoDimm = () => {
       const wVal = parseFloat(activeLayout.w);
       const hVal = parseFloat(activeLayout.h);
       const maxDim = Math.max(wVal, hVal) + 'in';
       const minDim = Math.min(wVal, hVal) + 'in';

       // For the ghost boxes, just assume portrait for visual representation, 
       // but if there are other images, maybe use their orientation? 
       // Sticking to min/max for now!
       return { w: minDim, h: maxDim };
     };
     const autoSize = getAutoDimm();
     const ghostW = parseInches(autoSize.w, '0');
     const ghostH = parseInches(autoSize.h, '0');
     
     let testX = currentX;
     let testY = currentY;
     let testRowH = currentRowHeight;

     if (testX + ghostW > contentW && testX > 0) {
       testX = 0;
       testY += testRowH + rowGap;
     }

     if (testY + ghostH > contentH && lastPage.length > 0) {
       pages.push([]);
     }
  }

  const displayPages = pages.length > 0 ? pages : [];

  return (
    <div className="flex flex-col md:flex-row bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 min-h-[100dvh] md:h-[100dvh] overflow-x-hidden md:overflow-hidden font-sans print:block print:h-auto print:bg-white print:overflow-visible transition-colors duration-500 relative">
      {/* Decorative Background Blobs for Glassmorphism */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-500/20 dark:bg-violet-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDuration: '10s' }}></div>
      </div>

      {/* Sidebar */}
      <aside className="no-print w-full md:w-[320px] bg-white/70 dark:bg-slate-800/60 backdrop-blur-2xl border-b md:border-b-0 md:border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col h-auto md:h-full shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-colors duration-500">
        {/* Header */}
        <div className="h-16 flex border-b border-slate-200/50 dark:border-slate-700/50 items-center justify-between px-5 shrink-0 transition-colors duration-500 bg-white/40 dark:bg-transparent backdrop-blur-md">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 group-active:scale-95 transition-all duration-300">
              <Printer size={18} strokeWidth={2.5} />
            </div>
            <h1 className="font-bold text-[18px] text-slate-900 dark:text-slate-100 tracking-tight">Print<span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">Master</span> <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md ml-1 border border-indigo-200 dark:border-indigo-800/50">A4</span></h1>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm border border-slate-200/50 dark:border-slate-600/50"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Scrollable Sidebar Content */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-5 flex flex-col gap-8">
            
            {/* Upload Area */}
            <div 
              className={`border-2 border-dashed ${isDraggingFile ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.02]' : 'border-gray-300/70 dark:border-slate-600/70 bg-white/50 dark:bg-slate-800/40'} rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-violet-50/50 hover:border-violet-400 dark:hover:bg-violet-900/10 dark:hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 group relative overflow-hidden backdrop-blur-sm`}
              onClick={triggerUpload}
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onDrop={handleFileDrop}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className={`w-14 h-14 ${isDraggingFile ? 'bg-violet-100 dark:bg-violet-900/50' : 'bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40'} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-active:scale-95 transition-all duration-300 shadow-sm border border-violet-200/50 dark:border-violet-700/30`}>
                <UploadCloud className={`${isDraggingFile ? 'text-violet-600 dark:text-violet-400' : 'text-violet-600 dark:text-violet-400'} w-7 h-7`} />
              </div>
              <span className="font-bold text-gray-800 dark:text-gray-200 text-[15px]">Upload Documents</span>
              <span className="text-[13px] text-gray-400 dark:text-gray-500 dark:text-slate-300 mt-1 font-medium">Drag & Drop or Click to browse</span>
              <input 
                type="file" 
                multiple 
                accept={activeLayoutId === 'aadhar' ? "image/jpeg, image/png, image/webp, application/pdf" : "image/jpeg, image/png, image/webp"}
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).value = ''; }}
              />
            </div>

            {/* Tools Area */}
            <div className="flex flex-col gap-1.5">
              {/* Auto set image in PDF */}
              <div>
                <button
                  onClick={() => setActiveLayoutId(AUTO_LAYOUT.id)}
                  className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                    activeLayoutId === AUTO_LAYOUT.id 
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white dark:text-slate-100 border-transparent shadow-lg shadow-violet-500/25' 
                      : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 shadow-sm backdrop-blur-sm'
                  }`}
                >
                  <AUTO_LAYOUT.icon className={`w-5 h-5 ${activeLayoutId === AUTO_LAYOUT.id ? 'text-white' : 'text-emerald-500 dark:text-emerald-400'}`} strokeWidth={2.5} />
                  <span className="text-[13px] font-bold">{AUTO_LAYOUT.name}</span>
                </button>
              </div>

              {/* AI Background Remover Separate Tool */}
              <div>
                <button
                  onClick={() => setShowBgRemoverTool(true)}
                  className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-white/60 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 shadow-sm backdrop-blur-sm`}
                >
                  <Wand2 className="w-5 h-5 text-rose-500 dark:text-rose-400" strokeWidth={2.5} />
                  <span className="text-[13px] font-bold">AI Background Remover</span>
                </button>
              </div>

              {/* Photo Album Designer Tool */}
              <div>
                <button
                  onClick={() => setShowAlbumDesigner(true)}
                  className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-white/60 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 shadow-sm backdrop-blur-sm`}
                >
                  <Layers className="w-5 h-5 text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                  <span className="text-[13px] font-bold">Smart Photo Album</span>
                </button>
              </div>

              {/* A3 Page Designer Tool */}
              <div>
                <button
                  onClick={() => setShowA3Designer(true)}
                  className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-white/60 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 shadow-sm backdrop-blur-sm`}
                >
                  <Sparkles className="w-5 h-5 text-violet-500 dark:text-violet-400" strokeWidth={2.5} />
                  <span className="text-[13px] font-bold">A3 Page Designer</span>
                </button>
              </div>
            </div>

            {/* Layout More Templates */}
            <div>
              <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-3.5 h-3.5" /> Layout More Template
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {LAYOUT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setActiveLayoutId(tpl.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-sm ${
                      activeLayoutId === tpl.id 
                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white dark:text-slate-100 border-transparent shadow-lg shadow-violet-500/25' 
                        : 'bg-white/60 text-slate-600 dark:text-slate-300 border-slate-200/60 hover:bg-white hover:text-slate-800 dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:bg-slate-700 dark:hover:text-slate-100 shadow-sm'
                    }`}
                  >
                    <tpl.icon className={`w-[24px] h-[24px] mb-2.5 ${activeLayoutId === tpl.id ? 'text-white' : tpl.color} transition-colors`} strokeWidth={2.5} />
                    <span className="text-[11.5px] font-bold">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Enhancements */}
            <div id="enhance-documents" className={`transition-all duration-300 ${selectedImageId ? 'ring-2 ring-indigo-500 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
              <h2 className="text-[11px] font-bold text-gray-400 dark:text-slate-500 mb-3 px-2 uppercase tracking-wider flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5" /> Enhance Documents
              </h2>
              <div className="flex flex-col gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                
                <div className="space-y-3">
                  {/* Basic Adjustments */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-slate-100">
                      <span>Brightness</span>
                      <span>{globalEnhancements.brightness}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleGlobalEnhancements('brightness', Math.max(-100, globalEnhancements.brightness - 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Minus className="w-3 h-3" /></button>
                       <input type="range" min="-100" max="100" value={globalEnhancements.brightness} onChange={e => handleGlobalEnhancements('brightness', Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                       <button onClick={() => handleGlobalEnhancements('brightness', Math.min(100, globalEnhancements.brightness + 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-slate-100">
                      <span>Contrast</span>
                      <span>{globalEnhancements.contrast}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleGlobalEnhancements('contrast', Math.max(-100, globalEnhancements.contrast - 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Minus className="w-3 h-3" /></button>
                       <input type="range" min="-100" max="100" value={globalEnhancements.contrast} onChange={e => handleGlobalEnhancements('contrast', Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                       <button onClick={() => handleGlobalEnhancements('contrast', Math.min(100, globalEnhancements.contrast + 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Scan Mode / B&W */}
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-slate-100">
                      <span>B&W Scan (Threshold)</span>
                      <span>{globalEnhancements.threshold === 0 ? 'Off' : globalEnhancements.threshold}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleGlobalEnhancements('threshold', Math.max(0, globalEnhancements.threshold - 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Minus className="w-3 h-3" /></button>
                       <input type="range" min="0" max="255" value={globalEnhancements.threshold} onChange={e => handleGlobalEnhancements('threshold', Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                       <button onClick={() => handleGlobalEnhancements('threshold', Math.min(255, globalEnhancements.threshold + 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-slate-100">
                      <span>Remove BG (Color Key)</span>
                      <span>{globalEnhancements.removeBg === 0 ? 'Off' : globalEnhancements.removeBg}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleGlobalEnhancements('removeBg', Math.max(0, globalEnhancements.removeBg - 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Minus className="w-3 h-3" /></button>
                       <input type="range" min="0" max="255" value={globalEnhancements.removeBg} onChange={e => handleGlobalEnhancements('removeBg', Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                       <button onClick={() => handleGlobalEnhancements('removeBg', Math.min(255, globalEnhancements.removeBg + 1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-gray-600 dark:text-slate-100">
                      <span>AI Background Remove</span>
                      <button 
                         onClick={handleRemoveBgAI}
                         disabled={!selectedImageId || images.find(i => i.id === selectedImageId)?.isRemovingBg}
                         className={`px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded ${(!selectedImageId) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-200 hover:text-blue-800 transition uppercase tracking-wider text-[10px] font-bold'}`}
                      >
                         {images.find(img => img.id === selectedImageId)?.isRemovingBg ? (
                            <RotateCw className="w-3 h-3 animate-spin mx-auto" />
                         ) : images.find(img => img.id === selectedImageId)?.bgRemovedUrl ? (
                            "Revert"
                         ) : (
                            "Apply to Selected"
                         )}
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-semibold text-gray-600 dark:text-slate-100">
                      <span>Background Color</span>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={globalEnhancements.bgColor === 'transparent' ? '#ffffff' : globalEnhancements.bgColor} onChange={e => handleGlobalEnhancements('bgColor', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer overflow-hidden" disabled={globalEnhancements.bgColor === 'transparent'} />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={globalEnhancements.bgColor === 'transparent'} onChange={e => handleGlobalEnhancements('bgColor', e.target.checked ? 'transparent' : '#FFFFFF')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className="text-[10px]">Transparent</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                  <button 
                    onClick={() => {
                      const defaults = { brightness: 0, contrast: 0, saturation: 0, threshold: 0, removeBg: 0, bgColor: '#FFFFFF' };
                      setGlobalEnhancements(defaults);
                      if (selectedImageId) {
                        const selectedImage = images.find(img => img.id === selectedImageId);
                        if (selectedImage) {
                          debouncedEnhanceSelected(selectedImageId, selectedImage, defaults);
                        }
                      }
                    }}
                    className="flex-1 py-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-100 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md transition flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button 
                    onClick={applyEnhancementsGlobally}
                    disabled={isEnhancing || images.length === 0}
                    className={`flex-[2] py-1.5 text-[11px] font-bold text-white dark:text-slate-100 rounded-md transition flex items-center justify-center gap-1 shadow-sm
                      ${isEnhancing || images.length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isEnhancing ? (
                      <RotateCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    {isEnhancing ? 'Processing...' : 'Apply to All'}
                  </button>
                </div>
              </div>
            </div>

            {/* Print Tools */}
            <div>
              <h2 className="text-[11px] font-bold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" /> Print Tools
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[13px] font-bold text-gray-700 dark:text-slate-200">Self-Attested Overlay</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={watermark} onChange={e => setWatermark(e.target.checked)} />
                    <div className="w-10 h-[22px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[13px] font-bold text-gray-700 dark:text-slate-200">Image Fit Mode</span>
                  <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                    <button 
                      onClick={() => handleGlobalFitChange('fill')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition ${globalObjectFit === 'fill' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-300 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                      Stretch
                    </button>
                    <button 
                      onClick={() => handleGlobalFitChange('cover')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition ${globalObjectFit === 'cover' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-300 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                      Crop
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mt-1">
                  <span className="text-[13px] font-bold text-gray-700 dark:text-slate-200 mb-1">Photo Spacing (inches)</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-gray-500 dark:text-slate-300 dark:text-slate-400 mb-1 block">Horizontal</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        min="0"
                        max="1.1"
                        value={customColGap !== null ? customColGap : parseFloat(activeLayout.colGap || '0')} 
                        onChange={(e) => setCustomColGap(parseFloat(e.target.value))} 
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-xs outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-gray-500 dark:text-slate-300 dark:text-slate-400 mb-1 block">Vertical</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        min="0"
                        max="1.1"
                        value={customRowGap !== null ? customRowGap : parseFloat(activeLayout.rowGap || '0')} 
                        onChange={(e) => setCustomRowGap(parseFloat(e.target.value))} 
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-xs outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                  {(customRowGap !== null || customColGap !== null) && (
                    <button onClick={() => { setCustomRowGap(null); setCustomColGap(null); }} className="text-[10.5px] text-blue-600 font-bold mt-1.5 text-right w-full hover:underline">Reset Spacing</button>
                  )}
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex items-center gap-2 mb-1.5 text-blue-700 dark:text-blue-400">
                <Lightbulb className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-medium">
                Use Gradient/Threshold filters to highlight document borders for cleaner scanning and printing.
              </p>
            </div>
            
          </div>
        </div>

        {/* Download Footer */}
        <div className="p-5 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-100">PDF Quality</label>
              <select 
                value={pdfDpi} 
                onChange={(e) => setPdfDpi(Number(e.target.value))}
                className="bg-slate-100/80 dark:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 text-[12px] font-semibold text-slate-800 dark:text-slate-100 py-1.5 pl-2.5 pr-7 rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-violet-500/30 transition-all backdrop-blur-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22currentColor%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
              >
                <option value={300}>300 DPI (Standard)</option>
                <option value={600}>600 DPI (High)</option>
                <option value={800}>800 DPI (Very High)</option>
                <option value={1200}>1200 DPI (Ultra)</option>
              </select>
            </div>
            <button 
              onClick={downloadPdf} 
              disabled={images.length === 0 || isGeneratingPdf}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white dark:text-slate-100 rounded-2xl font-black text-[14px] hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-800 dark:disabled:text-slate-500 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-violet-500/25 disabled:shadow-none"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-[18px] h-[18px]" strokeWidth={3} />
                  Download PDF
                </>
              )}
            </button>
            <button 
              onClick={printDocument} 
              disabled={images.length === 0}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-white/80 text-slate-700 border border-slate-300/60 rounded-xl font-bold text-[13px] hover:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-sm dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-600/60 dark:hover:bg-slate-700/80 dark:disabled:bg-slate-800/50 dark:disabled:border-slate-700/50 dark:disabled:text-slate-500 backdrop-blur-sm"
            >
              <Printer className="w-[16px] h-[16px]" strokeWidth={2.5} />
              Print directly
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-[60vh] md:h-full overflow-x-auto overflow-y-auto print:block print:h-auto print:overflow-visible print:w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* Header */}
        <header className="no-print min-h-16 py-3 flex flex-wrap items-center justify-between px-4 md:px-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shrink-0 sticky top-0 z-10 w-full gap-3 transition-colors duration-500 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <h2 className="font-bold text-[15px] text-slate-800 dark:text-slate-100 hidden sm:block bg-white/50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">Live Canvas Preview</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-lg border border-indigo-200/50 dark:border-indigo-700/50 shadow-sm transition-colors duration-300 backdrop-blur-sm">{displayPages.length} Page{displayPages.length !== 1 ? 's' : ''}</span>
              <span className="px-3 py-1.5 bg-violet-50/80 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-bold rounded-lg border border-violet-200/50 dark:border-violet-700/50 shadow-sm transition-colors duration-300 backdrop-blur-sm">{images.length} Image{images.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center gap-1.5 border-l border-slate-200/70 dark:border-slate-700/70 pl-2 md:pl-4 ml-1 md:ml-0">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`p-2 rounded-xl transition-all duration-300 shadow-sm border border-transparent ${
                  canUndo 
                    ? 'text-slate-600 bg-white hover:bg-slate-50 border-slate-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700' 
                    : 'text-slate-300 bg-white/50 dark:bg-slate-800/50 dark:text-slate-600 cursor-not-allowed border-slate-100 dark:border-slate-800'
                }`}
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-2 rounded-xl transition-all duration-300 shadow-sm border border-transparent ${
                  canRedo 
                    ? 'text-slate-600 bg-white hover:bg-slate-50 border-slate-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700' 
                    : 'text-slate-300 bg-white/50 dark:bg-slate-800/50 dark:text-slate-600 cursor-not-allowed border-slate-100 dark:border-slate-800'
                }`}
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {images.length > 0 && (
              <>
                <button 
                  onClick={triggerUpload} 
                  className="text-[13px] font-bold text-white dark:text-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 px-3 md:px-4 py-2 rounded-xl shadow-md shadow-violet-500/20 border-transparent"
                >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Photos</span><span className="sm:hidden">Add</span>
                </button>
                {!showEmptyPage && (
                  <button 
                    onClick={() => setShowEmptyPage(true)} 
                    className="text-[13px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 flex items-center gap-1.5 transition px-3 md:px-4 py-1.5 rounded-lg shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Blank Page</span><span className="sm:hidden">Add Page</span>
                  </button>
                )}
                <button onClick={clearImages} className="text-[13px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition px-3 md:px-4 py-1.5 rounded-lg">
                  <Trash2 className="w-4 h-4"/> <span className="hidden sm:inline">Clear All</span><span className="sm:hidden">Clear</span>
                </button>
              </>
            )}
            <div className="hidden sm:block px-3 py-1.5 bg-white text-gray-700 text-[13px] font-bold rounded-lg border border-gray-200 shadow-sm ml-0 md:ml-2">
              100%
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <main 
          className={`flex-1 w-full p-4 sm:p-8 flex flex-col items-center gap-8 print:p-0 print:block relative ${isDraggingFile && images.length > 0 ? 'bg-blue-50/30' : ''}`}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFileDrop}
        >
          {isDraggingFile && images.length > 0 && (
            <div className="absolute inset-0 bg-blue-50/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-blue-400 border-dashed m-4 rounded-3xl pointer-events-none">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-md">
                <Download className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-blue-800 drop-shadow-sm">Drop images to add to document</h3>
            </div>
          )}
          {images.length === 0 ? (
            <div 
              className={`w-full max-w-2xl mt-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed ${isDraggingFile ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 scale-[1.02]' : 'border-slate-300 dark:border-slate-700'} p-16 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-500 hover:shadow-xl`}
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onDrop={handleFileDrop}
            >
              {isDraggingFile && (
                <div className="absolute inset-0 bg-violet-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[2.5rem]">
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 rounded-3xl flex items-center justify-center mb-4 animate-bounce shadow-inner border border-violet-200/50 dark:border-violet-700/30">
                    <Download className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-black text-violet-700 dark:text-violet-300 drop-shadow-sm tracking-tight">Drop images here</h3>
                </div>
              )}
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 rounded-3xl flex items-center justify-center mb-6 border border-violet-200/50 dark:border-violet-700/30 shadow-inner hover:scale-110 transition-transform duration-300">
                <FileUp className="w-10 h-10 text-violet-600 dark:text-violet-400" strokeWidth={2} />
              </div>
              <h3 className="text-[26px] font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">No documents yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[15.5px] mb-8 max-w-md font-medium leading-relaxed">
                Drag and drop images here, or use the "Upload Documents" button in the sidebar to begin.
              </p>
              <button 
                onClick={triggerUpload} 
                className="flex items-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white dark:text-slate-100 px-8 py-3.5 rounded-2xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-violet-500/25"
              >
                <Plus className="w-5 h-5" strokeWidth={3} /> Browse Files
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }} className="w-full flex justify-center">
                  <div ref={contentRef} className="flex flex-col items-center gap-10 w-full print:gap-0" onClick={() => setSelectedImageId(null)}>
                    {displayPages.map((pageItems, pageIndex) => (
                      <div 
                        key={pageIndex} 
                        className="print-page relative flex content-start bg-white shadow-2xl ring-1 ring-gray-900/5 print:shadow-none print:ring-0 overflow-hidden print:overflow-visible group"
                        style={{ width: '8.27in', height: '11.69in', padding: '0.3in' }}
                      >
                        {pageItems.length === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmptyPage(false);
                            }}
                            className="absolute top-4 right-4 z-10 no-print flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity border border-red-100 shadow-sm"
                            title="Delete empty page"
                          >
                            <Trash2 size={16} />
                            Delete Page
                          </button>
                        )}
                      <div className="flex flex-wrap content-start justify-start w-full" style={{ rowGap: `${rowGap}in`, columnGap: `${colGap}in` }}>
                        {pageItems.map((item) => (
                            <SortableImage 
                              key={item.id} 
                              item={item} 
                              watermark={watermark} 
                              layout={activeLayout} 
                              isSelected={selectedImageId === item.id}
                              onClick={(id, e) => { 
                                e.stopPropagation(); 
                                setSelectedImageId(id);
                                const el = document.getElementById('enhance-documents');
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                              }}
                              onRemove={removeImage} 
                              onReplace={triggerReplace} 
                              onEdit={(id) => setEditingId(id)} 
                              onCopySettings={handleCopySettings}
                              onPasteSettings={handlePasteSettings}
                              hasCopiedSettings={!!copiedSettings}
                              onMoveToFirst={handleMoveToFirst}
                              onMoveToLast={handleMoveToLast}
                              onCrop={(id) => setCroppingId(id)}
                              onMultiply={(id) => setMultiplyId(id)}
                            />
                        ))}
                        {/* Empty placeholders - only on last page to avoid overflow mess */}
                        {images.length > 0 && pageIndex === displayPages.length - 1 && Array.from({ length: Math.max(0, activeLayout.perPage - pageItems.length) }).map((_, i) => (
                          <div key={`ghost-${i}`} onClick={triggerUpload} style={{ width: activeLayout.w, height: activeLayout.h }} className="no-print border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-blue-400 rounded-sm flex flex-col items-center justify-center text-gray-400 cursor-pointer transition">
                            <ImagePlus className="w-8 h-8 mb-2 opacity-30 group-hover:text-blue-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Add Photo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          )}

          {images.length > 0 && (
            <div className="fixed bottom-6 right-6 flex items-center bg-white shadow-xl rounded-full border border-gray-200 overflow-hidden no-print z-50 print:hidden">
              <button onClick={() => setPdfZoom(z => Math.max(0.1, z - 0.1))} className="p-3 hover:bg-gray-100 text-gray-700" title="Zoom Out">
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="px-3 font-semibold text-sm text-gray-600 min-w-[3.5rem] text-center border-x border-gray-100">
                {Math.round(pdfZoom * 100)}%
              </div>
              <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.1))} className="p-3 hover:bg-gray-100 text-gray-700" title="Zoom In">
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* About & User Opinions Section (No-Print) */}
          <div className="no-print print:hidden w-full max-w-4xl mt-16 pt-12 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-12 text-slate-800 dark:text-slate-100 mb-12">
            
            {/* About / Jankari Grid */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 p-8 md:p-10 shadow-xl transition-all duration-300 hover:shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600 dark:from-violet-400 dark:to-indigo-300">About PrintMaster</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mt-0.5 font-bold">स्मार्ट प्रिंटिंग और एल्बम मेकर</p>
                </div>
              </div>
              
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                PrintMaster एक आधुनिक और शक्तिशाली वेब-आधारित प्रिंट लेआउट और फोटो एल्बम डिज़ाइनर है। यह फोटो स्टूडियो, प्रिंटर ऑपरेटरों और फ़ोटोग्राफ़रों के लिए बनाया गया है ताकि वे मिनटों में A4 और A3 साइज़ के सुंदर एल्बम, कोलाज शीट, पासपोर्ट फोटो और आवश्यक डॉक्युमेंट्स (जैसे Aadhar/PAN कार्ड) तैयार कर सकें।
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                  <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl shrink-0">
                    <Grid className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">A4 दस्तावेज़ ऑटो-फ़ॉर्मेट</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">पासपोर्ट फोटो, आधार कार्ड, पैन कार्ड और वॉलेट साइज़ प्रिंट्स को A4 पेपर पर अपने आप सटीक मार्जिन के साथ सेट करें।</p>
                  </div>
                </div>
                
                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                  <div className="p-2.5 bg-pink-100 dark:bg-pink-900/30 rounded-xl shrink-0">
                    <Layout className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">A3 एल्बम और सादी कोलाज</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">प्रीमियम ट्रेडिशनल भारतीय शादी एल्बम टेम्पलेट्स (शुभ विवाह), भव्य ग्रेडिएंट्स, बॉर्डर्स और ओपेसिटी सेटिंग्स का लाभ उठाएं।</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl shrink-0">
                    <Wand2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">AI पृष्ठभूमि हटाना (Background Removal)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">बिना किसी बाहरी सॉफ्टवेयर के, क्लाइंट-साइड वेब AI तकनीक की मदद से सीधे ब्राउज़र में ही फोटो के बैकग्राउंड को हटाएं।</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl shrink-0">
                    <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">तेज़ गति और उच्च रिज़ॉल्यूशन</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">ऑन-डिमांड लेज़ी लोडिंग और 800 DPI क्वालिटी के साथ तेज़, क्रिस्टल क्लियर पीडीएफ और जेपीईजी एक्सपोर्ट।</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Opinion/Feedback Section */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              
              {/* Form Column */}
              <div className="md:col-span-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-8 shadow-xl">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">अपना अनुभव साझा करें</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-bold">प्रोजेक्ट पर अपना फीडबैक या राय लिखें:</p>
                
                <form onSubmit={handleOpinionSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">आपका नाम</label>
                    <input 
                      type="text" 
                      value={opinionName}
                      onChange={(e) => setOpinionName(e.target.value)}
                      placeholder="जैसे: राहुल कुमार"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">रेटिंग (Rating)</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setOpinionRating(star)}
                          className="p-1 transition hover:scale-125 focus:outline-none"
                        >
                          <svg 
                            className={`w-6 h-6 ${star <= opinionRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.178 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">आपकी राय (Opinion)</label>
                    <textarea 
                      value={opinionText}
                      onChange={(e) => setOpinionText(e.target.value)}
                      placeholder="साइट के बारे में अपनी राय यहाँ लिखें..."
                      required
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    राय सबमिट करें (Submit Opinion)
                  </button>
                </form>
              </div>

              {/* Display Column */}
              <div className="md:col-span-3 flex flex-col gap-4 overflow-y-auto max-h-[390px] pr-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight flex items-center gap-2">
                  <span>उपयोगकर्ताओं की राय</span>
                  <span className="text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{opinions.length}</span>
                </h3>
                
                {opinions.map((op) => (
                  <div key={op.id} className="bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 p-5 rounded-2xl shadow-sm flex flex-col gap-2 transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{op.name}</span>
                        <div className="flex items-center">
                          {Array.from({ length: op.rating }).map((_, i) => (
                            <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{op.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{op.text}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </main>
        
        {/* Manual Config Modal */}
        {editingId && images.some(img => img.id === editingId) && (
           <ManualSettingsModal 
              item={images.find(img => img.id === editingId)!} 
              layout={activeLayout}
              onClose={() => setEditingId(null)} 
              onChange={(id, changes) => {
                 setImages(prev => prev.map(img => img.id === id ? { ...img, ...changes } : img));
              }}
              onApplyToAll={(changes) => {
                 setImages(prev => prev.map(img => ({ ...img, ...changes })));
              }}
           />
        )}
        
        {/* BgRemoverToolModal */}
        {showBgRemoverTool && <BgRemoverToolModal onClose={() => setShowBgRemoverTool(false)} />}
        {showAlbumDesigner && <AlbumDesigner onClose={() => setShowAlbumDesigner(false)} initialImages={images} />}
        {showA3Designer && <A3Designer onClose={() => setShowA3Designer(false)} initialImages={images} />}
        
        {/* Multiply Modal */}
        {multiplyId && images.some(img => img.id === multiplyId) && (
          <MultiplyModal 
            item={images.find(img => img.id === multiplyId)!}
            onClose={() => setMultiplyId(null)}
            onSave={(count) => {
               const imgToMultiply = images.find(img => img.id === multiplyId)!;
               
               setImages(prev => {
                 const copies = Array.from({ length: count }).map((_, i) => ({ 
                   ...imgToMultiply, 
                   id: i === 0 ? imgToMultiply.id : crypto.randomUUID() 
                 }));
                 // Find the first occurrence to preserve position
                 const index = prev.findIndex(img => img.originalUrl === imgToMultiply.originalUrl);
                 const others = prev.filter(img => img.originalUrl !== imgToMultiply.originalUrl);
                 
                 if (index >= 0) {
                   others.splice(index, 0, ...copies);
                   return others;
                 }
                 return [...others, ...copies];
               });
               setMultiplyId(null);
            }}
          />
        )}

        {/* Crop Modal */}
        {croppingId && images.some(img => img.id === croppingId) && (
          <CropImageModal 
            item={images.find(img => img.id === croppingId)!}
            onClose={() => setCroppingId(null)}
            onSave={(newUrl, newCrop) => {
               setImages(prev => prev.map(img => img.id === croppingId ? { ...img, url: newUrl, lastCrop: newCrop } : img));
               setCroppingId(null);
            }}
          />
        )}

        {/* Selected Image Floating Tools */}
        {selectedImageId && activeLayoutId === 'passport' && images.some(img => img.id === selectedImageId) && (
          <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[40] no-print flex flex-col gap-2 p-2 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 w-16">
            <div className="flex flex-col gap-1.5 mb-1 pb-1.5 border-b border-white/10">
              <button 
                onClick={(e) => { e.stopPropagation(); handleMoveToFirst(selectedImageId); }}
                className="flex items-center justify-center p-3 text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10 rounded-xl transition"
                title="Move to First"
              >
                <ChevronsUp className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleMoveToLast(selectedImageId); }}
                className="flex items-center justify-center p-3 text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10 rounded-xl transition"
                title="Move to Last"
              >
                <ChevronsDown className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 mb-1 pb-1.5 border-b border-white/10">
              {!!copiedSettings && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePasteSettings(selectedImageId); }}
                  className="flex items-center justify-center p-3 text-emerald-400 hover:text-emerald-300 hover:bg-white/10 rounded-xl transition"
                  title="Paste Size/Settings"
                >
                  <ClipboardPaste className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleCopySettings(images.find(img => img.id === selectedImageId)!); }}
                className="flex items-center justify-center p-3 text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10 rounded-xl transition"
                title="Copy Size/Settings"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const sourceImg = images.find(img => img.id === selectedImageId);
                  if (sourceImg) {
                    setImages(prev => prev.map(img => ({
                      ...img,
                      url: sourceImg.url,
                      originalUrl: sourceImg.originalUrl,
                      lastCrop: sourceImg.lastCrop,
                      rotation: sourceImg.rotation,
                      objectFit: sourceImg.objectFit,
                      customWidth: sourceImg.customWidth,
                      customHeight: sourceImg.customHeight,
                      centerInRow: sourceImg.centerInRow,
                      roundedCorners: sourceImg.roundedCorners,
                      orientation: sourceImg.orientation
                    })));
                  }
                }}
                className="flex items-center justify-center p-3 text-purple-400 hover:text-purple-300 hover:bg-white/10 rounded-xl transition"
                title="Apply Everything to All Photos"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); setMultiplyId(selectedImageId); }}
                className="flex items-center justify-center p-3 text-indigo-400 hover:text-indigo-300 hover:bg-white/10 rounded-xl transition"
                title="Multiply Copies"
              >
                <Layers className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setCroppingId(selectedImageId); }}
                className="flex items-center justify-center p-3 text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10 rounded-xl transition"
                title="Crop Image"
              >
                <CropIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingId(selectedImageId); }}
                className="flex items-center justify-center p-3 text-slate-300 hover:text-white dark:text-slate-100 hover:bg-white/10 rounded-xl transition"
                title="Manual Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); triggerReplace(selectedImageId); }}
                className="flex items-center justify-center p-3 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded-xl transition"
                title="Replace Photo"
              >
                <UploadCloud className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); removeImage(selectedImageId); }}
                className="flex items-center justify-center p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
                title="Remove Photo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
