// Single import path for app-wide toast usage.
// Convention: success → toast.success(); errors → BOTH toast.error() and
// inline <Alert severity="error"> for forms. Use enhanceWithToasts()
// from $lib/forms/enhance-with-toasts to wire this consistently.
export { toast } from 'svelte-sonner';
