import type { DrawingViewport } from './types';

export type Rect = { x: number; y: number; width: number; height: number };

export function mapCanvasRectToPage(rect: Rect, viewport: DrawingViewport, page: { width: number; height: number }): Rect {
  return {
    x: ((rect.x - viewport.x) / viewport.width) * page.width,
    y: ((rect.y - viewport.y) / viewport.height) * page.height,
    width: (rect.width / viewport.width) * page.width,
    height: (rect.height / viewport.height) * page.height,
  };
}
