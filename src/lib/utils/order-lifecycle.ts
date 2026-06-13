export const lifecycleStages = [
	{ value: 'received', label: 'Received', icon: 'mdi:inbox-arrow-down' },
	{ value: 'confirmed', label: 'Confirmed', icon: 'mdi:check-circle-outline' },
	{ value: 'preparing', label: 'Preparing', icon: 'mdi:progress-wrench' },
	{ value: 'ready', label: 'Ready', icon: 'mdi:package-variant-closed' },
	{ value: 'fulfilled', label: 'Fulfilled', icon: 'mdi:flag-checkered' }
] as const;

export const actionConfig: Record<string, { label: string; icon: string }> = {
	received: { label: 'Confirm', icon: 'mdi:check-circle-outline' },
	confirmed: { label: 'Start preparing', icon: 'mdi:progress-wrench' },
	preparing: { label: 'Mark ready', icon: 'mdi:package-variant-closed' },
	ready: { label: 'Fulfill', icon: 'mdi:flag-checkered' }
};

// Valid forward transitions for the production lifecycle. The server uses this to
// reject any status change that isn't the legitimate next step.
export const nextStatus: Record<string, string> = {
	received: 'confirmed',
	confirmed: 'preparing',
	preparing: 'ready',
	ready: 'fulfilled'
};
