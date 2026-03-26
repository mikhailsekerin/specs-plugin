# Code Analysis: Bugs and Layout Problems

## Critical Issues

### 1. ❌ CRITICAL: Line Drawing Bug (Lines 260-279)

**Location**: `createMeasurementLine()` function

**Problem**: The line rotation logic is fundamentally broken. The function uses:
```typescript
line.resize(Math.abs(deltaX), Math.abs(deltaY));
line.rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
```

**Why it's broken**:
- Using `Math.abs()` on both delta values loses directional information
- Figma lines don't resize correctly with both width and height non-zero
- After resize, a Figma line's local coordinates are (0,0) to (width, 0), then rotation is applied
- This causes incorrect rendering of vertical and connector lines

**Impact**:
- Vertical connector lines may not display correctly
- Horizontal connector lines may render backwards
- Measurement lines may appear in wrong positions or orientations

**Fix Required**:
```typescript
function createMeasurementLine(x1: number, y1: number, x2: number, y2: number, color?: RGB): LineNode {
  const line = figma.createLine();
  line.x = x1;
  line.y = y1;

  const deltaX = x2 - x1;
  const deltaY = y2 - y1;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Resize to length, then rotate
  line.resize(length, 0);
  line.rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  line.strokes = [{ type: 'SOLID', color: color || { r: 1, g: 0.2, b: 0.2 } }];
  line.strokeWeight = 1;

  return line;
}
```

---

### 2. ⚠️ CRITICAL: Node Index Mismatch After Cloning (Lines 511-529)

**Location**: `createMeasurementPreview()` - parent cloning logic

**Problem**:
```typescript
const nodeIndex = node.parent.children.indexOf(node);
if (nodeIndex >= 0 && nodeIndex < cloned.children.length) {
  focusNode = cloned.children[nodeIndex];
```

**Why it's problematic**:
- Cloning may filter out invisible, locked, or problematic nodes
- The `children` array indices in the clone may not match the original
- This causes measurements to be placed on the WRONG child node
- If index is out of bounds, `focusNode` stays null and measurements break

**Impact**:
- Measurements displayed on wrong sibling elements
- Focus outline highlights wrong node
- Padding/gap measurements misaligned

**Fix Required**:
```typescript
// Find child by matching properties, not index
if ('children' in cloned && 'children' in node.parent) {
  // Try to match by ID first
  focusNode = cloned.children.find(c => c.id === node.id);

  // If ID doesn't match (due to cloning), match by position and size
  if (!focusNode) {
    focusNode = cloned.children.find(c =>
      Math.abs(c.x - node.x) < 0.1 &&
      Math.abs(c.y - node.y) < 0.1 &&
      Math.abs(c.width - node.width) < 0.1 &&
      Math.abs(c.height - node.height) < 0.1
    );
  }

  // If still not found, fall back to name matching
  if (!focusNode) {
    focusNode = cloned.children.find(c => c.name === node.name);
  }

  if (focusNode) {
    focusNodeRelativePos = { x: node.x, y: node.y };
  }
}
```

---

### 3. ⚠️ HIGH: Container Size May Clip Measurements (Lines 597-600)

**Location**: Preview container sizing

**Problem**:
```typescript
const containerHeight = Math.max(cloned.height + 100, 200);
```

**Why it's problematic**:
- Measurement lines extend 20px outside parent bounds
- Badges can extend 30-40px beyond lines (badge width + collision offset)
- Connector lines add another 20px
- Total possible extension: ~60-80px beyond parent edge
- Container only adds 100px margin, which may not be enough for large nodes
- With minimum 200px, small nodes get asymmetric spacing

**Impact**:
- Measurement badges may be clipped or hidden
- Connector lines may not fully render
- Layout looks cramped for large elements

**Fix Required**:
```typescript
// Calculate actual measurement extent
const measurementMargin = 80; // 20px line + 40px badge + 20px safety
const containerHeight = Math.max(cloned.height + (measurementMargin * 2), 300);
const containerWidth = PREVIEW_COLUMN_WIDTH;

// Ensure measurements layer is sized to accommodate overflow
const measurementsWidth = cloned.width + (measurementMargin * 2);
const measurementsHeight = cloned.height + (measurementMargin * 2);
```

---

## High Priority Issues

### 4. ⚠️ Badge Bounds Checking Doesn't Account for Offsets (Lines 678-686, etc.)

**Location**: Multiple badge placement calls

**Problem**:
```typescript
pos = findNonOverlappingPosition(
  childRelativeX + focusWidth / 2 - 15, topLineY - 10,
  BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX,
  badgePositions,
  { width: cloned.width, height: cloned.height }  // ← bounds don't account for childRelativeX offset
);
```

**Why it's problematic**:
- Badge X position includes `childRelativeX` offset
- Bounds checking compares absolute badge position against cloned dimensions
- When child is not at (0,0) within parent, bounds check can incorrectly reject valid positions
- Causes badges to fall back to preferred position even when alternatives exist

**Impact**:
- More badge collisions than necessary
- Badges appear in suboptimal positions
- Overlapping badges in dense layouts

**Fix Required**:
```typescript
// Adjust bounds to be relative to measurements frame, not child position
const measurementBounds = {
  width: cloned.width + 100,  // Add margin for measurements outside bounds
  height: cloned.height + 100
};

pos = findNonOverlappingPosition(
  childRelativeX + focusWidth / 2 - 15, topLineY - 10,
  BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX,
  badgePositions,
  measurementBounds
);
```

---

### 5. ⚠️ Gap Calculations May Use Wrong Coordinate Space (Lines 919-922, 960-963)

**Location**: Gap measurement positioning

**Problem**:
```typescript
const gapTop = childRelativeY + (child.y + child.height) * scale;
```

**Why it needs verification**:
- `child.y` is relative to the node being measured (not to cloned parent)
- When showing parent context, coordinates need careful translation
- If child coordinates are already scaled, applying scale again would be wrong

**Impact**:
- Gap highlights may appear in wrong positions
- Gap measurements misaligned with actual gaps
- Pink measurement badges placed incorrectly

**Verification Needed**:
Check if `node.children[i].y` is relative to `node` or to the root canvas. In Figma, child coordinates are relative to their parent, so this should be correct.

---

## Medium Priority Issues

### 6. ⚠️ No Handling of Rotated Nodes (Lines 610-640)

**Location**: Focus outline and measurements

**Problem**:
- Code assumes nodes are axis-aligned
- No handling of `rotation` property
- Focus outline and measurements won't align with rotated content

**Impact**:
- Measurements appear misaligned on rotated elements
- Visual confusion about what's being measured

**Fix Required**:
```typescript
// Check for rotation
if ('rotation' in node && node.rotation !== 0) {
  // Either warn user or apply rotation to measurement frame
  console.warn(`Node ${node.name} is rotated (${node.rotation}°). Measurements may not align perfectly.`);
}
```

---

### 7. ⚠️ Parent Type Checking Incomplete (Lines 508-509)

**Location**: Parent detection logic

**Problem**:
```typescript
if (node.parent && node.parent.type !== 'PAGE' && node.parent.type !== 'DOCUMENT' &&
    (node.parent.type === 'FRAME' || node.parent.type === 'COMPONENT' || node.parent.type === 'INSTANCE')) {
```

**Missing**: `COMPONENT_SET` is a supported type (line 43) but not checked here

**Impact**:
- Variants within component sets won't show parent context
- Missing parent visual reference for component set children

**Fix Required**:
```typescript
const validParentTypes = ['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'];
if (node.parent &&
    node.parent.type !== 'PAGE' &&
    node.parent.type !== 'DOCUMENT' &&
    validParentTypes.includes(node.parent.type)) {
```

---

### 8. ⚠️ Gap Validation Too Strict (Lines 913-917, 953-958)

**Location**: Gap measurement validation

**Problem**:
```typescript
const actualGap = nextChild.y - (child.y + child.height);
if (actualGap < 0 || actualGap > gap * 2) {
  continue;  // Skip this gap
}
```

**Why it's problematic**:
- Assumes gaps are always exactly `itemSpacing`
- Doesn't account for `SPACE_BETWEEN` or `AUTO` sizing modes
- Might skip legitimate gaps that vary due to flex layouts

**Impact**:
- Some valid gaps not measured
- Incomplete documentation for flex layouts

**Fix Required**:
```typescript
// More lenient gap validation
const actualGap = nextChild.y - (child.y + child.height);
const tolerance = Math.max(gap * 3, 50); // Allow more variance
if (actualGap < -1 || actualGap > tolerance) {
  continue;  // Skip clearly invalid gaps
}

// Use actual gap value, not itemSpacing
const gapHeight = actualGap * scale;  // Measure what's actually there
```

---

## Low Priority Issues

### 9. ℹ️ No Handling of Very Long Connector Lines

**Location**: Lines 673-757 - connector lines

**Problem**:
- If child is small and parent is large, connectors can be very long
- No visual distinction for long vs short connectors
- Can create visual clutter

**Suggestion**:
```typescript
// Optional: Make long connectors dashed or lighter
const connectorLength = Math.abs(childRelativeY - topLineY);
if (connectorLength > 100) {
  topConnectorLeft.dashPattern = [4, 4];
  topConnectorLeft.opacity = 0.5;
}
```

---

### 10. ℹ️ Focus Outline May Overlap Badges

**Location**: Lines 610-632 - focus outline creation

**Problem**:
- Focus outline is rendered after cloned content but before measurements
- Outline extends 4px beyond focus node edges
- Badges positioned near edges might overlap outline

**Impact**:
- Minor visual overlap
- Reduced badge readability

**Suggestion**:
- Add outline to measurements frame instead of container
- Or ensure badges have a minimum distance from focus edges

---

## Summary

### Must Fix (Breaks Functionality):
1. ❌ Line drawing rotation bug - **CRITICAL**
2. ⚠️ Node index mismatch after cloning - **CRITICAL**
3. ⚠️ Container size clipping - **HIGH**

### Should Fix (Incorrect Results):
4. Badge bounds checking issues
5. Gap calculation coordinate verification
6. Rotated nodes not handled

### Nice to Have (Edge Cases):
7. Component set parent support
8. Gap validation tolerance
9. Long connector styling
10. Focus outline badge overlap

### Estimated Impact:
- **Critical bugs**: Will cause visible rendering errors in most cases
- **High priority**: Causes layout problems in specific scenarios
- **Medium priority**: Edge cases and specific node configurations
- **Low priority**: Visual polish and rare edge cases
