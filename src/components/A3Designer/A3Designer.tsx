import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Minus, Layout, Palette, Settings, Type, Shuffle, Maximize2, 
  Trash2, X, Download, LayoutTemplate, Square, ChevronLeft, ChevronDown,
  Undo2, Redo2, ZoomIn, ZoomOut, Upload, Wand2, RotateCw, ImagePlus, UploadCloud, CropIcon, ImageIcon, SlidersHorizontal, MousePointerClick, Printer,
  ChevronsUp, ChevronsDown, ClipboardPaste, Copy, CheckCheck, Layers, FileText, Text, Eye, EyeOff, Sparkles, Move
} from 'lucide-react';
import domtoimage from 'dom-to-image';
import { removeBackground } from '@imgly/background-removal';

// Types
export interface A3Placement {
  id: string;
  type: 'photo' | 'text';
  // Position in relative percentage (0 to 100) for clean scaling
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  visible: boolean;
  
  // For photo layers
  url?: string;
  originalUrl?: string;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: string;
  
  // Photo enhancements
  filters?: {
    brightness: number;
    contrast: number;
    bwScan: number;
    removeBgVal: number;
    bgRemovedUrl?: string;
    transparentBg?: boolean;
  };
  isRemovingBg?: boolean;
  
  // For text layers
  text?: string;
  fontFamily?: string;
  fontSize?: number; // relative size factor
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: string;

  // Custom layer styling
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'double' | 'dashed' | 'dotted';
  opacity?: number;
  boxShadow?: boolean;
}

export interface A3Template {
  id: string;
  name: string;
  description: string;
  backgroundClass: string; // Tailwind bg class
  customBgStyle?: React.CSSProperties; // Detailed background graphics
  slots: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    borderRadius?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
  }[];
  texts: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
  }[];
}

// 5 Ultra Premium A3 Wedding & Collage Templates
// 14 Ultra Premium A3 Templates (5 original, 6 Love-themed, 3 Wedding-themed)
const A3_TEMPLATES: A3Template[] = [
  // Original 5
  {
    id: 'walnut-floral',
    name: 'Walnut Wedding Harmony',
    description: 'Deep brown wood texture with hand-drawn vintage ivory floral overlays',
    backgroundClass: 'bg-[#2A231E]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle at 50% 50%, rgba(68, 54, 45, 0.4) 0%, rgba(26, 20, 16, 0.9) 100%)`,
      position: 'relative'
    },
    slots: [
      { id: 'slot-1', x: 5, y: 15, w: 21, h: 56, borderRadius: '4px' },
      { id: 'slot-2', x: 28, y: 15, w: 21, h: 56, borderRadius: '4px' },
      { id: 'slot-3', x: 51, y: 15, w: 21, h: 56, borderRadius: '50% 50% 0px 0px' }, // Arched oval slot!
      { id: 'slot-4', x: 74, y: 15, w: 21, h: 56, borderRadius: '4px' }
    ],
    texts: [
      { id: 'text-1', x: 51, y: 5, w: 21, h: 8, text: 'BRIDE', fontFamily: "'Playfair Display', serif", fontSize: 2.2, color: '#D4AF37', bold: true, align: 'center' },
      { id: 'text-2', x: 28, y: 78, w: 44, h: 8, text: 'Love', fontFamily: "'Clicker Script', cursive", fontSize: 3.5, color: '#F3E5AB', italic: true, align: 'center' },
      { id: 'text-3', x: 28, y: 88, w: 44, h: 6, text: '"Love brings us together, and keeps us forever."', fontFamily: "'Montserrat', sans-serif", fontSize: 1.0, color: '#E2D6C5', align: 'center' }
    ]
  },
  {
    id: 'emerald-gold',
    name: 'Royal Velvet Emerald',
    description: 'Rich dark green velvet texture with thin luxury golden frames',
    backgroundClass: 'bg-[#0E291C]',
    customBgStyle: {
      backgroundImage: `linear-gradient(135deg, #091D13 0%, #153E2A 50%, #06170E 100%)`,
      border: '8px double #C5A059'
    },
    slots: [
      { id: 'slot-1', x: 6, y: 10, w: 40, h: 80, borderRadius: '8px' },
      { id: 'slot-2', x: 52, y: 10, w: 42, h: 36, borderRadius: '8px' },
      { id: 'slot-3', x: 52, y: 54, w: 20, h: 36, borderRadius: '8px' },
      { id: 'slot-4', x: 74, y: 54, w: 20, h: 36, borderRadius: '8px' }
    ],
    texts: [
      { id: 'text-1', x: 52, y: 48, w: 42, h: 5, text: 'BEAUTIFUL BEGINNINGS', fontFamily: "'Cinzel', serif", fontSize: 1.2, color: '#C5A059', bold: true, align: 'center' }
    ]
  },
  {
    id: 'vintage-gold-ivory',
    name: 'Vintage Cream Canvas',
    description: 'Ivory canvas texture with intricate dual gold lines and ornaments',
    backgroundClass: 'bg-[#FDFBF7]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle, #FCFAF2 60%, #F3EEE0 100%)`,
      boxShadow: 'inset 0 0 40px rgba(184, 134, 11, 0.15)'
    },
    slots: [
      { id: 'slot-1', x: 5, y: 12, w: 20, h: 76, borderRadius: '0px' },
      { id: 'slot-2', x: 28, y: 12, w: 20, h: 42, borderRadius: '0px' },
      { id: 'slot-3', x: 52, y: 12, w: 20, h: 42, borderRadius: '0px' },
      { id: 'slot-4', x: 75, y: 12, w: 20, h: 76, borderRadius: '0px' }
    ],
    texts: [
      { id: 'text-1', x: 28, y: 58, w: 44, h: 10, text: 'Engaged!', fontFamily: "'Great Vibes', cursive", fontSize: 3.8, color: '#8B6508', align: 'center' },
      { id: 'text-2', x: 28, y: 76, w: 44, h: 6, text: 'ALISHA & ARSHDEEP', fontFamily: "'Cinzel', serif", fontSize: 1.1, color: '#3A2E12', bold: true, align: 'center' }
    ]
  },
  {
    id: 'charcoal-rose',
    name: 'Sleek Charcoal & Rose',
    description: 'Modern slate dark-brushed background with geometric metallic rose-gold frames',
    backgroundClass: 'bg-[#181D26]',
    customBgStyle: {
      backgroundImage: `linear-gradient(45deg, #11141A 0%, #202733 100%)`,
    },
    slots: [
      { id: 'slot-1', x: 5, y: 8, w: 32, h: 84, borderRadius: '12px' },
      { id: 'slot-2', x: 41, y: 8, w: 18, h: 48, borderRadius: '12px' },
      { id: 'slot-3', x: 63, y: 8, w: 32, h: 48, borderRadius: '12px' },
      { id: 'slot-4', x: 41, y: 62, w: 54, h: 30, borderRadius: '12px' }
    ],
    texts: [
      { id: 'text-1', x: 41, y: 56, w: 54, h: 5, text: 'CRAFTED LOVE STORY', fontFamily: "'Montserrat', sans-serif", fontSize: 1.0, color: '#E0A899', bold: true, align: 'center' }
    ]
  },
  {
    id: 'glass-minimal',
    name: 'Glassmorphism Minimalist',
    description: 'Elegant blurred glass overlays floating on a soft violet-indigo gradient',
    backgroundClass: 'bg-[#120F24]',
    customBgStyle: {
      backgroundImage: `linear-gradient(180deg, #090616 0%, #150F33 50%, #090616 100%)`
    },
    slots: [
      { id: 'slot-1', x: 5, y: 15, w: 42, h: 33, borderRadius: '16px' },
      { id: 'slot-2', x: 5, y: 52, w: 42, h: 33, borderRadius: '16px' },
      { id: 'slot-3', x: 53, y: 15, w: 42, h: 33, borderRadius: '16px' },
      { id: 'slot-4', x: 53, y: 52, w: 42, h: 33, borderRadius: '16px' }
    ],
    texts: [
      { id: 'text-1', x: 5, y: 6, w: 90, h: 7, text: 'TOGETHER FOREVER', fontFamily: "'Cinzel', serif", fontSize: 1.5, color: '#FFFFFF', bold: true, align: 'center' }
    ]
  },

  // 6 Love Preset Designs
  {
    id: 'love-forever-red',
    name: 'Love Forever Red',
    description: 'Romantic deep crimson red gradient with heart illustrations',
    backgroundClass: 'bg-[#4A0E17]',
    customBgStyle: {
      backgroundImage: `linear-gradient(135deg, #4A0E17 0%, #1F0307 100%)`
    },
    slots: [
      { id: 'slot-1', x: 8, y: 15, w: 19, h: 65, borderRadius: '16px' },
      { id: 'slot-2', x: 29, y: 15, w: 19, h: 65, borderRadius: '16px' },
      { id: 'slot-3', x: 52, y: 15, w: 19, h: 65, borderRadius: '16px' },
      { id: 'slot-4', x: 73, y: 15, w: 19, h: 65, borderRadius: '16px' }
    ],
    texts: [
      { id: 'text-1', x: 8, y: 5, w: 84, h: 8, text: 'FOREVER', fontFamily: "'Cinzel', serif", fontSize: 2.2, color: '#FFB7C5', bold: true, align: 'center' },
      { id: 'text-2', x: 8, y: 84, w: 84, h: 10, text: 'You & Me', fontFamily: "'Clicker Script', cursive", fontSize: 3.5, color: '#FFFFFF', italic: true, align: 'center' }
    ]
  },
  {
    id: 'love-polaroid-pink',
    name: 'Polaroid Sweethearts',
    description: 'Sweet pastel rose pink grid canvas with polaroid style frames',
    backgroundClass: 'bg-[#FFD6DC]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle, #FFF0F2 0%, #FFD6DC 100%)`
    },
    slots: [
      { id: 'slot-1', x: 6, y: 15, w: 20, h: 56, borderRadius: '2px' },
      { id: 'slot-2', x: 28, y: 15, w: 20, h: 56, borderRadius: '2px' },
      { id: 'slot-3', x: 52, y: 15, w: 20, h: 56, borderRadius: '2px' },
      { id: 'slot-4', x: 74, y: 15, w: 20, h: 56, borderRadius: '2px' }
    ],
    texts: [
      { id: 'text-1', x: 10, y: 5, w: 80, h: 8, text: 'SWEETEST MEMORIES', fontFamily: "'Montserrat', sans-serif", fontSize: 1.1, color: '#C71585', bold: true, align: 'center' },
      { id: 'text-2', x: 10, y: 76, w: 80, h: 12, text: 'Our Love Story', fontFamily: "'Great Vibes', cursive", fontSize: 3.0, color: '#4A3E3D', align: 'center' }
    ]
  },
  {
    id: 'love-together-gold',
    name: 'Together Rose Gold',
    description: 'Luxury metallic rose gold textured background with geometric slots',
    backgroundClass: 'bg-[#B76E79]',
    customBgStyle: {
      backgroundImage: `linear-gradient(45deg, #B76E79 0%, #ECC5C8 50%, #B76E79 100%)`
    },
    slots: [
      { id: 'slot-1', x: 6, y: 15, w: 20, h: 60, borderRadius: '12px' },
      { id: 'slot-2', x: 28, y: 15, w: 20, h: 60, borderRadius: '50%' },
      { id: 'slot-3', x: 52, y: 15, w: 20, h: 60, borderRadius: '50%' },
      { id: 'slot-4', x: 74, y: 15, w: 20, h: 60, borderRadius: '12px' }
    ],
    texts: [
      { id: 'text-1', x: 8, y: 5, w: 84, h: 8, text: 'TOGETHER', fontFamily: "'Cinzel', serif", fontSize: 1.6, color: '#3E1C21', bold: true, align: 'center' },
      { id: 'text-2', x: 8, y: 80, w: 84, h: 10, text: 'Hand in Hand', fontFamily: "'Clicker Script', cursive", fontSize: 2.8, color: '#FFFFFF', italic: true, align: 'center' }
    ]
  },
  {
    id: 'love-story-strip',
    name: 'Our Love Story Journal',
    description: 'Cute pastel romance theme with photo-strip style vertical slots',
    backgroundClass: 'bg-[#FAF7F2]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle, #FAF7F2 60%, #E8E2D5 100%)`
    },
    slots: [
      { id: 'slot-1', x: 10, y: 10, w: 18, h: 70, borderRadius: '4px' },
      { id: 'slot-2', x: 31, y: 10, w: 18, h: 70, borderRadius: '4px' },
      { id: 'slot-3', x: 52, y: 10, w: 18, h: 70, borderRadius: '4px' },
      { id: 'slot-4', x: 73, y: 10, w: 18, h: 70, borderRadius: '4px' }
    ],
    texts: [
      { id: 'text-1', x: 10, y: 84, w: 80, h: 8, text: 'OUR LOVE STORY', fontFamily: "'Cinzel', serif", fontSize: 1.2, color: '#4A3E3D', bold: true, align: 'center' }
    ]
  },
  {
    id: 'love-infinite-galaxy',
    name: 'Infinite Hearts Space',
    description: 'Glowing romantic space neon violet-pink stars with luxury rectangular slots',
    backgroundClass: 'bg-[#09040F]',
    customBgStyle: {
      backgroundImage: `linear-gradient(180deg, #09040F 0%, #1A0D2E 100%)`
    },
    slots: [
      { id: 'slot-1', x: 6, y: 12, w: 20, h: 66, borderRadius: '12px' },
      { id: 'slot-2', x: 28, y: 12, w: 20, h: 66, borderRadius: '12px' },
      { id: 'slot-3', x: 52, y: 12, w: 20, h: 66, borderRadius: '12px' },
      { id: 'slot-4', x: 74, y: 12, w: 20, h: 66, borderRadius: '12px' }
    ],
    texts: [
      { id: 'text-1', x: 6, y: 82, w: 88, h: 10, text: 'To the Moon & Back', fontFamily: "'Great Vibes', cursive", fontSize: 3.2, color: '#FF79C6', align: 'center' }
    ]
  },
  {
    id: 'love-blossom-spring',
    name: 'Blossom Romance',
    description: 'Stunning light pink cherry blossom theme with elegant dual cards',
    backgroundClass: 'bg-[#FFF0F5]',
    customBgStyle: {
      backgroundImage: `linear-gradient(135deg, #FFF0F5 0%, #FFE4E1 100%)`
    },
    slots: [
      { id: 'slot-1', x: 8, y: 15, w: 38, h: 31, borderRadius: '16px' },
      { id: 'slot-2', x: 8, y: 50, w: 38, h: 31, borderRadius: '16px' },
      { id: 'slot-3', x: 54, y: 15, w: 38, h: 31, borderRadius: '16px' },
      { id: 'slot-4', x: 54, y: 50, w: 38, h: 31, borderRadius: '16px' }
    ],
    texts: [
      { id: 'text-1', x: 8, y: 6, w: 84, h: 8, text: 'PURE ROMANCE', fontFamily: "'Montserrat', sans-serif", fontSize: 1.0, color: '#C71585', bold: true, align: 'center' },
      { id: 'text-2', x: 8, y: 84, w: 84, h: 10, text: 'Springtime Love', fontFamily: "'Clicker Script', cursive", fontSize: 3.2, color: '#8B008B', italic: true, align: 'center' }
    ]
  },

  // 3 Wedding Preset Backgrounds
  {
    id: 'wedding-burgundy-royal',
    name: 'Royal Burgundy Matrimony',
    description: 'Luxury deep velvet burgundy wine red with rich ornate golden frames',
    backgroundClass: 'bg-[#5E0B15]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle, #5E0B15 30%, #200003 100%)`,
      border: '8px double #D4AF37'
    },
    slots: [
      { id: 'slot-1', x: 6, y: 12, w: 20, h: 70, borderRadius: '0px' },
      { id: 'slot-2', x: 28, y: 12, w: 20, h: 70, borderRadius: '0px' },
      { id: 'slot-3', x: 50, y: 12, w: 20, h: 70, borderRadius: '0px' },
      { id: 'slot-4', x: 72, y: 12, w: 20, h: 70, borderRadius: '0px' }
    ],
    texts: [
      { id: 'text-1', x: 6, y: 85, w: 86, h: 8, text: 'ROYAL WEDDING MATRIMONY', fontFamily: "'Cinzel', serif", fontSize: 1.4, color: '#D4AF37', bold: true, align: 'center' }
    ]
  },
  {
    id: 'wedding-rose-silk',
    name: 'Champagne Rose Silk',
    description: 'Elegant luxury pale rose gold silk satin background with modern rounded cards',
    backgroundClass: 'bg-[#FFF3F0]',
    customBgStyle: {
      backgroundImage: `linear-gradient(135deg, #FFF3F0 0%, #F5DED6 50%, #E5BEB3 100%)`
    },
    slots: [
      { id: 'slot-1', x: 6, y: 10, w: 20, h: 76, borderRadius: '16px' },
      { id: 'slot-2', x: 28, y: 10, w: 20, h: 76, borderRadius: '16px' },
      { id: 'slot-3', x: 52, y: 10, w: 20, h: 76, borderRadius: '16px' },
      { id: 'slot-4', x: 74, y: 10, w: 20, h: 76, borderRadius: '16px' }
    ],
    texts: [
      { id: 'text-1', x: 8, y: 88, w: 84, h: 8, text: 'Happily Ever After', fontFamily: "'Clicker Script', cursive", fontSize: 3.0, color: '#8A5A44', italic: true, align: 'center' }
    ]
  },
  {
    id: 'wedding-navy-vows',
    name: 'Midnight Navy Elegance',
    description: 'Deep royal navy blue with gold lines, panoramic and square frames',
    backgroundClass: 'bg-[#070F1E]',
    customBgStyle: {
      backgroundImage: `linear-gradient(180deg, #070F1E 0%, #12213A 100%)`,
      border: '6px solid #D4AF37'
    },
    slots: [
      { id: 'slot-1', x: 8, y: 10, w: 40, h: 36, borderRadius: '8px' },
      { id: 'slot-2', x: 8, y: 50, w: 40, h: 36, borderRadius: '8px' },
      { id: 'slot-3', x: 52, y: 10, w: 40, h: 36, borderRadius: '8px' },
      { id: 'slot-4', x: 52, y: 50, w: 40, h: 36, borderRadius: '8px' }
    ],
    texts: [
      { id: 'text-1', x: 52, y: 88, w: 40, h: 6, text: 'THE WEDDING VOWS', fontFamily: "'Cinzel', serif", fontSize: 1.3, color: '#D4AF37', bold: true, align: 'center' }
    ]
  },
  {
    id: 'wedding-shubh-vivah',
    name: 'शुभ विवाह Traditional Maroon & Gold',
    description: 'Deep royal vermilion background with double gold borders and traditional arch framing',
    backgroundClass: 'bg-[#720917]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle, #720917 0%, #2b0308 100%)`,
      border: '8px double #D4AF37',
      position: 'relative'
    },
    slots: [
      { id: 'slot-shubh-1', x: 6, y: 12, w: 32, h: 76, borderRadius: '40% 40% 0px 0px' },
      { id: 'slot-shubh-2', x: 42, y: 12, w: 24, h: 35, borderRadius: '6px' },
      { id: 'slot-shubh-3', x: 42, y: 53, w: 24, h: 35, borderRadius: '6px' },
      { id: 'slot-shubh-4', x: 70, y: 12, w: 24, h: 76, borderRadius: '6px' }
    ],
    texts: [
      { id: 'text-shubh-1', x: 42, y: 4, w: 24, h: 8, text: 'शुभ विवाह', fontFamily: "'Cinzel', serif", fontSize: 2.0, color: '#D4AF37', bold: true, align: 'center' },
      { id: 'text-shubh-2', x: 42, y: 88, w: 24, h: 8, text: 'Shubh Vivah', fontFamily: "'Clicker Script', cursive", fontSize: 2.2, color: '#FFFFFF', italic: true, align: 'center' }
    ]
  },
  {
    id: 'wedding-golden-vivah',
    name: 'Luxury Royal Golden Album',
    description: 'Opulent gold gradient background with sparkling dust overlay and arched center spotlight',
    backgroundClass: 'bg-[#bf953f]',
    customBgStyle: {
      backgroundImage: `linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)`,
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)',
      position: 'relative'
    },
    slots: [
      { id: 'slot-gold-1', x: 6, y: 15, w: 26, h: 54, borderRadius: '8px' },
      { id: 'slot-gold-2', x: 36, y: 15, w: 28, h: 54, borderRadius: '50% 50% 0px 0px' },
      { id: 'slot-gold-3', x: 68, y: 15, w: 26, h: 54, borderRadius: '8px' }
    ],
    texts: [
      { id: 'text-gold-1', x: 36, y: 4, w: 28, h: 8, text: 'THE WEDDING DAY', fontFamily: "'Cinzel', serif", fontSize: 1.3, color: '#4A320F', bold: true, align: 'center' },
      { id: 'text-gold-2', x: 10, y: 76, w: 80, h: 12, text: 'Two Hearts, One Soul', fontFamily: "'Great Vibes', cursive", fontSize: 3.2, color: '#4A320F', align: 'center' }
    ]
  },
  {
    id: 'wedding-royal-peacock',
    name: 'Royal Peacock Teal & Gold Collage',
    description: 'Exquisite deep peacock cyan/teal velvet gradient with ornate golden borders',
    backgroundClass: 'bg-[#052c30]',
    customBgStyle: {
      backgroundImage: `radial-gradient(circle at center, #0b4f56 0%, #031c1e 100%)`,
      border: '6px double #D4AF37',
      position: 'relative'
    },
    slots: [
      { id: 'slot-peacock-1', x: 6, y: 10, w: 20, h: 75, borderRadius: '8px' },
      { id: 'slot-peacock-2', x: 29, y: 10, w: 42, h: 36, borderRadius: '8px' },
      { id: 'slot-peacock-3', x: 29, y: 50, w: 20, h: 35, borderRadius: '8px' },
      { id: 'slot-peacock-4', x: 51, y: 50, w: 20, h: 35, borderRadius: '8px' },
      { id: 'slot-peacock-5', x: 74, y: 10, w: 20, h: 75, borderRadius: '8px' }
    ],
    texts: [
      { id: 'text-peacock-1', x: 29, y: 88, w: 42, h: 8, text: 'OUR WEDDING DIARIES', fontFamily: "'Cinzel', serif", fontSize: 1.2, color: '#F3E5AB', bold: true, align: 'center' }
    ]
  },
  {
    id: 'wedding-vintage-rosewood',
    name: 'Royal Rosewood & Vintage Lace',
    description: 'Mahogany wood texture with elegant lace framing and warm romantic overlays',
    backgroundClass: 'bg-[#3b171c]',
    customBgStyle: {
      backgroundImage: `linear-gradient(to right, #3b171c 0%, #1c0507 100%)`,
      position: 'relative'
    },
    slots: [
      { id: 'slot-rosewood-1', x: 8, y: 12, w: 40, h: 76, borderRadius: '4px' },
      { id: 'slot-rosewood-2', x: 52, y: 12, w: 18, h: 35, borderRadius: '4px' },
      { id: 'slot-rosewood-3', x: 74, y: 12, w: 18, h: 35, borderRadius: '4px' },
      { id: 'slot-rosewood-4', x: 52, y: 53, w: 40, h: 35, borderRadius: '4px' }
    ],
    texts: [
      { id: 'text-rosewood-1', x: 52, y: 4, w: 40, h: 6, text: 'Forever & Always', fontFamily: "'Clicker Script', cursive", fontSize: 2.2, color: '#ECC5C8', align: 'center' }
    ]
  }
];

interface A3DesignerProps {
  onClose: () => void;
  initialImages?: any[];
}

export const A3Designer: React.FC<A3DesignerProps> = ({ onClose, initialImages = [] }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(A3_TEMPLATES[0].id);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  
  // Layer and placement states
  const [placements, _setPlacements] = useState<A3Placement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);

  // History state for Undo & Redo
  const historyRef = useRef<A3Placement[][]>([[]]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);

  const updateUndoRedoState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const setPlacements = (action: React.SetStateAction<A3Placement[]>) => {
    _setPlacements(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next !== prev) {
        const cleanNext = JSON.stringify(next);
        const cleanPrev = JSON.stringify(prev);
        if (cleanNext !== cleanPrev) {
          historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
          historyRef.current.push(next);
          historyIndexRef.current += 1;
          setTimeout(updateUndoRedoState, 0);
        }
      }
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      _setPlacements(historyRef.current[historyIndexRef.current]);
      updateUndoRedoState();
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      _setPlacements(historyRef.current[historyIndexRef.current]);
      updateUndoRedoState();
    }
  };
  
  const [pdfQuality, setPdfQuality] = useState<number>(300);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  
  const [copiedPlacementSettings, setCopiedPlacementSettings] = useState<any>(null);
  
  // Collapsible accordion section states
  const [isLeftTextOpen, setIsLeftTextOpen] = useState(true);
  const [isLeftBgOpen, setIsLeftBgOpen] = useState(true);
  const [isLeftPresetsOpen, setIsLeftPresetsOpen] = useState(true);
  const [isRightPhotoOpen, setIsRightPhotoOpen] = useState(true);
  const [isRightStyleOpen, setIsRightStyleOpen] = useState(true);
  const [isRightLayersOpen, setIsRightLayersOpen] = useState(true);
  
  // Dragging and Resizing state
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ clientX: 0, clientY: 0, x: 0, y: 0, w: 0, h: 0 });

  // Custom Canvas Background & Borders state
  const [customBgType, setCustomBgType] = useState<'template' | 'color' | 'gradient' | 'image'>('template');
  const [customBgColor, setCustomBgColor] = useState<string>('#120F24');
  const [customBgGradient, setCustomBgGradient] = useState<string>('linear-gradient(135deg, #4A0E17 0%, #1F0307 100%)');
  const [customBgImageUrl, setCustomBgImageUrl] = useState<string>('');
  const [canvasBorderWidth, setCanvasBorderWidth] = useState<number>(0);
  const [canvasBorderColor, setCanvasBorderColor] = useState<string>('#D4AF37');
  const [canvasBorderStyle, setCanvasBorderStyle] = useState<string>('solid');

  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-resize handlers
  const handleMouseDown = (e: React.MouseEvent, id: string, mode: 'move' | 'resize') => {
    if (isExporting || isPrinting) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlacementId(id);
    const p = placements.find(x => x.id === id);
    if (!p) return;

    setDragMode(mode);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragMode || !selectedPlacementId) return;
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const canvasWidthPx = rect.width;
    const canvasHeightPx = rect.height;

    const deltaX = e.clientX - dragStart.clientX;
    const deltaY = e.clientY - dragStart.clientY;

    const deltaXPct = (deltaX / canvasWidthPx) * 100;
    const deltaYPct = (deltaY / canvasHeightPx) * 100;

    _setPlacements(prev => prev.map(p => {
      if (p.id !== selectedPlacementId) return p;

      if (dragMode === 'move') {
        let newX = dragStart.x + deltaXPct;
        let newY = dragStart.y + deltaYPct;
        newX = Math.max(0, Math.min(100 - p.w, newX));
        newY = Math.max(0, Math.min(100 - p.h, newY));
        return { ...p, x: newX, y: newY };
      } else if (dragMode === 'resize') {
        let newW = dragStart.w + deltaXPct;
        let newH = dragStart.h + deltaYPct;
        newW = Math.max(3, Math.min(100 - p.x, newW));
        newH = Math.max(3, Math.min(100 - p.y, newH));
        return { ...p, w: newW, h: newH };
      }
      return p;
    }));
  }, [dragMode, dragStart, selectedPlacementId]);

  const handleMouseUp = useCallback(() => {
    if (dragMode) {
      setDragMode(null);
      setPlacements(prev => [...prev]);
    }
  }, [dragMode]);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragMode, handleMouseMove, handleMouseUp]);

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomBgImageUrl(url);
      setCustomBgType('image');
    }
  };

  const getCanvasBackgroundStyle = () => {
    const borderStyle = canvasBorderWidth > 0 ? `${canvasBorderWidth}px ${canvasBorderStyle} ${canvasBorderColor}` : undefined;
    
    let bgStyle: React.CSSProperties = {
      border: borderStyle,
      position: 'relative'
    };

    if (customBgType === 'template') {
      return { ...bgStyle, ...activeTemplate.customBgStyle };
    } else if (customBgType === 'color') {
      return { ...bgStyle, backgroundColor: customBgColor, backgroundImage: 'none' };
    } else if (customBgType === 'gradient') {
      return { ...bgStyle, backgroundImage: customBgGradient };
    } else if (customBgType === 'image') {
      return { ...bgStyle, backgroundImage: `url(${customBgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return bgStyle;
  };

  const getCanvasBackgroundClass = () => {
    if (customBgType === 'template') {
      return activeTemplate.backgroundClass;
    }
    return '';
  };

  // Upload References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetSlotForUploadRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Text Editor State
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [editingFontSize, setEditingFontSize] = useState<number>(1.2);
  const [editingFontFamily, setEditingFontFamily] = useState<string>("'Playfair Display', serif");
  const [editingColor, setEditingColor] = useState<string>('#FFFFFF');
  const [editingBold, setEditingBold] = useState<boolean>(false);
  const [editingItalic, setEditingItalic] = useState<boolean>(false);

  // Initialize page placements based on template selection
  useEffect(() => {
    const template = A3_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) return;

    let zIndexCounter = 1;
    const initialPlacements: A3Placement[] = [];

    // Setup photo slots
    template.slots.forEach(slot => {
      // Check if we can pre-populate with initial uploaded images
      const initialImg = initialImages[zIndexCounter - 1];
      initialPlacements.push({
        id: slot.id,
        type: 'photo',
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        borderRadius: slot.borderRadius || '0px',
        objectFit: slot.objectFit || 'cover',
        zIndex: zIndexCounter++,
        visible: true,
        url: initialImg?.url || undefined,
        originalUrl: initialImg?.originalUrl || undefined,
        rotation: initialImg?.rotation || 0,
        flipX: initialImg?.flipX || false,
        flipY: initialImg?.flipY || false,
        filters: {
          brightness: 0,
          contrast: 0,
          bwScan: 0,
          removeBgVal: 0,
          bgRemovedUrl: initialImg?.bgRemovedUrl || undefined,
          transparentBg: false
        },
        borderWidth: 0,
        borderColor: '#FFFFFF',
        borderStyle: 'solid',
        opacity: 1,
        boxShadow: false
      });
    });

    // Setup text overlays
    template.texts.forEach(txt => {
      initialPlacements.push({
        id: txt.id,
        type: 'text',
        x: txt.x,
        y: txt.y,
        w: txt.w,
        h: txt.h,
        text: txt.text,
        fontFamily: txt.fontFamily,
        fontSize: txt.fontSize,
        color: txt.color,
        bold: txt.bold || false,
        italic: txt.italic || false,
        align: txt.align || 'center',
        zIndex: zIndexCounter++,
        visible: true,
        borderWidth: 0,
        borderColor: '#FFFFFF',
        borderStyle: 'solid',
        opacity: 1,
        boxShadow: false
      });
    });

    _setPlacements(initialPlacements);
    historyRef.current = [initialPlacements];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
    setSelectedPlacementId(null);
  }, [selectedTemplateId, initialImages]);

  // Sync editor values when selecting a text placement
  useEffect(() => {
    if (!selectedPlacementId) return;
    const p = placements.find(x => x.id === selectedPlacementId);
    if (p && p.type === 'text') {
      setEditingTextValue(p.text || '');
      setEditingFontSize(p.fontSize || 1.2);
      setEditingFontFamily(p.fontFamily || "'Playfair Display', serif");
      setEditingColor(p.color || '#FFFFFF');
      setEditingBold(p.bold || false);
      setEditingItalic(p.italic || false);
    }
  }, [selectedPlacementId, placements]);

  // Helper: Update selected placement properties
  const updateSelectedPlacement = (changes: Partial<A3Placement>) => {
    if (!selectedPlacementId) return;
    setPlacements(prev => prev.map(p => {
      if (p.id !== selectedPlacementId) return p;
      return { ...p, ...changes };
    }));
  };

  // Helper: Photo Enhancement / Filters handler
  const handleEnhancementChange = (key: string, val: number) => {
    if (!selectedPlacementId) return;
    const p = placements.find(x => x.id === selectedPlacementId);
    if (!p || p.type !== 'photo' || !p.filters) return;
    
    updateSelectedPlacement({
      filters: {
        ...p.filters,
        [key]: val
      }
    });
  };

  // Helper: AI Background Remover
  const handleRemoveBgAI = async () => {
    if (!selectedPlacementId) return;
    const p = placements.find(x => x.id === selectedPlacementId);
    if (!p || p.type !== 'photo' || !p.url || p.isRemovingBg) return;

    // Check if already removed, click to revert
    if (p.filters?.bgRemovedUrl) {
      updateSelectedPlacement({
        filters: {
          ...p.filters,
          bgRemovedUrl: undefined
        }
      });
      return;
    }

    try {
      updateSelectedPlacement({ isRemovingBg: true });
      setIsRemovingBg(true);

      const resultBlob = await removeBackground(p.originalUrl || p.url, {
        model: 'small', // Speedup active
        progress: (key, current, total) => {
          console.log(`AI Bg Removal Progress: ${Math.round((current / total) * 100)}%`);
        }
      });

      const processedUrl = URL.createObjectURL(resultBlob);
      updateSelectedPlacement({
        isRemovingBg: false,
        filters: {
          ...p.filters!,
          bgRemovedUrl: processedUrl
        }
      });
    } catch (err) {
      console.error("AI Background Removal failed:", err);
      alert("AI Background removal process failed. Please try a cleaner image.");
      updateSelectedPlacement({ isRemovingBg: false });
    } finally {
      setIsRemovingBg(false);
    }
  };

  // File replacement uploads
  const handleUploadClick = (slotId: string) => {
    targetSlotForUploadRef.current = slotId;
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = targetSlotForUploadRef.current;
    if (!file || !slotId) return;

    const url = URL.createObjectURL(file);
    setPlacements(prev => prev.map(p => {
      if (p.id !== slotId) return p;
      return {
        ...p,
        url: url,
        originalUrl: url,
        isRemovingBg: false,
        filters: {
          brightness: 0,
          contrast: 0,
          bwScan: 0,
          removeBgVal: 0,
          bgRemovedUrl: undefined,
          transparentBg: false
        }
      };
    }));
  };

  // Add Dynamic custom text layer
  const handleAddCustomText = () => {
    const newId = `text-custom-${Date.now()}`;
    const maxZ = placements.reduce((max, p) => Math.max(max, p.zIndex), 0);
    const newTextLayer: A3Placement = {
      id: newId,
      type: 'text',
      x: 35,
      y: 45,
      w: 30,
      h: 10,
      text: 'Custom Text',
      fontFamily: "'Playfair Display', serif",
      fontSize: 1.5,
      color: '#FFFFFF',
      bold: false,
      italic: false,
      align: 'center',
      zIndex: maxZ + 1,
      visible: true
    };
    setPlacements(prev => [...prev, newTextLayer]);
    setSelectedPlacementId(newId);
  };

  // Layer Reordering logic
  const handleLayerOrder = (direction: 'up' | 'down' | 'front' | 'back') => {
    if (!selectedPlacementId) return;
    const selectedPlacement = placements.find(p => p.id === selectedPlacementId);
    if (!selectedPlacement) return;

    let updated = [...placements];
    // Sort layers by zIndex ascending
    updated.sort((a, b) => a.zIndex - b.zIndex);
    const idx = updated.findIndex(p => p.id === selectedPlacementId);

    if (direction === 'up' && idx < updated.length - 1) {
      // Swap zIndex with the one above
      const temp = updated[idx].zIndex;
      updated[idx].zIndex = updated[idx + 1].zIndex;
      updated[idx + 1].zIndex = temp;
    } else if (direction === 'down' && idx > 0) {
      // Swap zIndex with the one below
      const temp = updated[idx].zIndex;
      updated[idx].zIndex = updated[idx - 1].zIndex;
      updated[idx - 1].zIndex = temp;
    } else if (direction === 'front') {
      const maxZ = updated[updated.length - 1].zIndex;
      updated[idx].zIndex = maxZ + 1;
    } else if (direction === 'back') {
      const minZ = updated[0].zIndex;
      updated[idx].zIndex = minZ - 1;
    }

    setPlacements(updated);
  };

  // Filter Styles String Creator
  const getFilterStyle = (filters: any) => {
    if (!filters) return undefined;
    let parts = [];
    if (filters.brightness !== 0) parts.push(`brightness(${100 + filters.brightness}%)`);
    if (filters.contrast !== 0) parts.push(`contrast(${100 + filters.contrast}%)`);
    if (filters.bwScan > 0) parts.push(`grayscale(100%) contrast(150%)`);
    return parts.length > 0 ? parts.join(' ') : undefined;
  };

  // PDF Export 300/600/800 DPI high-quality cloned scaling
  const exportPdf = async () => {
    if (isExporting || isPrinting) return;
    const node = canvasRef.current;
    if (!node) return;

    try {
      setIsExporting(true);
      setSelectedPlacementId(null); // Hide outline indicators
      await new Promise(resolve => setTimeout(resolve, 300)); // Render cycle sync

      const scale = pdfQuality / 96; // 300 DPI scaling
      const width = node.offsetWidth;
      const height = node.offsetHeight;

      // Clone DOM node for offscreen high-res render
      const clone = node.cloneNode(true) as HTMLDivElement;
      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top left';
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-99999px';
      container.style.left = '-99999px';
      container.style.width = `${width * scale}px`;
      container.style.height = `${height * scale}px`;
      container.style.overflow = 'hidden';
      container.appendChild(clone);
      document.body.appendChild(container);

      // Load fonts/images completely
      await new Promise(r => setTimeout(r, 600));

      const dataUrl = await domtoimage.toJpeg(clone, {
        width: width * scale,
        height: height * scale,
        quality: 0.95
      });

      document.body.removeChild(container);

      // Generate PDF doc
      const { default: jsPDF } = await import('jspdf');
      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a3'
      });

      const pdfW = isLandscape ? 420 : 297;
      const pdfH = isLandscape ? 297 : 420;

      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      pdf.save(`PrintMaster_A3_Design_${pdfQuality}DPI.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export high quality PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Printer Trigger
  const handlePrint = async () => {
    if (isExporting || isPrinting) return;
    const node = canvasRef.current;
    if (!node) return;

    try {
      setIsPrinting(true);
      setSelectedPlacementId(null);
      await new Promise(r => setTimeout(r, 300));

      const dataUrl = await domtoimage.toJpeg(node, { quality: 0.98 });
      
      // Create hidden print iframe
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.bottom = '0';
      printFrame.style.right = '0';
      printFrame.style.width = '0px';
      printFrame.style.height = '0px';
      printFrame.style.border = '0px';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.write(`
          <html>
            <head>
              <title>Print Master A3 Design</title>
              <style>
                @page { size: A3 ${orientation}; margin: 0; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; background: #fff; }
                img { width: 100%; height: 100%; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" onload="window.print();" />
            </body>
          </html>
        `);
        frameDoc.close();

        // Allow printer overlay time
        await new Promise(resolve => setTimeout(resolve, 2000));
        document.body.removeChild(printFrame);
      }
    } catch (err) {
      console.error("Direct print failed:", err);
      alert("Unable to open browser printing. Please try exporting as PDF first.");
    } finally {
      setIsPrinting(false);
    }
  };

  const activeTemplate = A3_TEMPLATES.find(t => t.id === selectedTemplateId) || A3_TEMPLATES[0];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/95 backdrop-blur-2xl text-slate-100 flex flex-col font-sans overflow-hidden animate-in fade-in duration-300">
      {/* Header bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-violet-500/25">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-[16px] tracking-tight">Print<span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Master</span> A3 Collage</h1>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">High-end wedding frame & poster layout generator</p>
          </div>
        </div>

        {/* Zoom & History Controls inside Header */}
        <div className="flex items-center gap-1.5 bg-slate-850/50 border border-slate-800/85 px-3 py-1.5 rounded-xl shadow-inner select-none">
          <button 
            onClick={handleUndo} 
            disabled={!canUndo} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Undo"
          >
            <Undo2 size={13} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={!canRedo} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Redo"
          >
            <Redo2 size={13} />
          </button>
          
          <div className="w-px h-3.5 bg-slate-800/80 mx-1"></div>

          <button 
            onClick={() => setCanvasZoom(prev => Math.max(0.5, prev - 0.1))} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10.5px] font-black text-slate-200 min-w-[32px] text-center select-none">
            {Math.round(canvasZoom * 100)}%
          </span>
          <button 
            onClick={() => setCanvasZoom(prev => Math.min(2.0, prev + 0.1))} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          
          <div className="w-px h-3.5 bg-slate-800/80 mx-1"></div>

          <button 
            onClick={() => setCanvasZoom(1.0)} 
            className="px-2 py-0.5 hover:bg-slate-800 rounded-md text-[9px] font-black text-violet-400 hover:text-violet-300 transition-all uppercase tracking-wider"
          >
            RESET
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Orientation */}
          <div className="flex bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/50">
            <button 
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${orientation === 'landscape' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => setOrientation('landscape')}
            >
              Landscape
            </button>
            <button 
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${orientation === 'portrait' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => setOrientation('portrait')}
            >
              Portrait
            </button>
          </div>

          {/* DPI and export tools */}
          <div className="flex items-center gap-2">
            <select 
              value={pdfQuality}
              onChange={(e) => setPdfQuality(Number(e.target.value))}
              disabled={isExporting || isPrinting}
              className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 py-2 pl-3 pr-8 rounded-xl cursor-pointer outline-none shadow-sm focus:ring-2 focus:ring-violet-500/25 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22rgba(255,255,255,0.7)%20%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
            >
              <option value={300}>300 DPI</option>
              <option value={600}>600 DPI</option>
              <option value={800}>800 DPI</option>
            </select>
            <button 
              onClick={exportPdf}
              disabled={isExporting || isPrinting}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {isExporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'EXPORTING...' : 'DOWNLOAD PDF'}
            </button>
            <button 
              onClick={handlePrint}
              disabled={isExporting || isPrinting}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-xl font-bold text-xs shadow-sm border border-slate-700/60 transition-all hover:scale-105 active:scale-95"
            >
              {isPrinting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer className="w-4 h-4" />}
              {isPrinting ? 'PREPARING...' : 'DIRECT PRINT'}
            </button>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 rounded-xl transition duration-300"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Text Editor & Presets */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/40 backdrop-blur-xl flex flex-col shrink-0 overflow-y-auto">
          {/* Section 1: Text Customizer & Custom Text Add */}
          <div className="border-b border-slate-800">
            <div 
              onClick={() => setIsLeftTextOpen(!isLeftTextOpen)}
              className="flex items-center justify-between p-4 hover:bg-slate-850/20 transition cursor-pointer select-none"
            >
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-violet-400" /> Text Elements
              </h2>
              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={handleAddCustomText}
                  className="flex items-center gap-1 text-[10px] font-black text-violet-400 hover:text-violet-300 transition-colors uppercase"
                  title="Add Custom Text"
                >
                  <Plus size={12} strokeWidth={2.5} /> Add
                </button>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isLeftTextOpen ? '' : '-rotate-90'}`} onClick={() => setIsLeftTextOpen(!isLeftTextOpen)} />
              </div>
            </div>
            
            {isLeftTextOpen && (
              <div className="p-4 pt-0">
                {/* Editing Selected Text Layer */}
                {selectedPlacementId && placements.find(p => p.id === selectedPlacementId)?.type === 'text' ? (
                  <div className="flex flex-col gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <span className="text-[10px] font-black text-indigo-400 uppercase">Edit Selected Text</span>
                    <input 
                      type="text" 
                      value={editingTextValue}
                      onChange={(e) => {
                        setEditingTextValue(e.target.value);
                        updateSelectedPlacement({ text: e.target.value });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-100 outline-none focus:border-violet-500"
                      placeholder="Text contents..."
                    />
                    
                    {/* Font selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Font family</label>
                        <select 
                          value={editingFontFamily}
                          onChange={(e) => {
                            setEditingFontFamily(e.target.value);
                            updateSelectedPlacement({ fontFamily: e.target.value });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-[10px] px-2 py-1 rounded-md text-slate-350 outline-none"
                        >
                          <option value="'Playfair Display', serif">Playfair Serif</option>
                          <option value="'Great Vibes', cursive">Great Vibes Cursive</option>
                          <option value="'Cinzel', serif">Cinzel Roman</option>
                          <option value="'Montserrat', sans-serif">Montserrat Sans</option>
                          <option value="'Clicker Script', cursive">Clicker Script</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Text Color</label>
                        <input 
                          type="color" 
                          value={editingColor}
                          onChange={(e) => {
                            setEditingColor(e.target.value);
                            updateSelectedPlacement({ color: e.target.value });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 h-6 p-0 border-0 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Font Controls */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingBold(!editingBold);
                            updateSelectedPlacement({ bold: !editingBold });
                          }}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-black border ${editingBold ? 'bg-violet-600 border-transparent text-white' : 'border-slate-700 text-slate-350 hover:bg-slate-800'}`}
                        >
                          B
                        </button>
                        <button 
                          onClick={() => {
                            setEditingItalic(!editingItalic);
                            updateSelectedPlacement({ italic: !editingItalic });
                          }}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-black italic border ${editingItalic ? 'bg-violet-600 border-transparent text-white' : 'border-slate-700 text-slate-350 hover:bg-slate-800'}`}
                        >
                          I
                        </button>
                      </div>
                      
                      {/* Relative Font size adjuster */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400">Scale:</span>
                        <button onClick={() => {
                          const newSz = Math.max(0.2, editingFontSize - 0.1);
                          setEditingFontSize(newSz);
                          updateSelectedPlacement({ fontSize: newSz });
                        }} className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-bold border border-slate-700">-</button>
                        <span className="text-[10px] font-semibold text-slate-200">{editingFontSize.toFixed(1)}</span>
                        <button onClick={() => {
                          const newSz = Math.min(6, editingFontSize + 0.1);
                          setEditingFontSize(newSz);
                          updateSelectedPlacement({ fontSize: newSz });
                        }} className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-bold border border-slate-700">+</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10.5px] text-slate-500 font-medium italic block py-2 text-center bg-slate-800/10 border border-dashed border-slate-800 rounded-lg">Click any text block to customize font styling</span>
                )}
              </div>
            )}
          </div>

          {/* Section: Canvas Background & Borders */}
          <div className="border-b border-slate-800">
            <button 
              onClick={() => setIsLeftBgOpen(!isLeftBgOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-850/20 transition outline-none"
            >
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-violet-400" /> Canvas Background
              </h2>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isLeftBgOpen ? '' : '-rotate-90'}`} />
            </button>
            
            {isLeftBgOpen && (
              <div className="p-4 pt-0 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                {/* Background Type selection */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">BG TYPE</label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    {(['template', 'color', 'gradient', 'image'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setCustomBgType(type)}
                        className={`py-1 text-[9px] font-bold rounded capitalize ${customBgType === type ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid Color Picker */}
                {customBgType === 'color' && (
                  <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-bold text-slate-400">SELECT BG COLOR</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="w-8 h-8 rounded bg-slate-900 border border-slate-700 cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Gradient Selector */}
                {customBgType === 'gradient' && (
                  <div className="flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-bold text-slate-400">SELECT GRADIENT</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Royal Crimson', value: 'linear-gradient(135deg, #4A0E17 0%, #1F0307 100%)' },
                        { name: 'Classic Gold', value: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)' },
                        { name: 'Imperial Blue', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
                        { name: 'Rose Gold', value: 'linear-gradient(135deg, #B76E79 0%, #ECC5C8 50%, #B76E79 100%)' },
                        { name: 'Emerald Velvet', value: 'linear-gradient(135deg, #05190e 0%, #0c3c23 50%, #031008 100%)' },
                        { name: 'Dark Orchid', value: 'linear-gradient(135deg, #2b1055 0%, #7597de 100%)' }
                      ].map(grad => (
                        <button
                          key={grad.name}
                          onClick={() => setCustomBgGradient(grad.value)}
                          style={{ backgroundImage: grad.value }}
                          className={`h-9 px-1 text-[8.5px] font-black text-white rounded-lg border text-shadow shadow-sm overflow-hidden flex items-center justify-center transition-all hover:scale-[1.03] ${customBgGradient === grad.value ? 'border-violet-400 ring-2 ring-violet-500/30' : 'border-slate-700/60'}`}
                        >
                          <span className="bg-black/40 px-1 py-0.5 rounded">{grad.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Image Upload */}
                {customBgType === 'image' && (
                  <div className="flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-bold text-slate-400">UPLOAD CUSTOM BACKDROP</label>
                    {customBgImageUrl ? (
                      <div className="relative h-20 rounded-lg overflow-hidden border border-slate-750 bg-slate-900 group">
                        <img src={customBgImageUrl} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => { setCustomBgImageUrl(''); }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-red-400 transition-opacity"
                        >
                          Remove Backdrop
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => bgFileInputRef.current?.click()}
                        className="h-20 border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-lg flex flex-col items-center justify-center gap-1 bg-slate-800/10 hover:bg-slate-850/20 text-slate-450 hover:text-slate-300 transition duration-300"
                      >
                        <UploadCloud size={18} />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider">Choose Image</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Canvas Outer Border Controls */}
                <div className="h-px bg-slate-800 my-1"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Canvas Border</span>
                
                {/* Border Width */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-350">
                    <span>Border Thickness</span>
                    <span className="text-violet-400">{canvasBorderWidth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={canvasBorderWidth}
                    onChange={(e) => setCanvasBorderWidth(Number(e.target.value))}
                    className="w-full accent-violet-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Border Color & Style */}
                {canvasBorderWidth > 0 && (
                  <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="text-[9px] font-bold text-slate-450 block mb-1">BORDER COLOR</label>
                      <input 
                        type="color" 
                        value={canvasBorderColor}
                        onChange={(e) => setCanvasBorderColor(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 h-6 p-0 border-0 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">BORDER STYLE</label>
                      <select 
                        value={canvasBorderStyle}
                        onChange={(e) => setCanvasBorderStyle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-[10px] px-2 py-1.5 rounded-md text-slate-350 outline-none"
                      >
                        <option value="solid">Solid</option>
                        <option value="double">Double</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Background Template Presets */}
          <div className="border-b border-slate-800">
            <button 
              onClick={() => setIsLeftPresetsOpen(!isLeftPresetsOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-850/20 transition outline-none"
            >
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5 text-violet-400" /> Choose background Preset
              </h2>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isLeftPresetsOpen ? '' : '-rotate-90'}`} />
            </button>
            
            {isLeftPresetsOpen && (
              <div className="p-4 pt-0">
                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {A3_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${selectedTemplateId === tpl.id ? 'bg-gradient-to-r from-violet-950/40 to-indigo-950/40 border-violet-500/50 shadow-md shadow-violet-500/5' : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70 text-slate-300'}`}
                    >
                      <span className="font-bold text-xs text-slate-100 block">{tpl.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1 line-clamp-1">{tpl.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MIDDLE SECTION: Live A3 Canvas workspace */}
        <main className="flex-1 bg-[#090C15] overflow-auto flex flex-col items-center justify-center p-8 relative min-h-0">

          {/* Scale wrapper */}
          <div 
            style={{
              transform: `scale(${canvasZoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out'
            }}
            className="shrink-0"
          >
            <div 
              ref={canvasRef}
              onClick={() => setSelectedPlacementId(null)}
              className={`shadow-[0_24px_70px_rgba(0,0,0,0.6)] shrink-0 select-none overflow-hidden relative transition-all duration-300 ${getCanvasBackgroundClass()}`}
              style={{
                width: orientation === 'landscape' ? '840px' : '594px',
                height: orientation === 'landscape' ? '594px' : '840px',
                ...getCanvasBackgroundStyle()
              }}
            >
              {/* Background design graphics / double thin golden board frames */}
              {customBgType === 'template' && selectedTemplateId === 'walnut-floral' && (
                <div className="absolute inset-4 border border-[#D4AF37]/20 pointer-events-none z-[2]" />
              )}
              {customBgType === 'template' && selectedTemplateId === 'emerald-gold' && (
                <div className="absolute inset-5 border-2 border-[#C5A059]/40 pointer-events-none z-[2]" />
              )}
              {customBgType === 'template' && selectedTemplateId === 'vintage-gold-ivory' && (
                <div className="absolute inset-4 border border-[#8B6508]/15 pointer-events-none z-[2]" />
              )}
              {customBgType === 'template' && selectedTemplateId === 'charcoal-rose' && (
                <div className="absolute inset-3 border border-[#E0A899]/10 pointer-events-none z-[2]" />
              )}
              {customBgType === 'template' && selectedTemplateId === 'wedding-shubh-vivah' && (
                <div className="absolute inset-4 border border-[#D4AF37]/30 pointer-events-none z-[2]" />
              )}
              {customBgType === 'template' && selectedTemplateId === 'wedding-royal-peacock' && (
                <div className="absolute inset-4 border border-[#D4AF37]/45 pointer-events-none z-[2]" />
              )}

              {/* Rendering all placements sorted by zIndex ascending */}
              {[...placements]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(placement => {
                  if (!placement.visible) return null;
                  const isSelected = selectedPlacementId === placement.id;

                  // Relative positioning inside parent 840x594 A3 scale
                  const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${placement.w}%`,
                    height: `${placement.h}%`,
                    zIndex: placement.zIndex,
                    opacity: placement.opacity !== undefined ? placement.opacity : 1,
                    boxShadow: placement.boxShadow ? '0 10px 25px rgba(0, 0, 0, 0.4)' : undefined,
                    border: placement.borderWidth ? `${placement.borderWidth}px ${placement.borderStyle || 'solid'} ${placement.borderColor || '#FFFFFF'}` : undefined,
                    borderRadius: placement.borderRadius
                  };

                  return (
                    <div
                      key={placement.id}
                      style={style}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlacementId(placement.id);
                      }}
                      className={`group ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900 z-50' : 'hover:ring-1 hover:ring-slate-500'}`}
                    >
                      {/* Drag move handle (Top-Left) */}
                      {isSelected && (
                        <div 
                          onMouseDown={(e) => handleMouseDown(e, placement.id, 'move')}
                          className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-violet-650 hover:bg-violet-600 border-2 border-white rounded-full flex items-center justify-center cursor-move shadow-md z-[60] text-white no-print"
                          title="Drag to Move Layer"
                        >
                          <Move size={12} strokeWidth={2.5} />
                        </div>
                      )}

                      {/* Drag resize handle (Bottom-Right) */}
                      {isSelected && (
                        <div 
                          onMouseDown={(e) => handleMouseDown(e, placement.id, 'resize')}
                          className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-violet-650 hover:bg-violet-600 border-2 border-white rounded-full flex items-center justify-center cursor-se-resize shadow-md z-[60] text-white no-print"
                          title="Drag to Resize Layer"
                        >
                          <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-white rotate-45 -mt-0.5 -ml-0.5" />
                        </div>
                      )}

                      {/* Render photo layer */}
                      {placement.type === 'photo' && (
                        <div className="w-full h-full relative overflow-hidden bg-slate-900/60" style={{ borderRadius: placement.borderRadius }}>
                          {placement.url ? (
                            <div className="w-full h-full relative pointer-events-none">
                              <img 
                                src={placement.filters?.bgRemovedUrl || placement.url} 
                                alt="A3 Collage Layer" 
                                style={{ 
                                  objectFit: placement.objectFit || 'cover', 
                                  transform: `rotate(${placement.rotation || 0}deg) ${placement.flipX ? 'scaleX(-1)' : ''} ${placement.flipY ? 'scaleY(-1)' : ''}`,
                                  filter: getFilterStyle(placement.filters)
                                }}
                                className="w-full h-full transition duration-300"
                              />
                              {/* Overlay transparency logic */}
                              {placement.filters?.transparentBg && (
                                <div className="absolute inset-0 bg-transparent mix-blend-overlay pointer-events-none" />
                              )}
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleUploadClick(placement.id)}
                              className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 transition duration-350"
                            >
                              <ImagePlus size={20} />
                              <span className="text-[9px] font-black uppercase tracking-wider">Add Photo</span>
                            </button>
                          )}
                          
                          {/* Selected Indicator */}
                          {isSelected && !placement.url && (
                            <div className="absolute inset-0 bg-violet-600/10 pointer-events-none" />
                          )}
                          
                          {/* Loading Bg Remover overlay */}
                          {placement.isRemovingBg && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                              <div className="w-6 h-6 border-2 border-violet-500 border-t-white rounded-full animate-spin" />
                              <span className="text-[9px] font-bold tracking-widest text-violet-400 uppercase">AI REMOVING BG...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render text layer with direct inline editable contentEditable */}
                      {placement.type === 'text' && (
                        <div 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const text = e.currentTarget.textContent || '';
                            setPlacements(prev => prev.map(p => p.id === placement.id ? { ...p, text } : p));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-full h-full flex items-center justify-center px-1 outline-none focus:ring-1 focus:ring-violet-500/40 rounded cursor-text"
                          style={{
                            fontFamily: placement.fontFamily,
                            color: placement.color,
                            fontWeight: placement.bold ? 'bold' : 'normal',
                            fontStyle: placement.italic ? 'italic' : 'normal',
                            fontSize: `${(placement.fontSize || 1.2) * 12}px`,
                            textAlign: placement.align || 'center',
                            lineHeight: '1.2'
                          }}
                        >
                          {placement.text}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: Selected Element Photo Tools & Layers Manager */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/40 backdrop-blur-xl flex flex-col shrink-0 overflow-y-auto">
          {/* Section 1: Photo Adjustments */}
          <div className="border-b border-slate-800">
            <button 
              onClick={() => setIsRightPhotoOpen(!isRightPhotoOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-850/20 transition outline-none"
            >
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-violet-400" /> Photo Adjustments
              </h2>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isRightPhotoOpen ? '' : '-rotate-90'}`} />
            </button>
            
            {isRightPhotoOpen && (
              <div className="p-4 pt-0">
                {selectedPlacementId && placements.find(p => p.id === selectedPlacementId)?.type === 'photo' ? (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-300 pt-2">
                    
                    {/* Photo Specific Core Actions */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Photo Actions</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleUploadClick(selectedPlacementId)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition text-xs font-bold border border-blue-500/20"
                        >
                          <UploadCloud className="w-4 h-4" /> Replace
                        </button>
                        <button 
                          onClick={() => {
                            const p = placements.find(x => x.id === selectedPlacementId);
                            if (p) {
                              updateSelectedPlacement({ rotation: (p.rotation || 0) + 90 });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs font-bold border border-slate-700"
                        >
                          <RotateCw className="w-4 h-4 text-violet-400" /> Rotate
                        </button>
                        <button 
                          onClick={() => {
                            const p = placements.find(x => x.id === selectedPlacementId);
                            if (p) {
                              updateSelectedPlacement({ flipX: !p.flipX });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs font-bold border border-slate-700"
                        >
                          <Shuffle className="w-4 h-4 -rotate-90 text-teal-400" /> Flip
                        </button>
                        
                        {/* Size Fit Controls */}
                        <button 
                          onClick={() => {
                            const p = placements.find(x => x.id === selectedPlacementId);
                            if (p) {
                              const nextFit = p.objectFit === 'cover' ? 'contain' : (p.objectFit === 'contain' ? 'fill' : 'cover');
                              updateSelectedPlacement({ objectFit: nextFit });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs font-bold border border-slate-700"
                          title="Toggle aspect-fit sizing Mode"
                        >
                          <Maximize2 className="w-4 h-4 text-amber-400" /> Fit mode
                        </button>
                      </div>
                    </div>

                    {/* Filters/Enhance Adjustments Section */}
                    <div className="flex flex-col gap-4 p-4 border border-slate-800 rounded-2xl bg-slate-850/40">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest -mb-1">Enhance Photo</span>
                      
                      {/* Brightness */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-350">
                          <span>Brightness</span>
                          <span className="text-violet-400">{placements.find(p => p.id === selectedPlacementId)?.filters?.brightness || 0}</span>
                        </div>
                        <input 
                          type="range" 
                          min="-100" 
                          max="100" 
                          value={placements.find(p => p.id === selectedPlacementId)?.filters?.brightness || 0}
                          onChange={(e) => handleEnhancementChange('brightness', Number(e.target.value))}
                          className="w-full accent-violet-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Contrast */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-350">
                          <span>Contrast</span>
                          <span className="text-violet-400">{placements.find(p => p.id === selectedPlacementId)?.filters?.contrast || 0}</span>
                        </div>
                        <input 
                          type="range" 
                          min="-100" 
                          max="100" 
                          value={placements.find(p => p.id === selectedPlacementId)?.filters?.contrast || 0}
                          onChange={(e) => handleEnhancementChange('contrast', Number(e.target.value))}
                          className="w-full accent-violet-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* B&W Threshold */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-350">
                          <span>B&W Scan Filter</span>
                          <span className="text-emerald-400">{(placements.find(p => p.id === selectedPlacementId)?.filters?.bwScan || 0) > 0 ? 'On' : 'Off'}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="1"
                          value={placements.find(p => p.id === selectedPlacementId)?.filters?.bwScan || 0}
                          onChange={(e) => handleEnhancementChange('bwScan', Number(e.target.value))}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="h-px bg-slate-800 my-1"></div>

                      {/* AI Background Remover Option */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-350">
                          <span>AI Background Remover</span>
                          <button 
                            onClick={handleRemoveBgAI}
                            disabled={isRemovingBg || !placements.find(p => p.id === selectedPlacementId)?.url}
                            className="px-2 py-1 bg-violet-500/20 hover:bg-violet-500/35 text-violet-400 disabled:opacity-50 text-[10px] font-black rounded-lg transition uppercase tracking-wider"
                          >
                            {placements.find(p => p.id === selectedPlacementId)?.filters?.bgRemovedUrl ? 'REVERT' : 'APPLY AI'}
                          </button>
                        </div>
                        
                        {/* Transparent Color blend */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-350">
                          <span>Transparent Blend</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={placements.find(p => p.id === selectedPlacementId)?.filters?.transparentBg || false}
                              onChange={(e) => {
                                const p = placements.find(x => x.id === selectedPlacementId);
                                if (p && p.filters) {
                                  updateSelectedPlacement({
                                    filters: {
                                      ...p.filters,
                                      transparentBg: e.target.checked
                                    }
                                  });
                                }
                              }}
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Reset button */}
                    <button 
                      onClick={() => {
                        const p = placements.find(x => x.id === selectedPlacementId);
                        if (p) {
                          updateSelectedPlacement({
                            rotation: 0,
                            flipX: false,
                            flipY: false,
                            filters: {
                              brightness: 0,
                              contrast: 0,
                              bwScan: 0,
                              removeBgVal: 0,
                              bgRemovedUrl: undefined,
                              transparentBg: false
                            }
                          });
                        }
                      }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-750 hover:text-white rounded-xl transition text-xs font-bold shadow-sm animate-in fade-in"
                    >
                      Reset Photo Changes
                    </button>
                  </div>
                ) : (
                  <span className="text-[10.5px] text-slate-500 font-medium italic block py-4 text-center bg-slate-800/10 border border-dashed border-slate-800 rounded-lg mt-2">Click any photo slot to customize photo filters & settings</span>
                )}
              </div>
            )}
          </div>

          {/* Section: Layer Size, Position & Styling */}
          <div className="border-b border-slate-800">
            <button 
              onClick={() => setIsRightStyleOpen(!isRightStyleOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-850/20 transition outline-none"
            >
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-violet-400" /> Sizing & Styling
              </h2>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isRightStyleOpen ? '' : '-rotate-90'}`} />
            </button>
            
            {isRightStyleOpen && (
              <div className="p-4 pt-0 flex flex-col gap-4">
                {selectedPlacementId && placements.some(p => p.id === selectedPlacementId) ? (
                  (() => {
                    const p = placements.find(x => x.id === selectedPlacementId)!;
                    return (
                      <div className="flex flex-col gap-3 animate-in fade-in duration-300 pt-2">
                        
                        {/* Layout: Size & Position Inputs */}
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manual Layout</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">WIDTH (%)</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="100"
                              value={Math.round(p.w)}
                              onChange={(e) => updateSelectedPlacement({ w: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-100 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">HEIGHT (%)</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="100"
                              value={Math.round(p.h)}
                              onChange={(e) => updateSelectedPlacement({ h: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-100 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">LEFT X (%)</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={Math.round(p.x)}
                              onChange={(e) => updateSelectedPlacement({ x: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-100 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">TOP Y (%)</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={Math.round(p.y)}
                              onChange={(e) => updateSelectedPlacement({ y: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-100 outline-none"
                            />
                          </div>
                        </div>

                        {/* Style: Borders, Opacity, Shadow */}
                        <div className="h-px bg-slate-800 my-1"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Borders & Styling</span>

                        {/* Border Radius */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-350">
                            <span>Round Corners</span>
                            <span className="text-violet-400">{p.borderRadius || '0px'}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {['0px', '4px', '12px', '50%'].map(radius => (
                              <button
                                key={radius}
                                onClick={() => updateSelectedPlacement({ borderRadius: radius })}
                                className={`py-1 text-[9px] font-bold rounded ${p.borderRadius === radius ? 'bg-violet-600 text-white' : 'bg-slate-850 text-slate-450 hover:text-slate-200 border border-slate-750'}`}
                              >
                                {radius === '50%' ? 'Circle' : radius}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Element Border width/color/style */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">BORDER (PX)</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="20"
                              value={p.borderWidth || 0}
                              onChange={(e) => updateSelectedPlacement({ borderWidth: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-100 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">BORDER COLOR</label>
                            <input 
                              type="color" 
                              value={p.borderColor || '#FFFFFF'}
                              onChange={(e) => updateSelectedPlacement({ borderColor: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 h-7 p-0 border-0 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        {p.borderWidth && p.borderWidth > 0 ? (
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">BORDER STYLE</label>
                            <select 
                              value={p.borderStyle || 'solid'}
                              onChange={(e) => updateSelectedPlacement({ borderStyle: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 text-[10px] px-2 py-1.5 rounded-md text-slate-350 outline-none"
                            >
                              <option value="solid">Solid</option>
                              <option value="double">Double</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                            </select>
                          </div>
                        ) : null}

                        {/* Opacity Slider */}
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-350">
                            <span>Layer Opacity</span>
                            <span className="text-violet-400">{Math.round((p.opacity !== undefined ? p.opacity : 1) * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            value={Math.round((p.opacity !== undefined ? p.opacity : 1) * 100)}
                            onChange={(e) => updateSelectedPlacement({ opacity: Number(e.target.value) / 100 })}
                            className="w-full accent-violet-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Drop Shadow Switch */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-350 mt-1">
                          <span>Shadow Effect</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={p.boxShadow || false}
                              onChange={(e) => updateSelectedPlacement({ boxShadow: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <span className="text-[10.5px] text-slate-500 font-medium italic block py-4 text-center bg-slate-800/10 border border-dashed border-slate-800 rounded-lg mt-2">Select any photo slot or text layer to edit layout, sizing & borders</span>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Layers Manager in the right panel */}
          <div className="border-b border-slate-800">
            <button 
              onClick={() => setIsRightLayersOpen(!isRightLayersOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-850/20 transition outline-none"
            >
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-violet-400" /> Layers Manager
              </h2>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isRightLayersOpen ? '' : '-rotate-90'}`} />
            </button>
            
            {isRightLayersOpen && (
              <div className="p-4 pt-0 flex flex-col">
                <div className="overflow-y-auto flex flex-col gap-1.5 pr-1 max-h-[220px]">
                  {[...placements]
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map(layer => {
                      const isSelected = selectedPlacementId === layer.id;
                      return (
                        <div 
                          key={layer.id}
                          onClick={() => setSelectedPlacementId(layer.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-300 ${isSelected ? 'bg-gradient-to-r from-violet-950/20 to-indigo-950/20 border-violet-500/40' : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/40'}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {layer.type === 'photo' ? (
                              <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="text-[11px] font-bold text-slate-200 truncate">
                              {layer.type === 'photo' 
                                ? (layer.url ? `Photo Slot (${layer.id})` : `Empty Photo Slot (${layer.id})`) 
                                : `Text Layer: "${layer.text || 'Untitled'}"`}
                            </span>
                          </div>
                          
                          {/* Controls inside layers item */}
                          <div className="flex items-center gap-1.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setPlacements(prev => prev.map(p => p.id === layer.id ? { ...p, visible: !p.visible } : p));
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition"
                              title="Toggle visibility"
                            >
                              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-red-400" />}
                            </button>
                            
                            <button 
                              onClick={() => {
                                setPlacements(prev => prev.filter(p => p.id !== layer.id));
                                if (isSelected) setSelectedPlacementId(null);
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                              title="Delete Layer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Layer Reordering (Z-index shifter controls) */}
                {selectedPlacementId && (
                  <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-850 mt-3 shrink-0">
                    <button onClick={() => handleLayerOrder('down')} className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-[10px] font-black rounded-lg transition" title="Move Layer Down">
                      <ChevronsDown size={14} className="mx-auto" />
                    </button>
                    <button onClick={() => handleLayerOrder('up')} className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-[10px] font-black rounded-lg transition" title="Move Layer Up">
                      <ChevronsUp size={14} className="mx-auto" />
                    </button>
                    <button onClick={() => handleLayerOrder('back')} className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-[9px] font-black rounded-lg transition">
                      BACK
                    </button>
                    <button onClick={() => handleLayerOrder('front')} className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-[9px] font-black rounded-lg transition">
                      FRONT
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Hidden File Input handler */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
      />

      {/* Hidden Custom Background File Input handler */}
      <input 
        type="file" 
        ref={bgFileInputRef}
        onChange={handleBgImageUpload}
        accept="image/*"
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
      />
    </div>
  );
};
