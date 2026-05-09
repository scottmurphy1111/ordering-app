export const lifecycleStages = [
	{ value: 'received', label: 'Received', icon: 'mdi:inbox-arrow-down' },
	{ value: 'confirmed', label: 'Confirmed', icon: 'mdi:check-circle-outline' },
	{ value: 'preparing', label: 'In production', icon: 'mdi:progress-wrench' },
	{ value: 'ready', label: 'Ready', icon: 'mdi:package-variant-closed' },
	{ value: 'fulfilled', label: 'Fulfilled', icon: 'mdi:flag-checkered' }
] as const;

export const actionConfig: Record<string, { label: string; icon: string }> = {
	received: { label: 'Confirm', icon: 'mdi:check-circle-outline' },
	confirmed: { label: 'Start production', icon: 'mdi:progress-wrench' },
	preparing: { label: 'Mark ready', icon: 'mdi:package-variant-closed' },
	ready: { label: 'Fulfill', icon: 'mdi:flag-checkered' }
};
