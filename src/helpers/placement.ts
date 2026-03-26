import { FramePlacement } from '../types';

const HORIZONTAL_OFFSET = 240;

/**
 * Computes the position for the spec frame relative to the source node
 */
export function computeFramePlacement(
  sourceNode: ComponentNode | ComponentSetNode | InstanceNode
): FramePlacement {
  return {
    x: sourceNode.x + sourceNode.width + HORIZONTAL_OFFSET,
    y: sourceNode.y
  };
}
