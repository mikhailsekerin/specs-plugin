import { SectionCard } from '../types';

const FRAME_WIDTH = 360;
const SECTION_PADDING = 16;
const SECTION_SPACING = 12;
const CARD_PADDING = 16;
const CARD_SPACING = 8;

/**
 * Creates a text node with specified content and style
 */
function createText(content: string, fontSize: number, fontWeight: number = 400): TextNode {
  const text = figma.createText();
  text.characters = content;
  text.fontSize = fontSize;

  // Load font before setting weight
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }).then(() => {
    if (fontWeight >= 600) {
      figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }).then(() => {
        text.fontName = { family: 'Inter', style: 'Semi Bold' };
      });
    }
  });

  return text;
}

/**
 * Creates a section card with title and body text
 */
function createSectionCard(section: SectionCard): FrameNode {
  const card = figma.createFrame();
  card.name = section.title;
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.counterAxisAlignItems = 'MIN';
  card.itemSpacing = CARD_SPACING;
  card.paddingTop = CARD_PADDING;
  card.paddingRight = CARD_PADDING;
  card.paddingBottom = CARD_PADDING;
  card.paddingLeft = CARD_PADDING;
  card.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
  card.cornerRadius = 8;
  card.resize(FRAME_WIDTH - (SECTION_PADDING * 2), card.height);

  // Title
  const title = createText(section.title, 14, 600);
  card.appendChild(title);

  // Body
  const body = createText(section.body, 12);
  body.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  body.resize(card.width - (CARD_PADDING * 2), body.height);
  card.appendChild(body);

  return card;
}

/**
 * Creates the header card with component name
 */
function createHeaderCard(componentName: string): FrameNode {
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  header.counterAxisAlignItems = 'MIN';
  header.itemSpacing = 4;
  header.paddingTop = CARD_PADDING;
  header.paddingRight = CARD_PADDING;
  header.paddingBottom = CARD_PADDING;
  header.paddingLeft = CARD_PADDING;
  header.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 1 } }];
  header.cornerRadius = 8;
  header.resize(FRAME_WIDTH - (SECTION_PADDING * 2), header.height);

  // Component name
  const name = createText(componentName, 16, 600);
  header.appendChild(name);

  // Subtitle
  const subtitle = createText('Generated specification', 11);
  subtitle.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  header.appendChild(subtitle);

  return header;
}

/**
 * Gets the default section definitions
 */
function getDefaultSections(): SectionCard[] {
  return [
    {
      title: 'Overview',
      body: 'Component overview and purpose will appear here.'
    },
    {
      title: 'Anatomy',
      body: 'Component structure and part breakdown will appear here.'
    },
    {
      title: 'Spacing',
      body: 'Internal spacing and dimensions will appear here.'
    },
    {
      title: 'Variants',
      body: 'Available variants and properties will appear here.'
    },
    {
      title: 'Content Rules',
      body: 'Text length, image requirements, and content guidelines will appear here.'
    },
    {
      title: 'Usage Notes',
      body: 'Best practices and usage recommendations will appear here.'
    }
  ];
}

/**
 * Creates the complete spec frame with all sections
 */
export function createSpecFrame(
  componentName: string,
  x: number,
  y: number
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Spec / ${componentName} / Generated`;
  frame.x = x;
  frame.y = y;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.counterAxisAlignItems = 'MIN';
  frame.itemSpacing = SECTION_SPACING;
  frame.paddingTop = SECTION_PADDING;
  frame.paddingRight = SECTION_PADDING;
  frame.paddingBottom = SECTION_PADDING;
  frame.paddingLeft = SECTION_PADDING;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.resize(FRAME_WIDTH, frame.height);

  // Add header
  const header = createHeaderCard(componentName);
  frame.appendChild(header);

  // Add section cards
  const sections = getDefaultSections();
  for (const section of sections) {
    const card = createSectionCard(section);
    frame.appendChild(card);
  }

  return frame;
}
