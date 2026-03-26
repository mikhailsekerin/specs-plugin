// Mock Figma API globals
(global as any).figma = {
  createFrame: jest.fn(() => ({
    name: '',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    layoutMode: 'NONE',
    fills: [],
    strokes: [],
    cornerRadius: 0,
    resize: jest.fn(),
    appendChild: jest.fn(),
  })),
  createText: jest.fn(() => ({
    characters: '',
    fontSize: 12,
    fontName: { family: 'Inter', style: 'Regular' },
    fills: [],
    x: 0,
    y: 0,
    width: 50,
    height: 20,
    resize: jest.fn(),
  })),
  createLine: jest.fn(() => ({
    x: 0,
    y: 0,
    rotation: 0,
    strokes: [],
    strokeWeight: 1,
    resize: jest.fn(),
  })),
  loadFontAsync: jest.fn(() => Promise.resolve()),
  currentPage: {
    selection: [],
    appendChild: jest.fn(),
  },
  viewport: {
    scrollAndZoomIntoView: jest.fn(),
  },
  ui: {
    postMessage: jest.fn(),
    onmessage: null,
  },
  showUI: jest.fn(),
  closePlugin: jest.fn(),
} as any;
