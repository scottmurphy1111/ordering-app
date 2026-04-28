import type { User, Session } from 'better-auth/minimal';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
			vendorId?: number;
			vendor?: import('./lib/server/db/vendor').Vendor;
			vendorRole?: import('./lib/server/roles').VendorRole;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
