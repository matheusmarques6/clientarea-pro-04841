import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

export interface UseUnsavedChangesOptions {
  /**
   * Whether there are unsaved changes
   */
  hasUnsavedChanges: boolean;

  /**
   * Callback to execute when the user confirms navigation despite unsaved changes
   */
  onConfirmNavigation?: () => void;

  /**
   * Callback to execute when the user cancels navigation
   */
  onCancelNavigation?: () => void;
}

export interface UseUnsavedChangesReturn {
  /**
   * Whether navigation is currently blocked
   */
  isBlocked: boolean;

  /**
   * Proceed with the blocked navigation
   */
  proceed: () => void;

  /**
   * Cancel the blocked navigation
   */
  reset: () => void;
}

/**
 * Hook to warn users about unsaved changes before they navigate away or close the tab
 *
 * Features:
 * - Blocks navigation within the app (using React Router's useBlocker)
 * - Warns before closing/refreshing the browser tab (using beforeunload)
 * - Provides proceed/reset functions to control the blocker
 *
 * @example
 * ```tsx
 * const { isBlocked, proceed, reset } = useUnsavedChanges({
 *   hasUnsavedChanges: isDirty,
 *   onConfirmNavigation: () => console.log('User confirmed navigation'),
 *   onCancelNavigation: () => console.log('User cancelled navigation'),
 * });
 *
 * // Show a dialog when isBlocked becomes true
 * <AlertDialog open={isBlocked}>
 *   <AlertDialogContent>
 *     <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
 *     <AlertDialogDescription>
 *       Você tem alterações não salvas...
 *     </AlertDialogDescription>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel onClick={reset}>Cancelar</AlertDialogCancel>
 *       <AlertDialogAction onClick={proceed}>Descartar</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 * ```
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  onConfirmNavigation,
  onCancelNavigation,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  // Block navigation within the React Router app
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Warn before closing/refreshing the browser tab
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Modern browsers require returnValue to be set
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const proceed = useCallback(() => {
    if (blocker.state === 'blocked') {
      onConfirmNavigation?.();
      blocker.proceed();
    }
  }, [blocker, onConfirmNavigation]);

  const reset = useCallback(() => {
    if (blocker.state === 'blocked') {
      onCancelNavigation?.();
      blocker.reset();
    }
  }, [blocker, onCancelNavigation]);

  return {
    isBlocked: blocker.state === 'blocked',
    proceed,
    reset,
  };
}
