import { PluginToUIMessage } from '../types';

/**
 * Posts a status message to the UI
 */
export function postStatus(message: string): void {
  const msg: PluginToUIMessage = { type: 'status', message };
  figma.ui.postMessage(msg);
}

/**
 * Posts an error message to the UI
 */
export function postError(message: string): void {
  const msg: PluginToUIMessage = { type: 'error', message };
  figma.ui.postMessage(msg);
}

/**
 * Posts a success message to the UI
 */
export function postSuccess(message: string): void {
  const msg: PluginToUIMessage = { type: 'success', message };
  figma.ui.postMessage(msg);
}
