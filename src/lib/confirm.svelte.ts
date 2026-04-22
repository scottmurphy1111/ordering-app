type ConfirmOptions = {
	title?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
};

type ConfirmState = {
	open: boolean;
	message: string;
	title: string;
	confirmLabel: string;
	cancelLabel: string;
	danger: boolean;
	resolve: ((value: boolean) => void) | null;
};

export const confirmState = $state<ConfirmState>({
	open: false,
	message: '',
	title: 'Confirm',
	confirmLabel: 'Confirm',
	cancelLabel: 'Cancel',
	danger: true,
	resolve: null
});

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
	return new Promise((resolve) => {
		confirmState.open = true;
		confirmState.message = message;
		confirmState.title = options.title ?? 'Confirm';
		confirmState.confirmLabel = options.confirmLabel ?? 'Confirm';
		confirmState.cancelLabel = options.cancelLabel ?? 'Cancel';
		confirmState.danger = options.danger ?? true;
		confirmState.resolve = resolve;
	});
}
