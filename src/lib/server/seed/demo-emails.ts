// Central list of all demo invitation emails across every archetype.
// Used by wipe operations to remove demo-seeded invitations without touching
// real team invitations that a vendor owner may have sent.
export const DEMO_INVITATION_EMAILS: readonly string[] = [
	'riley@millstreetbakery-demo.com', // storefront-bakery
	'drew@bloomandco-demo.com', // storefront-florist
	'morgan@hearthandcrumb-demo.com', // hybrid-bakery-with-market
	'sam@greenrootcsa-demo.com', // csa-weekly
	'alex@foxfern-demo.com' // farmers-market-booth
];
