// TODO: replace console.debug with a real analytics provider (e.g. Plausible, PostHog)
export function track(eventName: string, props?: Record<string, unknown>): void {
	console.debug('[analytics]', eventName, props ?? {});
}
