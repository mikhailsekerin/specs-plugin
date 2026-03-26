import { ValidationResult, SupportedNodeType } from '../types';

const SUPPORTED_TYPES: SupportedNodeType[] = ['COMPONENT', 'COMPONENT_SET', 'INSTANCE'];

/**
 * Validates the current selection for spec generation
 */
export function validateSelection(): ValidationResult {
  const selection = figma.currentPage.selection;

  // Check exactly one node selected
  if (selection.length === 0) {
    return {
      valid: false,
      error: 'Please select a component, component set, or instance.'
    };
  }

  if (selection.length > 1) {
    return {
      valid: false,
      error: 'Please select only one node.'
    };
  }

  const node = selection[0];

  // Check node type
  if (!SUPPORTED_TYPES.includes(node.type as SupportedNodeType)) {
    return {
      valid: false,
      error: 'Selection must be a component, component set, or instance.'
    };
  }

  return {
    valid: true,
    node: node as ComponentNode | ComponentSetNode | InstanceNode
  };
}
