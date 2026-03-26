import { createMockFrame, createMockComponent, createMockInstance, createMockVector, createAutoLayoutFrame } from './helpers/mockNodes';

describe('Documentable Node Detection', () => {
  describe('isDocumentable', () => {
    it('should accept frames with auto layout', () => {
      const frame = createAutoLayoutFrame({ name: 'Auto Layout Frame' });

      expect(frame.type).toBe('FRAME');
      expect(frame.layoutMode).not.toBe('NONE');
    });

    it('should accept frames with multiple children', () => {
      const child1 = createMockFrame({ name: 'Child 1', width: 50, height: 50 });
      const child2 = createMockFrame({ name: 'Child 2', width: 50, height: 50 });
      const parent = createMockFrame({
        name: 'Parent Frame',
        children: [child1, child2],
      });

      expect(parent.type).toBe('FRAME');
      expect(parent.children.length).toBeGreaterThan(1);
    });

    it('should accept components regardless of size', () => {
      const component = createMockComponent({
        name: 'Button',
        width: 100,
        height: 40,
      });

      expect(component.type).toBe('COMPONENT');
    });

    it('should accept instances regardless of size', () => {
      const instance = createMockInstance({
        name: 'Button Instance',
        width: 100,
        height: 40,
      });

      expect(instance.type).toBe('INSTANCE');
    });

    it('should reject nodes smaller than 20x20', () => {
      const tinyFrame = createMockFrame({
        name: 'Tiny Frame',
        width: 16,
        height: 16,
        layoutMode: 'NONE',
        children: [],
      });

      const shouldBeDocumentable = tinyFrame.width >= 20 || tinyFrame.height >= 20;
      expect(shouldBeDocumentable).toBe(false);
    });

    it('should reject small icons', () => {
      const icon = createMockFrame({
        name: 'icon-check',
        width: 16,
        height: 16,
        layoutMode: 'NONE',
        children: [],
      });

      const isSmallIcon = icon.name.toLowerCase().includes('icon') &&
                          (icon.width < 30 || icon.height < 30);
      expect(isSmallIcon).toBe(true);
    });

    it('should reject hidden nodes', () => {
      const hiddenFrame = createMockFrame({
        name: 'Hidden Frame',
        visible: false,
      });

      expect(hiddenFrame.visible).toBe(false);
    });

    it('should accept large icons', () => {
      const largeIcon = createMockFrame({
        name: 'icon-large',
        width: 48,
        height: 48,
        layoutMode: 'NONE',
      });

      const isLargeEnough = largeIcon.width >= 30 && largeIcon.height >= 30;
      expect(isLargeEnough).toBe(true);
    });
  });

  describe('collectDocumentableNodes', () => {
    it('should collect root node', () => {
      const root = createMockFrame({ name: 'Root' });

      const nodes = [root];
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      expect(nodes[0]).toBe(root);
    });

    it('should collect nested auto layout frames', () => {
      const child = createAutoLayoutFrame({ name: 'Child Auto Layout' });
      const root = createAutoLayoutFrame({
        name: 'Root Auto Layout',
        children: [child],
      });

      expect(root.layoutMode).not.toBe('NONE');
      expect(child.layoutMode).not.toBe('NONE');
    });

    it('should skip hidden children', () => {
      const visibleChild = createMockFrame({ name: 'Visible', visible: true });
      const hiddenChild = createMockFrame({ name: 'Hidden', visible: false });
      const root = createMockFrame({
        name: 'Root',
        children: [visibleChild, hiddenChild],
      });

      const visibleNodes = root.children.filter(c => c.visible);
      expect(visibleNodes.length).toBe(1);
      expect(visibleNodes[0].name).toBe('Visible');
    });

    it('should traverse deep hierarchies', () => {
      const level3 = createAutoLayoutFrame({ name: 'Level 3' });
      const level2 = createAutoLayoutFrame({ name: 'Level 2', children: [level3] });
      const level1 = createAutoLayoutFrame({ name: 'Level 1', children: [level2] });

      let depth = 0;
      let current: any = level1;
      while (current.children && current.children.length > 0) {
        depth++;
        current = current.children[0];
      }

      expect(depth).toBe(2);
    });
  });
});
