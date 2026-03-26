// Supported selection types for spec generation
export type SupportedNodeType = 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE';

// Selection validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
  node?: ComponentNode | ComponentSetNode | InstanceNode;
}

// Frame placement configuration
export interface FramePlacement {
  x: number;
  y: number;
}

// Section card configuration
export interface SectionCard {
  title: string;
  body: string;
}

// Messages from plugin to UI
export type PluginToUIMessage =
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'success'; message: string };

// Messages from UI to plugin
export type UIToPluginMessage =
  | { type: 'generate-spec' }
  | { type: 'cancel' };
