// ============================================================================
// TYPES
// ============================================================================

type SupportedNodeType = 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE' | 'FRAME';

interface ValidationResult {
  valid: boolean;
  error?: string;
  node?: ComponentNode | ComponentSetNode | InstanceNode | FrameNode;
}

interface FramePlacement {
  x: number;
  y: number;
}

interface DocumentableNode {
  node: SceneNode;
  depth: number;
  path: SceneNode[];
}

interface RowSpec {
  node: SceneNode;
  path: SceneNode[];
  depth: number;
}

type PluginToUIMessage =
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'success'; message: string };

type UIToPluginMessage =
  | { type: 'generate-spec'; includeChildren: boolean; listNestedStyles?: boolean }
  | { type: 'cancel' };

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_TYPES: SupportedNodeType[] = ['COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'FRAME'];
const HORIZONTAL_OFFSET = 240;

// Board layout constants
const BOARD_PADDING = 40;
const BOARD_ROW_GAP = 16;
const BOARD_CORNER_RADIUS = 8;

// Row layout constants
const ROW_PADDING = 24;
const ROW_CORNER_RADIUS = 8;
const ROW_COLUMN_GAP = 32;

// Column widths
const HIERARCHY_COLUMN_WIDTH = 180;
const PREVIEW_COLUMN_WIDTH = 500;
const INSPECTOR_COLUMN_WIDTH = 300;

// Inspector styling
const INSPECTOR_ITEM_GAP = 6;
const INSPECTOR_PADDING = 20;

// Preview styling
const PREVIEW_PADDING = 50;
const PREVIEW_MAX_WIDTH = 450;
const PREVIEW_MAX_HEIGHT = 350;

// Safety limits
const MAX_ROWS = 100; // Maximum number of rows to prevent performance issues
const MAX_COORDINATE = 100000; // Figma coordinate limit

// Badge constants
const BADGE_PADDING = 8; // Minimum spacing between badges
const BADGE_WIDTH_APPROX = 40; // Approximate badge width for collision detection
const BADGE_HEIGHT_APPROX = 20; // Approximate badge height for collision detection
const BADGE_OFFSET_STEP = 30; // Vertical/horizontal offset when repositioning badges

// Measurement thresholds
const MIN_PADDING_TO_SHOW = 5; // Minimum padding size to visualize
const MIN_GAP_TO_SHOW = 2; // Minimum gap size to visualize
const MIN_CHILD_SIZE = 20; // Minimum child size to show measurements
const MIN_DOCUMENTABLE_SIZE = 20; // Minimum size for documentable nodes

// Measurement layout constants
const MEASUREMENT_LINE_OFFSET = 20; // Distance of measurement lines from edges
const MEASUREMENT_BADGE_SIZE = 40; // Approximate badge size for collision detection
const MEASUREMENT_MARGIN = 80; // Total margin needed for measurements outside bounds

// Measurement colors
const COLOR_DIMENSION = { r: 1, g: 0.2, b: 0.2 }; // Red for width/height
const COLOR_PADDING = { r: 0.3, g: 0.7, b: 1 }; // Light blue for padding
const COLOR_GAP = { r: 1, g: 0.4, b: 0.7 }; // Pink for gaps

// ============================================================================
// MESSAGING HELPERS
// ============================================================================

function postStatus(message: string): void {
  const msg: PluginToUIMessage = { type: 'status', message };
  figma.ui.postMessage(msg);
}

function postError(message: string): void {
  const msg: PluginToUIMessage = { type: 'error', message };
  figma.ui.postMessage(msg);
}

function postSuccess(message: string): void {
  const msg: PluginToUIMessage = { type: 'success', message };
  figma.ui.postMessage(msg);
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSelection(): ValidationResult {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return {
      valid: false,
      error: 'Please select a component, component set, instance, or frame.'
    };
  }

  if (selection.length > 1) {
    return {
      valid: false,
      error: 'Please select only one node.'
    };
  }

  const node = selection[0];

  if (!SUPPORTED_TYPES.includes(node.type as SupportedNodeType)) {
    return {
      valid: false,
      error: 'Selection must be a component, component set, instance, or frame.'
    };
  }

  return {
    valid: true,
    node: node as ComponentNode | ComponentSetNode | InstanceNode | FrameNode
  };
}

// ============================================================================
// PLACEMENT
// ============================================================================

function computeFramePlacement(
  sourceNode: ComponentNode | ComponentSetNode | InstanceNode | FrameNode
): FramePlacement {
  return {
    x: sourceNode.x + sourceNode.width + HORIZONTAL_OFFSET,
    y: sourceNode.y
  };
}

// ============================================================================
// HIERARCHY ANALYSIS
// ============================================================================

function isDocumentable(node: SceneNode): boolean {
  // Skip invisible nodes
  if (!node.visible) return false;

  // Only document meaningful layout nodes
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    return false;
  }

  // Skip trivial nodes (too small unless they're meaningful buttons/components)
  if (node.width < MIN_DOCUMENTABLE_SIZE || node.height < MIN_DOCUMENTABLE_SIZE) {
    return false;
  }

  // Skip if name suggests it's decorative (icon, vector, etc.)
  const name = node.name.toLowerCase();
  if (name.includes('icon') && (node.width < 30 || node.height < 30)) {
    return false;
  }

  // Include if it has auto layout (likely meaningful)
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    return true;
  }

  // Include if it has multiple children
  if ('children' in node && node.children.length > 1) {
    return true;
  }

  // Include components and instances
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    return true;
  }

  // Only include frames that meet the above criteria
  return false;
}

function collectDocumentableNodes(root: SceneNode): DocumentableNode[] {
  const result: DocumentableNode[] = [];

  function traverse(node: SceneNode, path: SceneNode[], depth: number) {
    if (!node.visible) return;

    const currentPath = [...path, node];

    if (isDocumentable(node)) {
      result.push({ node, path: currentPath, depth });
    }

    if ('children' in node && node.children.length > 0) {
      for (const child of node.children) {
        traverse(child, currentPath, depth + 1);
      }
    }
  }

  traverse(root, [], 0);
  return result;
}

function buildHierarchyPath(node: SceneNode, root: SceneNode): SceneNode[] {
  const path: SceneNode[] = [];
  let current: BaseNode | null = node;

  while (current && current !== root.parent) {
    if (current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
      path.unshift(current as SceneNode);
    }
    if (current === root) break;
    current = current.parent;
  }

  return path;
}

// ============================================================================
// MEASUREMENT ANNOTATIONS
// ============================================================================

async function createMeasurementBadge(label: string, x: number, y: number, color: RGB = COLOR_DIMENSION): Promise<FrameNode> {
  const badge = figma.createFrame();
  badge.name = `Badge: ${label}`;
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingTop = 4;
  badge.paddingRight = 6;
  badge.paddingBottom = 4;
  badge.paddingLeft = 6;
  badge.fills = [{ type: 'SOLID', color }];
  badge.cornerRadius = 4;

  const text = await createText(label, 11, 600);
  text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

  badge.appendChild(text);
  badge.x = x;
  badge.y = y;

  return badge;
}

function createMeasurementLine(x1: number, y1: number, x2: number, y2: number, color?: RGB): LineNode {
  const line = figma.createLine();
  line.x = x1;
  line.y = y1;

  const deltaX = x2 - x1;
  const deltaY = y2 - y1;

  // Calculate length using Pythagorean theorem
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Resize to length (Figma lines are horizontal by default, then rotated)
  line.resize(length, 0);
  line.rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  line.strokes = [{ type: 'SOLID', color: color || { r: 1, g: 0.2, b: 0.2 } }];
  line.strokeWeight = 1;

  return line;
}

function createHighlightRect(x: number, y: number, width: number, height: number, color: RGB, opacity: number = 0.15): FrameNode {
  const rect = figma.createFrame();
  rect.name = 'Highlight';
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.fills = [{ type: 'SOLID', color, opacity }];
  rect.strokes = [{ type: 'SOLID', color }];
  rect.strokeWeight = 1;
  rect.dashPattern = [2, 2];

  return rect;
}

// ============================================================================
// RENDERER
// ============================================================================

async function createText(content: string, fontSize: number, fontWeight: number = 400): Promise<TextNode> {
  const text = figma.createText();

  // Load font before setting text with fallback
  try {
    if (fontWeight >= 600) {
      await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
      text.fontName = { family: 'Inter', style: 'Semi Bold' };
    } else {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      text.fontName = { family: 'Inter', style: 'Regular' };
    }
  } catch (error) {
    // Fallback to Roboto if Inter is not available
    try {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
      text.fontName = { family: 'Roboto', style: 'Regular' };
    } catch (fallbackError) {
      // Last resort: use any available font
      console.warn('Failed to load preferred fonts, using default');
    }
  }

  text.characters = content;
  text.fontSize = fontSize;

  return text;
}


async function createPropertyRow(label: string, value: string): Promise<FrameNode> {
  const row = figma.createFrame();
  row.name = `Property: ${label}`;
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.itemSpacing = 24;
  row.fills = [];
  row.resize(INSPECTOR_COLUMN_WIDTH - (INSPECTOR_PADDING * 2), row.height);

  const labelText = await createText(label, 11);
  labelText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  row.appendChild(labelText);

  const valueText = await createText(value, 11, 400);
  valueText.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.15 } }];
  valueText.textAlignHorizontal = 'RIGHT';
  row.appendChild(valueText);

  return row;
}

async function createPropertiesPanel(node: SceneNode, listNestedStyles: boolean = false): Promise<FrameNode> {
  const panel = figma.createFrame();
  panel.name = 'Properties';
  panel.layoutMode = 'VERTICAL';
  panel.primaryAxisSizingMode = 'AUTO';
  panel.counterAxisSizingMode = 'FIXED';
  panel.counterAxisAlignItems = 'MIN';
  panel.itemSpacing = INSPECTOR_ITEM_GAP;
  panel.paddingTop = INSPECTOR_PADDING;
  panel.paddingRight = INSPECTOR_PADDING;
  panel.paddingBottom = INSPECTOR_PADDING;
  panel.paddingLeft = INSPECTOR_PADDING;
  panel.fills = [{ type: 'SOLID', color: { r: 0.975, g: 0.975, b: 0.975 } }];
  panel.cornerRadius = 6;
  panel.resize(INSPECTOR_COLUMN_WIDTH, panel.height);

  const title = await createText(node.name, 13, 600);
  title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
  panel.appendChild(title);

  // Add spacing after title
  const spacer = figma.createFrame();
  spacer.name = 'Spacer';
  spacer.fills = [];
  spacer.resize(1, 8);
  panel.appendChild(spacer);

  panel.appendChild(await createPropertyRow('Width', `${Math.round(node.width)}px`));
  panel.appendChild(await createPropertyRow('Height', `${Math.round(node.height)}px`));

  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.visible !== false && 'color' in fill && fill.color) {
      const r = Math.round(fill.color.r * 255).toString(16).padStart(2, '0');
      const g = Math.round(fill.color.g * 255).toString(16).padStart(2, '0');
      const b = Math.round(fill.color.b * 255).toString(16).padStart(2, '0');
      const hex = `#${r}${g}${b}`.toUpperCase();
      panel.appendChild(await createPropertyRow('Fill style', hex));
    }
  }

  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    panel.appendChild(await createPropertyRow('Direction', node.layoutMode === 'HORIZONTAL' ? 'Horizontal' : 'Vertical'));

    const alignLabel =
      node.primaryAxisAlignItems === 'MIN' ? 'Top Left' :
      node.primaryAxisAlignItems === 'MAX' ? 'Bottom Right' :
      node.primaryAxisAlignItems === 'CENTER' ? 'Center' :
      node.counterAxisAlignItems === 'CENTER' ? 'Top Center' : 'Top Left';
    panel.appendChild(await createPropertyRow('Align Children', alignLabel));

    const pt = Math.round(node.paddingTop || 0);
    const pr = Math.round(node.paddingRight || 0);
    const pb = Math.round(node.paddingBottom || 0);
    const pl = Math.round(node.paddingLeft || 0);
    const padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
    panel.appendChild(await createPropertyRow('Padding', padding));

    panel.appendChild(await createPropertyRow('Gap', `${Math.round(node.itemSpacing || 0)}px`));
  } else if ('children' in node && (node as FrameNode).children.length > 0) {
    // Non-auto-layout frame with children (e.g. frame containing an image)
    // Calculate padding from child bounding box
    const children = (node as FrameNode).children.filter(c => c.visible);
    if (children.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const child of children) {
        if ('x' in child && 'y' in child && 'width' in child && 'height' in child) {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
        }
      }
      if (isFinite(minX)) {
        const pt = Math.max(0, Math.round(minY));
        const pl = Math.max(0, Math.round(minX));
        const pb = Math.max(0, Math.round(node.height - maxY));
        const pr = Math.max(0, Math.round(node.width - maxX));
        if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
          panel.appendChild(await createPropertyRow('Padding', `${pt}px ${pr}px ${pb}px ${pl}px`));
        }
      }
    }
  }

  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    panel.appendChild(await createPropertyRow('Corner radius', `${Math.round(node.cornerRadius)}px`));
  }

  // Borders / Strokes
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.visible !== false && 'color' in stroke && stroke.color) {
      const sr = Math.round(stroke.color.r * 255).toString(16).padStart(2, '0');
      const sg = Math.round(stroke.color.g * 255).toString(16).padStart(2, '0');
      const sb = Math.round(stroke.color.b * 255).toString(16).padStart(2, '0');
      const strokeHex = `#${sr}${sg}${sb}`.toUpperCase();
      panel.appendChild(await createPropertyRow('Border color', strokeHex));
    }
    if ('strokeWeight' in node && typeof node.strokeWeight === 'number') {
      panel.appendChild(await createPropertyRow('Border width', `${Math.round(node.strokeWeight)}px`));
    }
    if ('strokeAlign' in node && typeof node.strokeAlign === 'string') {
      panel.appendChild(await createPropertyRow('Border align', node.strokeAlign.charAt(0) + node.strokeAlign.slice(1).toLowerCase()));
    }
  }

  // Text styles — direct children, or all nested when listNestedStyles is on
  const textNodes: TextNode[] = [];
  if (node.type === 'TEXT') {
    textNodes.push(node as TextNode);
  } else if ('children' in node) {
    if (listNestedStyles) {
      const collectAllTexts = (n: SceneNode): void => {
        if (!n.visible) return;
        if (n.type === 'TEXT') { textNodes.push(n as TextNode); return; }
        if ('children' in n) {
          for (const child of (n as FrameNode).children) { collectAllTexts(child); }
        }
      };
      collectAllTexts(node);
    } else {
      for (const child of (node as FrameNode).children) {
        if (child.type === 'TEXT') {
          textNodes.push(child as TextNode);
        }
      }
    }
  }

  for (const textNode of textNodes) {
    // Section header with the text layer name
    const sectionSpacer = figma.createFrame();
    sectionSpacer.name = 'Text Spacer';
    sectionSpacer.fills = [];
    sectionSpacer.resize(1, 6);
    panel.appendChild(sectionSpacer);

    const sectionLabel = await createText(textNode.name, 11, 600);
    sectionLabel.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    panel.appendChild(sectionLabel);

    const fontName = textNode.fontName;
    if (fontName !== figma.mixed) {
      panel.appendChild(await createPropertyRow('Font', fontName.family));
      panel.appendChild(await createPropertyRow('Weight', fontName.style));
    }

    const fontSize = textNode.fontSize;
    if (fontSize !== figma.mixed) {
      panel.appendChild(await createPropertyRow('Size', `${fontSize}px`));
    }

    const lineHeight = textNode.lineHeight;
    if (lineHeight !== figma.mixed) {
      if (lineHeight.unit === 'PIXELS') {
        panel.appendChild(await createPropertyRow('Line height', `${Math.round(lineHeight.value)}px`));
      } else if (lineHeight.unit === 'PERCENT') {
        panel.appendChild(await createPropertyRow('Line height', `${Math.round(lineHeight.value)}%`));
      } else {
        panel.appendChild(await createPropertyRow('Line height', 'Auto'));
      }
    }

    const letterSpacing = textNode.letterSpacing;
    if (letterSpacing !== figma.mixed) {
      if (letterSpacing.value !== 0) {
        const lsLabel = letterSpacing.unit === 'PERCENT'
          ? `${Math.round(letterSpacing.value * 10) / 10}%`
          : `${Math.round(letterSpacing.value * 10) / 10}px`;
        panel.appendChild(await createPropertyRow('Letter spacing', lsLabel));
      }
    }

    const textColor = textNode.fills;
    if (textColor !== figma.mixed && Array.isArray(textColor) && textColor.length > 0) {
      const tf = textColor[0];
      if (tf.type === 'SOLID' && tf.visible !== false && 'color' in tf && tf.color) {
        const tr = Math.round(tf.color.r * 255).toString(16).padStart(2, '0');
        const tg = Math.round(tf.color.g * 255).toString(16).padStart(2, '0');
        const tb = Math.round(tf.color.b * 255).toString(16).padStart(2, '0');
        panel.appendChild(await createPropertyRow('Color', `#${tr}${tg}${tb}`.toUpperCase()));
      }
    }
  }

  // Icons — direct children (or all nested when listNestedStyles)
  const iconNodes: SceneNode[] = [];
  function isIconNode(child: SceneNode): boolean {
    const hasKids = 'children' in child && (child as any).children.length > 0;
    if (hasKids && (child.type === 'INSTANCE' || child.type === 'COMPONENT' || child.type === 'FRAME')) return false;
    const isVector = child.type === 'VECTOR' || child.type === 'BOOLEAN_OPERATION' || child.type === 'STAR' || child.type === 'POLYGON' || child.type === 'ELLIPSE';
    const isSmallInstance = (child.type === 'INSTANCE' || child.type === 'COMPONENT') && child.width <= 48 && child.height <= 48;
    const isIconFrame = child.type === 'FRAME' && child.name.toLowerCase().includes('icon') && child.width <= 48 && child.height <= 48;
    return isVector || isSmallInstance || isIconFrame;
  }
  if ('children' in node) {
    if (listNestedStyles) {
      const collectAllIcons = (n: SceneNode): void => {
        if (!n.visible) return;
        if (isIconNode(n)) { iconNodes.push(n); return; }
        if ('children' in n) {
          for (const c of (n as FrameNode).children) { collectAllIcons(c); }
        }
      };
      collectAllIcons(node);
    } else {
      for (const child of (node as FrameNode).children) {
        if (!child.visible) continue;
        if (isIconNode(child)) { iconNodes.push(child); }
      }
    }
  }
  for (const child of iconNodes) {
    {
        const iconSpacer = figma.createFrame();
        iconSpacer.name = 'Icon Spacer';
        iconSpacer.fills = [];
        iconSpacer.resize(1, 6);
        panel.appendChild(iconSpacer);

        const iconLabel = await createText(child.name, 11, 600);
        iconLabel.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
        panel.appendChild(iconLabel);

        panel.appendChild(await createPropertyRow('Name', child.name));
        panel.appendChild(await createPropertyRow('Type', child.type === 'INSTANCE' ? 'Icon (Instance)' : child.type === 'COMPONENT' ? 'Icon (Component)' : 'Icon'));
        panel.appendChild(await createPropertyRow('Size', `${Math.round(child.width)}×${Math.round(child.height)}`));

        // Icon fill color
        if ('fills' in child && Array.isArray(child.fills) && child.fills.length > 0) {
          const iconFill = child.fills[0];
          if (iconFill.type === 'SOLID' && iconFill.visible !== false && 'color' in iconFill && iconFill.color) {
            const ir = Math.round(iconFill.color.r * 255).toString(16).padStart(2, '0');
            const ig = Math.round(iconFill.color.g * 255).toString(16).padStart(2, '0');
            const ib = Math.round(iconFill.color.b * 255).toString(16).padStart(2, '0');
            panel.appendChild(await createPropertyRow('Color', `#${ir}${ig}${ib}`.toUpperCase()));
          }
        }

        // Icon stroke color
        if ('strokes' in child && Array.isArray(child.strokes) && child.strokes.length > 0) {
          const iconStroke = child.strokes[0];
          if (iconStroke.type === 'SOLID' && iconStroke.visible !== false && 'color' in iconStroke && iconStroke.color) {
            const isr = Math.round(iconStroke.color.r * 255).toString(16).padStart(2, '0');
            const isg = Math.round(iconStroke.color.g * 255).toString(16).padStart(2, '0');
            const isb = Math.round(iconStroke.color.b * 255).toString(16).padStart(2, '0');
            panel.appendChild(await createPropertyRow('Stroke', `#${isr}${isg}${isb}`.toUpperCase()));
          }
          if ('strokeWeight' in child && typeof child.strokeWeight === 'number') {
            panel.appendChild(await createPropertyRow('Stroke weight', `${child.strokeWeight}px`));
          }
        }
    }
  }

  return panel;
}

async function createHierarchyColumn(path: SceneNode[], focusedNode: SceneNode): Promise<FrameNode> {
  const column = figma.createFrame();
  column.name = 'Hierarchy';
  column.layoutMode = 'VERTICAL';
  column.primaryAxisSizingMode = 'AUTO';
  column.counterAxisSizingMode = 'FIXED';
  column.counterAxisAlignItems = 'MIN';
  column.itemSpacing = 2;
  column.paddingTop = 20;
  column.paddingRight = 16;
  column.paddingBottom = 20;
  column.paddingLeft = 16;
  column.fills = [];
  column.resize(HIERARCHY_COLUMN_WIDTH, column.height);

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const isFocused = node === focusedNode;
    const indent = i * 8;

    const row = figma.createFrame();
    row.name = `Hierarchy: ${node.name}`;
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    row.fills = [];
    row.paddingLeft = indent;

    const text = await createText(node.name, 11, isFocused ? 600 : 400);
    const color = isFocused ? { r: 0.1, g: 0.1, b: 0.1 } : { r: 0.65, g: 0.65, b: 0.65 };
    text.fills = [{ type: 'SOLID', color }];
    row.appendChild(text);

    column.appendChild(row);
  }

  return column;
}

interface BadgePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

function checkBadgeOverlap(newBadge: BadgePosition, existingBadges: BadgePosition[]): boolean {
  for (const existing of existingBadges) {
    // Check if badges overlap horizontally and vertically
    const overlapX = newBadge.x < existing.x + existing.width + BADGE_PADDING &&
                     newBadge.x + newBadge.width + BADGE_PADDING > existing.x;
    const overlapY = newBadge.y < existing.y + existing.height + BADGE_PADDING &&
                     newBadge.y + newBadge.height + BADGE_PADDING > existing.y;

    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function findNonOverlappingPosition(
  preferredX: number,
  preferredY: number,
  width: number,
  height: number,
  existingBadges: BadgePosition[],
  bounds: { width: number; height: number }
): { x: number; y: number } {
  const MAX_COORDINATE = 100000; // Figma coordinate limit
  const BOUNDS_MARGIN = 50;

  // Validate input coordinates
  if (Math.abs(preferredX) > MAX_COORDINATE || Math.abs(preferredY) > MAX_COORDINATE) {
    console.warn(`Badge position out of bounds: (${preferredX}, ${preferredY}), clamping to origin`);
    preferredX = 0;
    preferredY = 0;
  }

  const offsets = [
    { dx: 0, dy: 0 },                                  // Preferred position
    { dx: 0, dy: -BADGE_OFFSET_STEP },                 // Above
    { dx: 0, dy: BADGE_OFFSET_STEP },                  // Below
    { dx: BADGE_WIDTH_APPROX, dy: 0 },                 // Right
    { dx: -BADGE_WIDTH_APPROX, dy: 0 },                // Left
    { dx: BADGE_WIDTH_APPROX, dy: -BADGE_OFFSET_STEP }, // Top-right
    { dx: -BADGE_WIDTH_APPROX, dy: -BADGE_OFFSET_STEP },// Top-left
    { dx: BADGE_WIDTH_APPROX, dy: BADGE_OFFSET_STEP },  // Bottom-right
    { dx: -BADGE_WIDTH_APPROX, dy: BADGE_OFFSET_STEP }, // Bottom-left
  ];

  for (const offset of offsets) {
    const testX = preferredX + offset.dx;
    const testY = preferredY + offset.dy;

    // Check if within bounds
    if (testX < -BOUNDS_MARGIN || testY < -BOUNDS_MARGIN ||
        testX + width > bounds.width + BOUNDS_MARGIN ||
        testY + height > bounds.height + BOUNDS_MARGIN) {
      continue;
    }

    const testBadge = { x: testX, y: testY, width, height };
    if (!checkBadgeOverlap(testBadge, existingBadges)) {
      return { x: testX, y: testY };
    }
  }

  // If all positions overlap, use preferred position
  return { x: preferredX, y: preferredY };
}

async function createMeasurementPreview(node: SceneNode, rootNode: SceneNode, previewSize: { width: number; height: number }): Promise<FrameNode> {
  // Always clone the root node to show full context in every row
  let cloned: SceneNode;
  try {
    cloned = rootNode.clone();
  } catch (error) {
    throw new Error(`Failed to clone root ${rootNode.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (cloned.width <= 0 || cloned.height <= 0 || !isFinite(cloned.width) || !isFinite(cloned.height)) {
    throw new Error(`Invalid dimensions on root node: ${rootNode.name}`);
  }

  // Never resize the target frame — always show at 1:1
  const scale = 1;

  // Ensure clone clips its content so children stay inside
  if ('clipsContent' in cloned) {
    (cloned as FrameNode).clipsContent = true;
  }

  // --- locate the focused node inside the clone ---
  // Walk the original tree to build a path of child indices from rootNode to node
  function buildIndexPath(target: SceneNode, root: SceneNode): number[] {
    const path: number[] = [];
    let cur: BaseNode = target;
    while (cur && cur !== root) {
      const parent: BaseNode | null = cur.parent;
      if (!parent || !('children' in parent)) break;
      const idx = (parent as any).children.indexOf(cur);
      if (idx < 0) break;
      path.unshift(idx);
      cur = parent;
    }
    return cur === root ? path : [];
  }

  const indexPath = buildIndexPath(node, rootNode);

  // Walk the same index path in the cloned tree
  let focusClone: SceneNode = cloned;
  for (const idx of indexPath) {
    if (!('children' in focusClone) || idx >= (focusClone as any).children.length) {
      focusClone = cloned; // fallback to root
      break;
    }
    focusClone = (focusClone as any).children[idx];
  }

  const isRoot = node === rootNode;

  // Calculate focus position relative to cloned root (in scaled space)
  let focusWidth: number, focusHeight: number, focusRelX: number, focusRelY: number;
  if (isRoot) {
    focusWidth = cloned.width;
    focusHeight = cloned.height;
    focusRelX = 0;
    focusRelY = 0;
  } else {
    focusWidth = node.width * scale;
    focusHeight = node.height * scale;
    // Walk absolute position from node to rootNode
    let absX = 0, absY = 0;
    let cur: BaseNode = node;
    while (cur && cur !== rootNode) {
      if ('x' in cur && 'y' in cur) { absX += (cur as SceneNode).x; absY += (cur as SceneNode).y; }
      cur = cur.parent!;
    }
    focusRelX = absX * scale;
    focusRelY = absY * scale;
  }

  // --- build container — size set once from root node, same for all rows ---
  const containerWidth = previewSize.width;
  const containerHeight = previewSize.height;
  const container = figma.createFrame();
  container.name = 'Preview';
  container.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.94, b: 0.94 } }];
  container.cornerRadius = 6;
  container.clipsContent = true;
  container.layoutMode = 'NONE';
  container.resize(containerWidth, containerHeight);

  const centerX = (containerWidth - cloned.width) / 2;
  const centerY = (containerHeight - cloned.height) / 2;
  cloned.x = centerX;
  cloned.y = centerY;
  container.appendChild(cloned);

  // Focus outline — red dashed, matching target reference
  const focusOutline = figma.createFrame();
  focusOutline.name = 'Focus Outline';
  focusOutline.fills = [];
  focusOutline.strokes = [{ type: 'SOLID', color: COLOR_DIMENSION }];
  focusOutline.strokeWeight = 2;
  focusOutline.dashPattern = [6, 4];
  focusOutline.cornerRadius = 2;
  focusOutline.resize(focusWidth + 4, focusHeight + 4);
  focusOutline.x = centerX + focusRelX - 2;
  focusOutline.y = centerY + focusRelY - 2;
  container.appendChild(focusOutline);

  // Measurements overlay — positioned at the root clone origin
  const measurements = figma.createFrame();
  measurements.name = 'Measurements';
  measurements.fills = [];
  measurements.clipsContent = false;
  measurements.resize(cloned.width, cloned.height);
  measurements.x = centerX;
  measurements.y = centerY;

  const width = Math.round(node.width);
  const height = Math.round(node.height);
  const badgePositions: BadgePosition[] = [];
  let pos: { x: number; y: number };
  const measurementBounds = { width: cloned.width + 80, height: cloned.height + 80 };

  // =====================================================================
  // 1. FOCUSED NODE DIMENSIONS (RED) — placed near the focus node edges
  // =====================================================================

  // Width badge — centred above focus node
  pos = findNonOverlappingPosition(
    focusRelX + focusWidth / 2 - 15, focusRelY - 18,
    BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
  );
  const wBadge = await createMeasurementBadge(`${width}`, pos.x, pos.y, COLOR_DIMENSION);
  measurements.appendChild(wBadge);
  badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });

  // Height badge — centred left of focus node
  pos = findNonOverlappingPosition(
    focusRelX - 35, focusRelY + focusHeight / 2 - 10,
    BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
  );
  const hBadge = await createMeasurementBadge(`${height}`, pos.x, pos.y, COLOR_DIMENSION);
  measurements.appendChild(hBadge);
  badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });


  // =====================================================================
  // 2. INTERNAL PADDING (LIGHT BLUE) — highlights inside the focused node
  // =====================================================================
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    const pTop = (node.paddingTop || 0) * scale;
    const pRight = (node.paddingRight || 0) * scale;
    const pBottom = (node.paddingBottom || 0) * scale;
    const pLeft = (node.paddingLeft || 0) * scale;

    // Top padding
    if (pTop > MIN_PADDING_TO_SHOW) {
      const h = createHighlightRect(focusRelX, focusRelY, focusWidth, pTop, COLOR_PADDING, 0.15);
      measurements.appendChild(h);
      pos = findNonOverlappingPosition(
        focusRelX + focusWidth / 2 - 15, focusRelY + pTop / 2 - 10,
        BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
      );
      measurements.appendChild(await createMeasurementBadge(`${Math.round(node.paddingTop || 0)}`, pos.x, pos.y, COLOR_PADDING));
      badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
    }

    // Left padding
    if (pLeft > MIN_PADDING_TO_SHOW) {
      const h = createHighlightRect(focusRelX, focusRelY, pLeft, focusHeight, COLOR_PADDING, 0.15);
      measurements.appendChild(h);
      pos = findNonOverlappingPosition(
        focusRelX + pLeft / 2 - 15, focusRelY + focusHeight / 2 - 10,
        BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
      );
      measurements.appendChild(await createMeasurementBadge(`${Math.round(node.paddingLeft || 0)}`, pos.x, pos.y, COLOR_PADDING));
      badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
    }

    // Right padding
    if (pRight > MIN_PADDING_TO_SHOW) {
      const h = createHighlightRect(focusRelX + focusWidth - pRight, focusRelY, pRight, focusHeight, COLOR_PADDING, 0.15);
      measurements.appendChild(h);
      pos = findNonOverlappingPosition(
        focusRelX + focusWidth - pRight / 2 - 15, focusRelY + focusHeight / 2 - 10,
        BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
      );
      measurements.appendChild(await createMeasurementBadge(`${Math.round(node.paddingRight || 0)}`, pos.x, pos.y, COLOR_PADDING));
      badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
    }

    // Bottom padding
    if (pBottom > MIN_PADDING_TO_SHOW) {
      const h = createHighlightRect(focusRelX, focusRelY + focusHeight - pBottom, focusWidth, pBottom, COLOR_PADDING, 0.15);
      measurements.appendChild(h);
      pos = findNonOverlappingPosition(
        focusRelX + focusWidth / 2 - 15, focusRelY + focusHeight - pBottom / 2 - 10,
        BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
      );
      measurements.appendChild(await createMeasurementBadge(`${Math.round(node.paddingBottom || 0)}`, pos.x, pos.y, COLOR_PADDING));
      badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
    }

    // =====================================================================
    // 3. GAPS BETWEEN CHILDREN (PINK) — full-width bands inside focus node
    // =====================================================================
    const gap = (node.itemSpacing || 0) * scale;
    if (gap > MIN_GAP_TO_SHOW && 'children' in node && node.children.length > 1) {
      const visibleChildren = node.children.filter(c => c.visible && 'width' in c && 'height' in c);

      for (let i = 0; i < visibleChildren.length - 1; i++) {
        const child = visibleChildren[i];
        const nextChild = visibleChildren[i + 1];

        if (node.layoutMode === 'VERTICAL') {
          const actualGap = nextChild.y - (child.y + child.height);
          if (actualGap < -1 || actualGap > Math.max(gap * 3, 50)) continue;

          const gapTop = focusRelY + (child.y + child.height) * scale;
          const gapHeight = actualGap * scale;

          // Full-width pink band
          const gapHighlight = createHighlightRect(focusRelX, gapTop, focusWidth, gapHeight, COLOR_GAP, 0.15);
          measurements.appendChild(gapHighlight);

          pos = findNonOverlappingPosition(
            focusRelX + focusWidth / 2 - 15, gapTop + gapHeight / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(actualGap)}`, pos.x, pos.y, COLOR_GAP));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });

        } else if (node.layoutMode === 'HORIZONTAL') {
          const actualGap = nextChild.x - (child.x + child.width);
          if (actualGap < -1 || actualGap > Math.max(gap * 3, 50)) continue;

          const gapLeft = focusRelX + (child.x + child.width) * scale;
          const gapWidth = actualGap * scale;

          // Full-height pink band
          const gapHighlight = createHighlightRect(gapLeft, focusRelY, gapWidth, focusHeight, COLOR_GAP, 0.15);
          measurements.appendChild(gapHighlight);

          pos = findNonOverlappingPosition(
            gapLeft + gapWidth / 2 - 15, focusRelY + focusHeight / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(actualGap)}`, pos.x, pos.y, COLOR_GAP));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }
      }
    }

    // =====================================================================
    // 4. CHILDREN DIMENSIONS (RED small badges) — near each child
    // =====================================================================
    if ('children' in node && node.children.length <= 8) {
      const visibleChildren = node.children.filter(c => c.visible && c.width >= MIN_CHILD_SIZE && c.height >= MIN_CHILD_SIZE);
      for (const child of visibleChildren) {
        const cx = focusRelX + child.x * scale;
        const cy = focusRelY + child.y * scale;
        const cw = child.width * scale;
        const ch = child.height * scale;

        // Child width badge above
        if (cw > 30) {
          pos = findNonOverlappingPosition(
            cx + cw / 2 - 15, cy - 18,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(child.width)}`, pos.x, pos.y, COLOR_DIMENSION));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }

        // Child height badge on the right
        if (ch > 30) {
          pos = findNonOverlappingPosition(
            cx + cw + 3, cy + ch / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(child.height)}`, pos.x, pos.y, COLOR_DIMENSION));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }
      }
    }
  } else if ('children' in node && (node as FrameNode).children.length > 0) {
    // =====================================================================
    // NON-AUTO-LAYOUT FRAME — calculate padding from children bounding box
    // =====================================================================
    const children = (node as FrameNode).children.filter(c => c.visible && 'x' in c && 'y' in c && 'width' in c && 'height' in c);
    if (children.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const child of children) {
        minX = Math.min(minX, child.x);
        minY = Math.min(minY, child.y);
        maxX = Math.max(maxX, child.x + child.width);
        maxY = Math.max(maxY, child.y + child.height);
      }

      if (isFinite(minX)) {
        const pTop = Math.max(0, minY) * scale;
        const pLeft = Math.max(0, minX) * scale;
        const pBottom = Math.max(0, (node.height - maxY)) * scale;
        const pRight = Math.max(0, (node.width - maxX)) * scale;

        // Top padding
        if (pTop > MIN_PADDING_TO_SHOW) {
          const h = createHighlightRect(focusRelX, focusRelY, focusWidth, pTop, COLOR_PADDING, 0.15);
          measurements.appendChild(h);
          pos = findNonOverlappingPosition(
            focusRelX + focusWidth / 2 - 15, focusRelY + pTop / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(minY)}`, pos.x, pos.y, COLOR_PADDING));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }

        // Left padding
        if (pLeft > MIN_PADDING_TO_SHOW) {
          const h = createHighlightRect(focusRelX, focusRelY, pLeft, focusHeight, COLOR_PADDING, 0.15);
          measurements.appendChild(h);
          pos = findNonOverlappingPosition(
            focusRelX + pLeft / 2 - 15, focusRelY + focusHeight / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(minX)}`, pos.x, pos.y, COLOR_PADDING));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }

        // Right padding
        if (pRight > MIN_PADDING_TO_SHOW) {
          const h = createHighlightRect(focusRelX + focusWidth - pRight, focusRelY, pRight, focusHeight, COLOR_PADDING, 0.15);
          measurements.appendChild(h);
          pos = findNonOverlappingPosition(
            focusRelX + focusWidth - pRight / 2 - 15, focusRelY + focusHeight / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(node.width - maxX)}`, pos.x, pos.y, COLOR_PADDING));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }

        // Bottom padding
        if (pBottom > MIN_PADDING_TO_SHOW) {
          const h = createHighlightRect(focusRelX, focusRelY + focusHeight - pBottom, focusWidth, pBottom, COLOR_PADDING, 0.15);
          measurements.appendChild(h);
          pos = findNonOverlappingPosition(
            focusRelX + focusWidth / 2 - 15, focusRelY + focusHeight - pBottom / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(node.height - maxY)}`, pos.x, pos.y, COLOR_PADDING));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }
      }
    }

    // =====================================================================
    // 4. CHILDREN DIMENSIONS (RED small badges) — near each child
    // =====================================================================
    if (children.length > 0 && children.length <= 8) {
      const visibleChildren = children.filter(c => c.width >= MIN_CHILD_SIZE && c.height >= MIN_CHILD_SIZE);
      for (const child of visibleChildren) {
        const cx = focusRelX + child.x * scale;
        const cy = focusRelY + child.y * scale;
        const cw = child.width * scale;
        const ch = child.height * scale;

        // Child width badge above
        if (cw > 30) {
          pos = findNonOverlappingPosition(
            cx + cw / 2 - 15, cy - 18,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(child.width)}`, pos.x, pos.y, COLOR_DIMENSION));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }

        // Child height badge on the right
        if (ch > 30) {
          pos = findNonOverlappingPosition(
            cx + cw + 3, cy + ch / 2 - 10,
            BADGE_WIDTH_APPROX, BADGE_HEIGHT_APPROX, badgePositions, measurementBounds
          );
          measurements.appendChild(await createMeasurementBadge(`${Math.round(child.height)}`, pos.x, pos.y, COLOR_DIMENSION));
          badgePositions.push({ x: pos.x, y: pos.y, width: BADGE_WIDTH_APPROX, height: BADGE_HEIGHT_APPROX });
        }
      }
    }
  }

  container.appendChild(measurements);
  return container;
}

async function renderDocumentationRow(rowSpec: RowSpec, rootNode: SceneNode, previewSize: { width: number; height: number }, listNestedStyles: boolean = false): Promise<FrameNode> {
  const row = figma.createFrame();
  row.name = `Row: ${rowSpec.node.name}`;
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisAlignItems = 'MIN';
  row.itemSpacing = ROW_COLUMN_GAP;
  row.paddingTop = ROW_PADDING;
  row.paddingRight = ROW_PADDING;
  row.paddingBottom = ROW_PADDING;
  row.paddingLeft = ROW_PADDING;
  row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  row.cornerRadius = ROW_CORNER_RADIUS;
  row.strokes = [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.92 } }];
  row.strokeWeight = 1;

  const hierarchyColumn = await createHierarchyColumn(rowSpec.path, rowSpec.node);
  row.appendChild(hierarchyColumn);

  const previewColumn = await createMeasurementPreview(rowSpec.node, rootNode, previewSize);
  row.appendChild(previewColumn);

  const inspectorColumn = await createPropertiesPanel(rowSpec.node, listNestedStyles);
  row.appendChild(inspectorColumn);

  return row;
}

async function renderSpacingBoard(rows: RowSpec[], rootNode: SceneNode, listNestedStyles: boolean = false): Promise<FrameNode> {
  const board = figma.createFrame();
  board.name = 'Spacing';
  board.layoutMode = 'VERTICAL';
  board.primaryAxisSizingMode = 'AUTO';
  board.counterAxisSizingMode = 'AUTO';
  board.counterAxisAlignItems = 'MIN';
  board.itemSpacing = BOARD_ROW_GAP;
  board.paddingTop = BOARD_PADDING;
  board.paddingRight = BOARD_PADDING;
  board.paddingBottom = BOARD_PADDING;
  board.paddingLeft = BOARD_PADDING;
  board.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
  board.cornerRadius = BOARD_CORNER_RADIUS;

  const title = await createText('Spacing', 18, 600);
  title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
  board.appendChild(title);

  // Add spacing after title
  const titleSpacer = figma.createFrame();
  titleSpacer.name = 'Title Spacer';
  titleSpacer.fills = [];
  titleSpacer.resize(1, 8);
  board.appendChild(titleSpacer);

  // Compute preview size once from the root node — same for all rows
  const PREVIEW_PADDING = 50;
  const previewSize = {
    width: Math.max(rootNode.width + PREVIEW_PADDING * 2, 200),
    height: Math.max(rootNode.height + PREVIEW_PADDING * 2, 200),
  };

  for (const rowSpec of rows) {
    const rowFrame = await renderDocumentationRow(rowSpec, rootNode, previewSize, listNestedStyles);
    board.appendChild(rowFrame);
  }

  return board;
}

// ============================================================================
// MAIN
// ============================================================================

async function generateSpec(includeChildren: boolean, listNestedStyles: boolean = false): Promise<void> {
  try {
    postStatus('Validating selection...');

    const validation = validateSelection();
    if (!validation.valid || !validation.node) {
      postError(validation.error || 'Invalid selection');
      return;
    }

    const sourceNode = validation.node;
    postStatus('Analyzing hierarchy...');

    const documentableNodes = includeChildren
      ? collectDocumentableNodes(sourceNode)
      : [{ node: sourceNode, path: [sourceNode], depth: 0 }];

    // Apply row limit for performance and stability
    if (documentableNodes.length > MAX_ROWS) {
      postError(`Too many nodes found (${documentableNodes.length}). Maximum is ${MAX_ROWS}. Please select a smaller subtree.`);
      return;
    }

    const rowSpecs: RowSpec[] = documentableNodes.map(docNode => ({
      node: docNode.node,
      path: docNode.path,
      depth: docNode.depth
    }));

    postStatus(`Creating documentation board with ${rowSpecs.length} rows...`);

    const spacingBoard = await renderSpacingBoard(rowSpecs, sourceNode, listNestedStyles);

    const placement = computeFramePlacement(sourceNode);
    spacingBoard.x = placement.x;
    spacingBoard.y = placement.y;

    figma.currentPage.appendChild(spacingBoard);
    figma.currentPage.selection = [spacingBoard];
    figma.viewport.scrollAndZoomIntoView([spacingBoard]);

    postSuccess(`Generated spacing board with ${rowSpecs.length} rows`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    postError(`Failed to generate spec: ${errorMessage}`);
    console.error('Spec generation error:', error);
  }
}

// Show UI
figma.showUI(__html__, { width: 320, height: 240 });

// Handle messages from UI
figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  if (msg.type === 'generate-spec') {
    await generateSpec(msg.includeChildren, msg.listNestedStyles || false);
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
