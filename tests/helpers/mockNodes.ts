/// <reference types="@figma/plugin-typings" />

// Helper functions to create mock Figma nodes for testing

export function createMockFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    type: 'FRAME',
    name: 'Test Frame',
    id: 'test-id',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    rotation: 0,
    layoutMode: 'NONE',
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    itemSpacing: 0,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }],
    strokes: [],
    cornerRadius: 0,
    children: [],
    parent: null,
    clone: jest.fn(),
    resize: jest.fn(),
    appendChild: jest.fn(),
    ...overrides,
  } as any as FrameNode;
}

export function createMockComponent(overrides: Partial<ComponentNode> = {}): ComponentNode {
  return {
    type: 'COMPONENT',
    name: 'Test Component',
    id: 'component-id',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    layoutMode: 'NONE',
    fills: [],
    strokes: [],
    cornerRadius: 0,
    children: [],
    parent: null,
    clone: jest.fn(),
    resize: jest.fn(),
    appendChild: jest.fn(),
    ...overrides,
  } as any as ComponentNode;
}

export function createMockInstance(overrides: Partial<InstanceNode> = {}): InstanceNode {
  return {
    type: 'INSTANCE',
    name: 'Test Instance',
    id: 'instance-id',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    fills: [],
    strokes: [],
    children: [],
    parent: null,
    mainComponent: null,
    componentProperties: {},
    clone: jest.fn(),
    resize: jest.fn(),
    appendChild: jest.fn(),
    ...overrides,
  } as any as InstanceNode;
}

export function createMockText(overrides: Partial<TextNode> = {}): TextNode {
  return {
    type: 'TEXT',
    name: 'Test Text',
    id: 'text-id',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 50,
    height: 20,
    rotation: 0,
    characters: 'Test',
    fontSize: 12,
    fontName: { family: 'Inter', style: 'Regular' },
    fills: [],
    strokes: [],
    parent: null,
    clone: jest.fn(),
    resize: jest.fn(),
    ...overrides,
  } as any as TextNode;
}

export function createMockVector(overrides: Partial<VectorNode> = {}): VectorNode {
  return {
    type: 'VECTOR',
    name: 'Test Vector',
    id: 'vector-id',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    rotation: 0,
    fills: [],
    strokes: [],
    parent: null,
    clone: jest.fn(),
    ...overrides,
  } as any as VectorNode;
}

export function createAutoLayoutFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return createMockFrame({
    layoutMode: 'VERTICAL',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    itemSpacing: 12,
    ...overrides,
  });
}
