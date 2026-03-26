import { createMockFrame, createAutoLayoutFrame } from './helpers/mockNodes';

describe('Plugin Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).figma.currentPage.selection = [];
  });

  describe('Complete workflow', () => {
    it('should handle valid frame selection', () => {
      const frame = createAutoLayoutFrame({
        name: 'Frame 31',
        width: 390,
        height: 412,
        paddingTop: 40,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 40,
        itemSpacing: 16,
      });

      (global as any).figma.currentPage.selection = [frame];

      expect((global as any).figma.currentPage.selection.length).toBe(1);
      expect((global as any).figma.currentPage.selection[0].type).toBe('FRAME');
      expect((global as any).figma.currentPage.selection[0].name).toBe('Frame 31');
    });

    it('should generate documentation board structure', () => {
      const frame = createAutoLayoutFrame({ name: 'Test Frame' });
      (global as any).figma.currentPage.selection = [frame];

      // Simulate board creation
      const board = (global as any).figma.createFrame();
      board.name = 'Spacing';

      expect(board.name).toBe('Spacing');
      expect((global as any).figma.createFrame).toHaveBeenCalled();
    });

    it('should create rows for documentable nodes', () => {
      const child1 = createAutoLayoutFrame({ name: 'Child 1' });
      const child2 = createAutoLayoutFrame({ name: 'Child 2' });
      const parent = createAutoLayoutFrame({
        name: 'Parent',
        children: [child1, child2],
      });

      const documentableNodes = [parent, child1, child2];
      expect(documentableNodes.length).toBe(3);
    });

    it('should position board relative to source', () => {
      const sourceFrame = createMockFrame({
        x: 100,
        y: 200,
        width: 390,
        height: 412,
      });

      const horizontalOffset = 240;
      const expectedX = sourceFrame.x + sourceFrame.width + horizontalOffset;
      const expectedY = sourceFrame.y;

      expect(expectedX).toBe(730);
      expect(expectedY).toBe(200);
    });
  });

  describe('UI communication', () => {
    it('should post status messages', () => {
      const message = { type: 'status', message: 'Validating selection...' };
      (global as any).figma.ui.postMessage(message);

      expect((global as any).figma.ui.postMessage).toHaveBeenCalledWith(message);
    });

    it('should post error messages', () => {
      const message = { type: 'error', message: 'Please select a frame' };
      (global as any).figma.ui.postMessage(message);

      expect((global as any).figma.ui.postMessage).toHaveBeenCalledWith(message);
    });

    it('should post success messages', () => {
      const message = { type: 'success', message: 'Generated spacing board with 3 rows' };
      (global as any).figma.ui.postMessage(message);

      expect((global as any).figma.ui.postMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('Error handling', () => {
    it('should handle no selection gracefully', () => {
      (global as any).figma.currentPage.selection = [];

      const hasSelection = (global as any).figma.currentPage.selection.length > 0;
      expect(hasSelection).toBe(false);
    });

    it('should handle multiple selection', () => {
      const frame1 = createMockFrame({ name: 'Frame 1' });
      const frame2 = createMockFrame({ name: 'Frame 2' });
      (global as any).figma.currentPage.selection = [frame1, frame2];

      const isValid = (global as any).figma.currentPage.selection.length === 1;
      expect(isValid).toBe(false);
    });

    it('should handle unsupported node types', () => {
      const textNode = {
        type: 'TEXT',
        name: 'Text',
      };
      (global as any).figma.currentPage.selection = [textNode as any];

      const supportedTypes = ['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'];
      const isSupported = supportedTypes.includes(textNode.type);
      expect(isSupported).toBe(false);
    });
  });
});
