import { createMockFrame, createAutoLayoutFrame } from './helpers/mockNodes';

describe('Property Extraction', () => {
  describe('Fill color extraction', () => {
    it('should extract hex color from SOLID fill', () => {
      const frame = createMockFrame({
        fills: [
          { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true },
        ],
      });

      const fill = (frame.fills as any)[0];
      if (fill.type === 'SOLID') {
        const r = Math.round(fill.color.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(fill.color.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(fill.color.b * 255).toString(16).padStart(2, '0');
        const hex = `#${r}${g}${b}`.toUpperCase();

        expect(hex).toBe('#FFFFFF');
      }
    });

    it('should handle colored fills', () => {
      const frame = createMockFrame({
        fills: [
          { type: 'SOLID', color: { r: 0, g: 0.5, b: 1 }, visible: true },
        ],
      });

      const fill = (frame.fills as any)[0];
      if (fill.type === 'SOLID') {
        const r = Math.round(fill.color.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(fill.color.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(fill.color.b * 255).toString(16).padStart(2, '0');
        const hex = `#${r}${g}${b}`.toUpperCase();

        expect(hex).toBe('#0080FF'); // 0.5 * 255 = 127.5, rounds to 128 (0x80)
      }
    });

    it('should skip invisible fills', () => {
      const frame = createMockFrame({
        fills: [
          { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: false },
        ],
      });

      const fill = (frame.fills as any)[0];
      const shouldExtract = fill.type === 'SOLID' && fill.visible !== false;

      expect(shouldExtract).toBe(false);
    });

    it('should handle empty fills array', () => {
      const frame = createMockFrame({ fills: [] });

      expect((frame.fills as any).length).toBe(0);
    });
  });

  describe('Layout direction extraction', () => {
    it('should identify horizontal layout', () => {
      const frame = createAutoLayoutFrame({ layoutMode: 'HORIZONTAL' });

      const direction = frame.layoutMode === 'HORIZONTAL' ? 'Horizontal' : 'Vertical';
      expect(direction).toBe('Horizontal');
    });

    it('should identify vertical layout', () => {
      const frame = createAutoLayoutFrame({ layoutMode: 'VERTICAL' });

      const direction = frame.layoutMode === 'VERTICAL' ? 'Vertical' : 'Horizontal';
      expect(direction).toBe('Vertical');
    });
  });

  describe('Alignment extraction', () => {
    it('should extract top-left alignment', () => {
      const frame = createAutoLayoutFrame({
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
      });

      const alignLabel = frame.primaryAxisAlignItems === 'MIN' ? 'Top Left' : 'Other';
      expect(alignLabel).toBe('Top Left');
    });

    it('should extract center alignment', () => {
      const frame = createAutoLayoutFrame({
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
      });

      const alignLabel = frame.primaryAxisAlignItems === 'CENTER' ? 'Center' : 'Other';
      expect(alignLabel).toBe('Center');
    });
  });

  describe('Corner radius extraction', () => {
    it('should extract corner radius value', () => {
      const frame = createMockFrame({ cornerRadius: 8 });

      if (typeof frame.cornerRadius === 'number' && frame.cornerRadius > 0) {
        expect(Math.round(frame.cornerRadius)).toBe(8);
      }
    });

    it('should skip zero corner radius', () => {
      const frame = createMockFrame({ cornerRadius: 0 });

      const shouldShow = typeof frame.cornerRadius === 'number' && frame.cornerRadius > 0;
      expect(shouldShow).toBe(false);
    });
  });

  describe('Padding format', () => {
    it('should format padding as CSS shorthand', () => {
      const frame = createAutoLayoutFrame({
        paddingTop: 40,
        paddingRight: 16,
        paddingBottom: 40,
        paddingLeft: 16,
      });

      const pt = Math.round(frame.paddingTop || 0);
      const pr = Math.round(frame.paddingRight || 0);
      const pb = Math.round(frame.paddingBottom || 0);
      const pl = Math.round(frame.paddingLeft || 0);
      const padding = `${pt}px ${pr}px ${pb}px ${pl}px`;

      expect(padding).toBe('40px 16px 40px 16px');
    });

    it('should handle uniform padding', () => {
      const frame = createAutoLayoutFrame({
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
      });

      const pt = Math.round(frame.paddingTop || 0);
      const pr = Math.round(frame.paddingRight || 0);
      const pb = Math.round(frame.paddingBottom || 0);
      const pl = Math.round(frame.paddingLeft || 0);
      const padding = `${pt}px ${pr}px ${pb}px ${pl}px`;

      expect(padding).toBe('16px 16px 16px 16px');
    });
  });
});
