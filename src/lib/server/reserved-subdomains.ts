/**
 * Subdomains that vendors cannot claim as their slug, AND that are not treated
 * as vendor slugs by host-based routing. This list is the union of:
 *   - Current app infrastructure: app, www, api, admin, mail, auth
 *   - Static/asset hosting conventions: static, assets, cdn
 *   - Future product surfaces: support, help, blog, docs, status, dashboard
 *   - Standard reserved names by convention: postmaster, webmaster,
 *     hostmaster, root, ftp, smtp, imap, pop, ns1, ns2
 *
 * Keep this list aggressive: a slug we don't reserve today and later need
 * for infrastructure is genuinely painful to reclaim from a vendor.
 */
export const RESERVED_SUBDOMAINS = new Set([
	// Current
	'app',
	'www',
	'api',
	'admin',
	'mail',
	'auth',
	// Static / asset hosting
	'static',
	'assets',
	'cdn',
	// Future product surfaces
	'support',
	'help',
	'blog',
	'docs',
	'status',
	'dashboard',
	// Standard convention
	'postmaster',
	'webmaster',
	'hostmaster',
	'root',
	'ftp',
	'smtp',
	'imap',
	'pop',
	'ns1',
	'ns2'
]);

export function isReservedSubdomain(slug: string): boolean {
	return RESERVED_SUBDOMAINS.has(slug.toLowerCase());
}
