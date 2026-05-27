import type { SubmitFunction } from '@sveltejs/kit';
import { toast } from '$lib/toast';

type EnhanceConfig = {
	/**
	 * Toast text shown on `result.type === 'success'`.
	 * If null/undefined, no success toast is shown (caller may handle elsewhere).
	 */
	successMessage?: string | null;
	/**
	 * Called when the submission starts. Use to set spinner state and clear prior errors.
	 */
	onStart?: () => void;
	/**
	 * Called when the submission ends (success, failure, or error).
	 * Use to clear spinner state.
	 */
	onEnd?: () => void;
	/**
	 * Called with the error message when the result is a failure (400-class) or error (500-class).
	 * Use to set an inline error state for `<Alert severity="error">` rendering.
	 * The same message is also shown via toast.error automatically.
	 */
	onError?: (message: string) => void;
	/**
	 * Called on success AFTER the update has run. Use for post-success actions
	 * like closing a drawer, navigating, or resetting local state.
	 * Receives the result.data for inspection.
	 */
	onSuccess?: (data: Record<string, unknown> | undefined) => void;
	/**
	 * Whether to call update({ reset: false }) instead of update().
	 * Default false (reset = true, SvelteKit default). Set true to preserve
	 * field values after submission (typical for "save settings" forms where
	 * the user expects their inputs to remain visible).
	 */
	preserveValues?: boolean;
};

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Wraps a SvelteKit form's use:enhance callback to provide consistent
 * toast + inline error handling across the dashboard.
 *
 * Usage:
 *   <form use:enhance={enhanceWithToasts({
 *     successMessage: 'Profile saved',
 *     onStart: () => { submitting = true; saveError = null; },
 *     onEnd: () => { submitting = false; },
 *     onError: (msg) => { saveError = msg; }
 *   })}>
 *     {#if saveError}<Alert severity="error">{saveError}</Alert>{/if}
 *     ...
 *   </form>
 */
export function enhanceWithToasts(config: EnhanceConfig = {}): SubmitFunction {
	return () => {
		config.onStart?.();
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					await update(config.preserveValues ? { reset: false } : undefined);
					if (config.successMessage) toast.success(config.successMessage);
					config.onSuccess?.(result.data);
				} else if (result.type === 'failure') {
					await update(config.preserveValues ? { reset: false } : undefined);
					const message = (result.data?.error as string | undefined) ?? GENERIC_ERROR_MESSAGE;
					toast.error(message);
					config.onError?.(message);
				} else if (result.type === 'error') {
					const message = result.error?.message ?? GENERIC_ERROR_MESSAGE;
					toast.error(message);
					config.onError?.(message);
				} else if (result.type === 'redirect') {
					await update();
				}
			} finally {
				config.onEnd?.();
			}
		};
	};
}
