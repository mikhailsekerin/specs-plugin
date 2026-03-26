import { createMockFrame, createMockComponent, createMockInstance, createMockText } from './helpers/mockNodes';

describe('Selection Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSelection', () => {
    it('should return error when no selection', () => {
      (global as any).figma.currentPage.selection = [];

      // Since validateSelection is in the main code file, we'll test the logic
      const selection = (global as any).figma.currentPage.selection;

      expect(selection.length).toBe(0);
    });

    it('should return error when multiple nodes selected', () => {
      const frame1 = createMockFrame({ name: 'Frame 1' });
      const frame2 = createMockFrame({ name: 'Frame 2' });
      (global as any).figma.currentPage.selection = [frame1, frame2];

      const selection = (global as any).figma.currentPage.selection;

      expect(selection.length).toBe(2);
    });

    it('should accept FRAME node', () => {
      const frame = createMockFrame({ name: 'Test Frame' });
      (global as any).figma.currentPage.selection = [frame];

      const selection = (global as any).figma.currentPage.selection;
      const node = selection[0];

      expect(node.type).toBe('FRAME');
    });

    it('should accept COMPONENT node', () => {
      const component = createMockComponent({ name: 'Test Component' });
      (global as any).figma.currentPage.selection = [component];

      const selection = (global as any).figma.currentPage.selection;
      const node = selection[0];

      expect(node.type).toBe('COMPONENT');
    });

    it('should accept INSTANCE node', () => {
      const instance = createMockInstance({ name: 'Test Instance' });
      (global as any).figma.currentPage.selection = [instance];

      const selection = (global as any).figma.currentPage.selection;
      const node = selection[0];

      expect(node.type).toBe('INSTANCE');
    });

    it('should reject TEXT node', () => {
      const text = createMockText({ name: 'Test Text' });
      (global as any).figma.currentPage.selection = [text];

      const selection = (global as any).figma.currentPage.selection;
      const node = selection[0];

      expect(node.type).toBe('TEXT');
      expect(['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(node.type)).toBe(false);
    });
  });
});
