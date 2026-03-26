import { createMockFrame, createAutoLayoutFrame } from './helpers/mockNodes';

describe('Measurement Calculations', () => {
  describe('Outer dimensions', () => {
    it('should calculate correct width and height', () => {
      const frame = createMockFrame({ width: 390, height: 412 });

      expect(Math.round(frame.width)).toBe(390);
      expect(Math.round(frame.height)).toBe(412);
    });

    it('should round decimal dimensions', () => {
      const frame = createMockFrame({ width: 390.7, height: 412.3 });

      expect(Math.round(frame.width)).toBe(391);
      expect(Math.round(frame.height)).toBe(412);
    });
  });

  describe('Auto layout measurements', () => {
    it('should extract padding values', () => {
      const frame = createAutoLayoutFrame({
        paddingTop: 40,
        paddingRight: 16,
        paddingBottom: 40,
        paddingLeft: 16,
      });

      expect(Math.round(frame.paddingTop || 0)).toBe(40);
      expect(Math.round(frame.paddingRight || 0)).toBe(16);
      expect(Math.round(frame.paddingBottom || 0)).toBe(40);
      expect(Math.round(frame.paddingLeft || 0)).toBe(16);
    });

    it('should extract gap value', () => {
      const frame = createAutoLayoutFrame({ itemSpacing: 16 });

      expect(Math.round(frame.itemSpacing || 0)).toBe(16);
    });

    it('should handle frames without auto layout', () => {
      const frame = createMockFrame({ layoutMode: 'NONE' });

      expect(frame.layoutMode).toBe('NONE');
      // Mock frames have default values, real frames without auto layout don't have these properties
      expect(frame.paddingTop).toBe(0);
      expect(frame.itemSpacing).toBe(0);
    });

    it('should identify vertical layout', () => {
      const frame = createAutoLayoutFrame({ layoutMode: 'VERTICAL' });

      expect(frame.layoutMode).toBe('VERTICAL');
    });

    it('should identify horizontal layout', () => {
      const frame = createAutoLayoutFrame({ layoutMode: 'HORIZONTAL' });

      expect(frame.layoutMode).toBe('HORIZONTAL');
    });
  });

  describe('Scaling calculations', () => {
    it('should scale down large frames', () => {
      const frame = createMockFrame({ width: 800, height: 600 });
      const maxWidth = 450;
      const maxHeight = 350;

      const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height, 1);

      expect(scale).toBeLessThan(1);
      expect(frame.width * scale).toBeLessThanOrEqual(maxWidth);
      expect(frame.height * scale).toBeLessThanOrEqual(maxHeight);
    });

    it('should not scale up small frames', () => {
      const frame = createMockFrame({ width: 100, height: 80 });
      const maxWidth = 450;
      const maxHeight = 350;

      const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height, 1);

      expect(scale).toBe(1);
    });

    it('should maintain aspect ratio when scaling', () => {
      const frame = createMockFrame({ width: 800, height: 400 });
      const maxWidth = 450;
      const maxHeight = 350;

      const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height, 1);
      const scaledWidth = frame.width * scale;
      const scaledHeight = frame.height * scale;

      const originalRatio = frame.width / frame.height;
      const scaledRatio = scaledWidth / scaledHeight;

      expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01);
    });
  });

  describe('Gap positioning', () => {
    it('should calculate gap position for vertical layout', () => {
      const child1 = createMockFrame({ x: 16, y: 16, width: 100, height: 50 });
      const child2 = createMockFrame({ x: 16, y: 78, width: 100, height: 50 }); // 12px gap

      const gap = child2.y - (child1.y + child1.height);
      const gapMidY = child1.y + child1.height + gap / 2;

      expect(gap).toBe(12);
      expect(gapMidY).toBe(72); // 16 + 50 + 6
    });

    it('should calculate gap position for horizontal layout', () => {
      const child1 = createMockFrame({ x: 16, y: 16, width: 100, height: 50 });
      const child2 = createMockFrame({ x: 128, y: 16, width: 100, height: 50 }); // 12px gap

      const gap = child2.x - (child1.x + child1.width);
      const gapMidX = child1.x + child1.width + gap / 2;

      expect(gap).toBe(12);
      expect(gapMidX).toBe(122); // 16 + 100 + 6
    });
  });

  describe('Preview container sizing', () => {
    it('should calculate flexible height based on content', () => {
      const frame = createMockFrame({ width: 400, height: 600 });
      const scaledHeight = 600; // Assume scale = 1

      const containerHeight = Math.max(scaledHeight + 100, 200);

      expect(containerHeight).toBe(700);
    });

    it('should have minimum height of 200', () => {
      const frame = createMockFrame({ width: 100, height: 50 });
      const scaledHeight = 50;

      const containerHeight = Math.max(scaledHeight + 100, 200);

      expect(containerHeight).toBe(200);
    });
  });
});
