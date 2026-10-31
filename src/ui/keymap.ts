export type Focus = 'list' | 'input' | 'detail';
export type OverlayKind = 'help' | 'approvals' | 'confirm' | 'diff';

/** Structural subset of Ink's Key, so this module stays framework-free. */
export interface KeyLike {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageUp: boolean;
  pageDown: boolean;
  return: boolean;
  escape: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  ctrl: boolean;
  shift: boolean;
  home: boolean;
  end: boolean;
  meta: boolean;
}

export interface KeyContext {
  focus: Focus;
  overlay: OverlayKind | null;
  /** True while the approvals overlay is asking for approve-all confirmation. */
  confirmingAll?: boolean;
  /** True while the user is typing a follow-up conversation inside the detail view. */
  followUpMode?: boolean;
}

export type DashboardAction =
  | { type: 'none' }
  | { type: 'quit' }
  | { type: 'help' }
  | { type: 'closeOverlay' }
  | { type: 'cycleFocus'; reverse: boolean }
  | { type: 'blur' }
  | { type: 'moveSelection'; delta: number }
  | { type: 'edgeSelection'; edge: 'first' | 'last' }
  | { type: 'openDetail' }
  | { type: 'enterFollowUp' }
  | { type: 'exitFollowUp' }
  | { type: 'submitFollowUp' }
  | { type: 'fold'; expand: boolean }
  | { type: 'openApprovals' }
  | { type: 'cancelTask' }
  | { type: 'resumeTask' }
  | { type: 'mergeTask' }
  | { type: 'discardTask' }
  | { type: 'deleteTask' }
  | { type: 'diffTask' }
  | { type: 'cycleFilter' }
  | { type: 'focusInput'; seed?: string }
  | { type: 'scroll'; delta: number; page?: boolean }
  | { type: 'scrollEdge'; edge: 'first' | 'last' }
  | { type: 'toggleFollow' }
  | { type: 'toggleVerbose' }
  | { type: 'history'; delta: number }
  | { type: 'clearInput' }
  | { type: 'overlayMove'; delta: number }
  | { type: 'overlayApprove' }
  | { type: 'overlayDeny' }
  | { type: 'overlayApproveAll' }
  | { type: 'overlayApproveAllConfirm' }
  | { type: 'overlayCancelApproveAll' }
  | { type: 'overlayConfirmYes' }
  | { type: 'overlayConfirmNo' }
  | { type: 'overlayScroll'; delta: number; page?: boolean }
  | { type: 'overlayEdge'; edge: 'first' | 'last' };

const NONE: DashboardAction = { type: 'none' };

function isApproveAll(input: string, key: KeyLike): boolean {
  return input === 'A' || (input === 'a' && key.shift);
}

/**
 * Resolve a key press into a dashboard intent. This is the only place that
 * decides whether a character is a global shortcut or text input: single
 * letter shortcuts are never active while the input owns focus.
 */
export function resolveAction(input: string, key: KeyLike, context: KeyContext): DashboardAction {
  if (key.ctrl && input.toLowerCase() === 'c') {
    return { type: 'quit' };
  }

  if (context.overlay) {
    return resolveOverlayAction(input, key, context.overlay, context.confirmingAll === true);
  }

  if (key.tab) {
    return { type: 'cycleFocus', reverse: key.shift };
  }

  if (key.escape) {
    return { type: 'blur' };
  }

  if (input === '?' && context.focus !== 'input') {
    return { type: 'help' };
  }

  if (context.focus === 'detail') {
    return resolveDetailAction(input, key, context.followUpMode === true);
  }

  // Up/Down move the list from both the list and the input. This is deliberate:
  // selection must work on the first keypress, without a hidden focus mode.
  if (key.upArrow || (context.focus === 'list' && input === 'k')) {
    return { type: 'moveSelection', delta: -1 };
  }
  if (key.downArrow || (context.focus === 'list' && input === 'j')) {
    return { type: 'moveSelection', delta: 1 };
  }
  if (key.pageUp) {
    return { type: 'scroll', delta: -1, page: true };
  }
  if (key.pageDown) {
    return { type: 'scroll', delta: 1, page: true };
  }

  if (context.focus === 'input') {
    if (key.ctrl && input === 'p') return { type: 'history', delta: -1 };
    if (key.ctrl && input === 'n') return { type: 'history', delta: 1 };
    if (key.ctrl && input === 'u') return { type: 'clearInput' };
    return NONE;
  }

  // List focus.
  if (key.return) return { type: 'openDetail' };
  if (key.home || input === 'g') return { type: 'edgeSelection', edge: 'first' };
  if (key.end || input === 'G') return { type: 'edgeSelection', edge: 'last' };
  if (key.leftArrow || input === 'h') return { type: 'fold', expand: false };
  if (key.rightArrow || input === 'l') return { type: 'fold', expand: true };
  if (key.ctrl && input === 'u') return { type: 'clearInput' };
  if (input === '/') return { type: 'focusInput', seed: '/' };
  if (input === 'a') return { type: 'openApprovals' };
  if (input === 'c') return { type: 'cancelTask' };
  if (input === 'r') return { type: 'resumeTask' };
  if (input === 'm') return { type: 'mergeTask' };
  if (input === 'x') return { type: 'discardTask' };
  if (input === 'd' || key.delete) return { type: 'deleteTask' };
  if (input === 'D' || (input === 'd' && key.shift)) return { type: 'diffTask' };
  if (input === 's') return { type: 'cycleFilter' };
  if (input === 'f') return { type: 'toggleFollow' };
  if (input === 'v') return { type: 'toggleVerbose' };
  if (input === 'q') return { type: 'quit' };

  return NONE;
}

function resolveDetailAction(input: string, key: KeyLike, followUpMode: boolean): DashboardAction {
  if (followUpMode) {
    if (key.escape) return { type: 'exitFollowUp' };
    if (key.return) return { type: 'submitFollowUp' };
    return NONE;
  }
  if (key.upArrow || input === 'k') return { type: 'scroll', delta: -1 };
  if (key.downArrow || input === 'j') return { type: 'scroll', delta: 1 };
  if (key.pageUp) return { type: 'scroll', delta: -1, page: true };
  if (key.pageDown) return { type: 'scroll', delta: 1, page: true };
  if (key.home || input === 'g') return { type: 'scrollEdge', edge: 'first' };
  if (key.end || input === 'G') return { type: 'scrollEdge', edge: 'last' };
  if (input === 'f') return { type: 'toggleFollow' };
  if (input === 'v') return { type: 'toggleVerbose' };
  if (key.return) return { type: 'enterFollowUp' };
  return NONE;
}

function resolveOverlayAction(
  input: string,
  key: KeyLike,
  overlay: OverlayKind,
  confirmingAll: boolean,
): DashboardAction {
  if (overlay === 'confirm') {
    if (input.toLowerCase() === 'y') return { type: 'overlayConfirmYes' };
    if (input.toLowerCase() === 'n' || key.escape || key.return) return { type: 'overlayConfirmNo' };
    return NONE;
  }

  if (overlay === 'help') {
    if (key.escape || key.return || input === '?' || input === 'q') {
      return { type: 'closeOverlay' };
    }
    return NONE;
  }

  if (overlay === 'approvals') {
    if (confirmingAll) {
      if (input.toLowerCase() === 'y') return { type: 'overlayApproveAllConfirm' };
      if (input.toLowerCase() === 'n' || input.toLowerCase() === 'x' || key.escape) {
        return { type: 'overlayCancelApproveAll' };
      }
      return NONE;
    }
    if (key.upArrow || input === 'k') return { type: 'overlayMove', delta: -1 };
    if (key.downArrow || input === 'j') return { type: 'overlayMove', delta: 1 };
    if (key.pageUp) return { type: 'overlayMove', delta: -5 };
    if (key.pageDown) return { type: 'overlayMove', delta: 5 };
    if (key.home) return { type: 'overlayEdge', edge: 'first' };
    if (key.end) return { type: 'overlayEdge', edge: 'last' };
    if (key.return || input.toLowerCase() === 'y') return { type: 'overlayApprove' };
    if (input.toLowerCase() === 'n' || input.toLowerCase() === 'x') return { type: 'overlayDeny' };
    if (isApproveAll(input, key)) return { type: 'overlayApproveAll' };
    if (key.escape || input === 'q') return { type: 'closeOverlay' };
    return NONE;
  }

  // Diff.
  if (key.upArrow || input === 'k') return { type: 'overlayScroll', delta: -1 };
  if (key.downArrow || input === 'j') return { type: 'overlayScroll', delta: 1 };
  if (key.pageUp) return { type: 'overlayScroll', delta: -1, page: true };
  if (key.pageDown) return { type: 'overlayScroll', delta: 1, page: true };
  if (key.home || input === 'g') return { type: 'overlayEdge', edge: 'first' };
  if (key.end || input === 'G') return { type: 'overlayEdge', edge: 'last' };
  if (key.escape || input === 'q') return { type: 'closeOverlay' };
  return NONE;
}
