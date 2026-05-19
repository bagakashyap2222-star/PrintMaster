import { ImageItem } from "../../App";

export type LayoutOrientation = 'landscape' | 'portrait';

export interface AlbumTemplateSlot {
  id: string; // unique within template
  x: number; // 0-1 percentage
  y: number; // 0-1 percentage
  w: number; // 0-1 percentage
  h: number; // 0-1 percentage
  zIndex?: number;
}

export interface AlbumTemplate {
  id: string;
  name: string;
  category: 'grid' | 'asymmetrical' | 'full' | 'collage';
  orientation: LayoutOrientation; // The intended orientation, or 'both' if it can adapt
  slots: AlbumTemplateSlot[];
}

// Helper to generate a simple grid template
const makeGrid = (id: string, name: string, cols: number, rows: number, orientation: LayoutOrientation): AlbumTemplate => {
  const slots: AlbumTemplateSlot[] = [];
  const slotW = 1 / cols;
  const slotH = 1 / rows;
  let cnt = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ id: `slot-${cnt++}`, x: c * slotW, y: r * slotH, w: slotW, h: slotH });
    }
  }
  return { id, name, category: 'grid', orientation, slots };
};

// Generate 20+ templates
export const ALBUM_TEMPLATES: AlbumTemplate[] = [
  makeGrid('grid-1x1-l', 'Full Spread (L)', 1, 1, 'landscape'),
  makeGrid('grid-1x1-p', 'Full Spread (P)', 1, 1, 'portrait'),
  makeGrid('grid-2x1-l', '2 Horizontal (L)', 2, 1, 'landscape'),
  makeGrid('grid-1x2-l', '2 Vertical (L)', 1, 2, 'landscape'),
  makeGrid('grid-1x2-p', '2 Horizontal (P)', 1, 2, 'portrait'),
  makeGrid('grid-2x1-p', '2 Vertical (P)', 2, 1, 'portrait'),
  makeGrid('grid-2x2-l', '2x2 Grid (L)', 2, 2, 'landscape'),
  makeGrid('grid-2x2-p', '2x2 Grid (P)', 2, 2, 'portrait'),
  makeGrid('grid-3x2-l', '3x2 Grid (L)', 3, 2, 'landscape'),
  makeGrid('grid-2x3-p', '2x3 Grid (P)', 2, 3, 'portrait'),
  makeGrid('grid-3x3-l', '3x3 Grid (L)', 3, 3, 'landscape'),
  makeGrid('grid-3x3-p', '3x3 Grid (P)', 3, 3, 'portrait'),
  makeGrid('grid-4x4-l', '4x4 Grid (L)', 4, 4, 'landscape'),
  
  // Asymmetrical Landscape
  {
    id: 'asym-3-feat-l', name: 'Feature + 2 (L)', category: 'asymmetrical', orientation: 'landscape',
    slots: [
      { id: '1', x: 0, y: 0, w: 0.66, h: 1 },
      { id: '2', x: 0.66, y: 0, w: 0.34, h: 0.5 },
      { id: '3', x: 0.66, y: 0.5, w: 0.34, h: 0.5 }
    ]
  },
  {
    id: 'asym-4-feat-l', name: 'Feature + 3 (L)', category: 'asymmetrical', orientation: 'landscape',
    slots: [
      { id: '1', x: 0, y: 0, w: 0.7, h: 1 },
      { id: '2', x: 0.7, y: 0, w: 0.3, h: 0.333 },
      { id: '3', x: 0.7, y: 0.333, w: 0.3, h: 0.334 },
      { id: '4', x: 0.7, y: 0.667, w: 0.3, h: 0.333 }
    ]
  },
  {
    id: 'asym-top-feat-l', name: 'Top Feature + 3 (L)', category: 'asymmetrical', orientation: 'landscape',
    slots: [
      { id: '1', x: 0, y: 0, w: 1, h: 0.6 },
      { id: '2', x: 0, y: 0.6, w: 0.333, h: 0.4 },
      { id: '3', x: 0.333, y: 0.6, w: 0.334, h: 0.4 },
      { id: '4', x: 0.667, y: 0.6, w: 0.333, h: 0.4 }
    ]
  },
  {
    id: 'overlap-3-l', name: 'Overlapping 3 (L)', category: 'collage', orientation: 'landscape',
    slots: [
      { id: '1', x: 0.05, y: 0.1, w: 0.4, h: 0.6, zIndex: 1 },
      { id: '2', x: 0.55, y: 0.1, w: 0.4, h: 0.6, zIndex: 2 },
      { id: '3', x: 0.3, y: 0.3, w: 0.4, h: 0.6, zIndex: 3 }
    ]
  },
  
  // Asymmetrical Portrait
  {
    id: 'asym-3-feat-p', name: 'Feature + 2 (P)', category: 'asymmetrical', orientation: 'portrait',
    slots: [
      { id: '1', x: 0, y: 0, w: 1, h: 0.6 },
      { id: '2', x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { id: '3', x: 0.5, y: 0.6, w: 0.5, h: 0.4 }
    ]
  },
  {
    id: 'asym-4-feat-p', name: 'Feature + 3 (P)', category: 'asymmetrical', orientation: 'portrait',
    slots: [
      { id: '1', x: 0, y: 0, w: 1, h: 0.5 },
      { id: '2', x: 0, y: 0.5, w: 0.333, h: 0.25 },
      { id: '3', x: 0.333, y: 0.5, w: 0.334, h: 0.25 },
      { id: '4', x: 0.667, y: 0.5, w: 0.333, h: 0.25 },
      { id: '5', x: 0, y: 0.75, w: 1, h: 0.25 }
    ]
  },
  {
    id: 'center-feat-5-p', name: 'Center Feature + 4 (P)', category: 'asymmetrical', orientation: 'portrait',
    slots: [
      { id: '1', x: 0, y: 0, w: 0.5, h: 0.3 },
      { id: '2', x: 0.5, y: 0, w: 0.5, h: 0.3 },
      { id: '3', x: 0, y: 0.3, w: 1, h: 0.4 },
      { id: '4', x: 0, y: 0.7, w: 0.5, h: 0.3 },
      { id: '5', x: 0.5, y: 0.7, w: 0.5, h: 0.3 },
    ]
  },
  {
    id: 'film-strip-p', name: 'Film Strip (P)', category: 'asymmetrical', orientation: 'portrait',
    slots: [
      { id: '1', x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
      { id: '2', x: 0.1, y: 0.28, w: 0.8, h: 0.2 },
      { id: '3', x: 0.1, y: 0.51, w: 0.8, h: 0.2 },
      { id: '4', x: 0.1, y: 0.74, w: 0.8, h: 0.2 }
    ]
  },
  
  // A few more creative ones
  {
    id: 'polaroid-scatter-l', name: 'Polaroid Scatter (L)', category: 'collage', orientation: 'landscape',
    slots: [
      { id: '1', x: 0.05, y: 0.05, w: 0.3, h: 0.4, zIndex: 2 },
      { id: '2', x: 0.35, y: 0.1, w: 0.3, h: 0.4, zIndex: 1 },
      { id: '3', x: 0.65, y: 0.05, w: 0.3, h: 0.4, zIndex: 2 },
      { id: '4', x: 0.2, y: 0.5, w: 0.3, h: 0.4, zIndex: 3 },
      { id: '5', x: 0.5, y: 0.5, w: 0.3, h: 0.4, zIndex: 4 }
    ]
  }
];

export interface PlacedImage {
  id: string; // unique id in album
  url: string;
  sourceImageId?: string; // id from the global image library
  text?: string;
  filters?: {
    brightness: number;
    contrast: number;
    bw: boolean;
  };
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  overlayUrl?: string;
  overlayOpacity?: number;
}

export interface AlbumPage {
  id: string;
  templateId: string;
  bgColor: string; // hex
  bgImage?: string;
  bgImageOpacity?: number;
  placements: Record<string, PlacedImage>; // slotId -> PlacedImage
}
