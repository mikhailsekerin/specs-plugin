# Component Spec Generator - Figma Plugin

A Figma plugin that generates comprehensive spacing documentation boards for components and frames.

## Features

- 📐 **Automatic Measurements** - Dimensions, padding, gaps, and spacing
- 🎯 **Visual Annotations** - Red measurement lines and highlighted areas
- 📊 **Multi-row Documentation** - Hierarchical breakdown of nested structures
- 🎨 **Clean Layout** - Professional documentation board styling
- ✨ **Smart Badge Positioning** - Automatic collision detection for measurements

## Installation

```bash
npm install
```

## Development

### Build the plugin
```bash
npm run build
```

### Watch mode (auto-rebuild)
```bash
npm run watch
```

### Run tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test:watch
```

### Generate coverage report
```bash
npm test:coverage
```

## Testing

The plugin includes comprehensive test coverage:

- **Unit Tests** - Core logic and calculations
- **Integration Tests** - End-to-end workflows
- **Mock Helpers** - Simulated Figma API for testing

Test files are located in `/tests`:
- `validation.test.ts` - Selection validation
- `documentableNodes.test.ts` - Node filtering logic
- `collisionDetection.test.ts` - Badge positioning
- `measurements.test.ts` - Spacing calculations
- `propertyExtraction.test.ts` - Property parsing
- `integration.test.ts` - Full workflow tests

## Usage in Figma

1. Select a frame, component, or instance
2. Run the plugin
3. Toggle "Generate rows for nested frames" to include children
4. Click "Generate Spec"

The plugin will create a documentation board with:
- Hierarchy tree (left column)
- Visual preview with measurements (center)
- Property inspector (right column)

## Architecture

```
src/
├── code.ts              # Main plugin logic
├── ui.html              # Plugin UI
└── types.ts             # TypeScript interfaces (implicit)

tests/
├── setup.ts             # Test configuration
├── helpers/             # Mock utilities
└── *.test.ts            # Test suites
```

## License

MIT
