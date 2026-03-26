declare global {
  var figma: {
    createFrame: jest.Mock;
    createText: jest.Mock;
    createLine: jest.Mock;
    loadFontAsync: jest.Mock;
    currentPage: {
      selection: any[];
      appendChild: jest.Mock;
    };
    viewport: {
      scrollAndZoomIntoView: jest.Mock;
    };
    ui: {
      postMessage: jest.Mock;
      onmessage: any;
    };
    showUI: jest.Mock;
    closePlugin: jest.Mock;
  };
}

export {};
