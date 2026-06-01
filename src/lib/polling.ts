import { dev } from '$app/environment';

/**
 * Runs `fn` on an interval, but only in production, only while the tab is
 * visible, and immediately whenever the tab regains visibility (catch-up).
 * Pauses entirely when the tab is hidden so background tabs don't poll.
 * Returns a cleanup function. In dev it's a no-op — no polling at all.
 */
export function startVisiblePolling(fn: () => void, intervalMs: number): () => void {
	if (dev || typeof document === 'undefined') return () => {};

	let timer: ReturnType<typeof setInterval> | null = null;

	const start = () => {
		if (timer === null) timer = setInterval(fn, intervalMs);
	};
	const stop = () => {
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};
	const onVisibility = () => {
		if (document.visibilityState === 'visible') {
			fn(); // catch up immediately on refocus
			start();
		} else {
			stop();
		}
	};

	document.addEventListener('visibilitychange', onVisibility);
	if (document.visibilityState === 'visible') start();

	return () => {
		document.removeEventListener('visibilitychange', onVisibility);
		stop();
	};
}
