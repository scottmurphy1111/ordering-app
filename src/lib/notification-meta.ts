import type { EmailCategory } from '$lib/server/email';

export type CategoryDisplay = {
	label: string;
	description: string;
	group: 'subscription' | 'account' | 'special_orders' | 'marketing';
	isCritical: boolean;
};

/**
 * Per-category metadata used by the prefs UI. Categories not listed
 * here are not surfaced as toggles (e.g. order_confirmed goes to
 * customers, not vendors). When a new vendor-facing category is added,
 * add it here too.
 */
export const CATEGORY_DISPLAY: Partial<Record<EmailCategory, CategoryDisplay>> = {
	subscription_confirmed: {
		group: 'subscription',
		isCritical: true,
		label: 'Subscription confirmed',
		description: 'Renewals, tier changes, plan confirmations.'
	},
	subscription_tier_changed: {
		group: 'subscription',
		isCritical: true,
		label: 'Plan changed',
		description: 'When you change your plan tier.'
	},
	subscription_interval_changed: {
		group: 'subscription',
		isCritical: true,
		label: 'Billing interval changed',
		description: 'Monthly ↔ annual switches.'
	},
	subscription_addon_changed: {
		group: 'subscription',
		isCritical: true,
		label: 'Add-ons changed',
		description: 'When you add or remove subscription add-ons.'
	},
	subscription_cancellation_scheduled: {
		group: 'subscription',
		isCritical: true,
		label: 'Cancellation scheduled',
		description: 'When a cancellation is queued for end of period.'
	},
	subscription_cancellation_immediate: {
		group: 'subscription',
		isCritical: true,
		label: 'Cancellation immediate',
		description: 'When a cancellation takes effect right away.'
	},
	subscription_cancellation_completed: {
		group: 'subscription',
		isCritical: true,
		label: 'Cancellation completed',
		description: 'When a scheduled cancellation has been processed.'
	},
	subscription_reactivated: {
		group: 'subscription',
		isCritical: true,
		label: 'Subscription reactivated',
		description: 'When you reactivate a cancelled subscription.'
	},
	payment_failed: {
		group: 'subscription',
		isCritical: true,
		label: 'Payment failed',
		description: 'Failed charge attempts requiring action.'
	},

	pause_confirmed: {
		group: 'account',
		isCritical: true,
		label: 'Pause confirmed',
		description: 'When your subscription pause is accepted.'
	},
	pause_reminder: {
		group: 'account',
		isCritical: true,
		label: 'Pause reminders',
		description: 'Reminders 7/3/1 days before your pause ends.'
	},
	pause_resumed: {
		group: 'account',
		isCritical: true,
		label: 'Pause resumed',
		description: 'When a paused subscription resumes.'
	},
	pending_approval_reminder: {
		group: 'account',
		isCritical: true,
		label: 'Pending approval reminders',
		description: 'Reminders to review orders waiting on your approval.'
	},

	special_order_request_received_vendor: {
		group: 'special_orders',
		isCritical: false,
		label: 'New custom order request',
		description: 'When a customer submits a custom order request.'
	},
	special_order_accepted_vendor: {
		group: 'special_orders',
		isCritical: false,
		label: 'Custom order accepted by customer',
		description: 'When a customer accepts your custom-order quote.'
	},
	special_order_declined_by_customer_vendor: {
		group: 'special_orders',
		isCritical: false,
		label: 'Custom order declined by customer',
		description: 'When a customer declines your custom-order quote.'
	}
};

export const GROUP_LABELS: Record<CategoryDisplay['group'], string> = {
	subscription: 'Subscription & billing',
	account: 'Account status',
	special_orders: 'Custom orders',
	marketing: 'Product updates from Order Local, LLC'
};
