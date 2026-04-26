import type { RequestHandler } from './$types';

const BASE = 'https://www.getorderlocal.com';

const pages = [
	{ loc: '/', priority: '1.0', changefreq: 'weekly' },
	{ loc: '/#pricing', priority: '0.9', changefreq: 'monthly' },
	{ loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
	{ loc: '/terms', priority: '0.3', changefreq: 'yearly' }
];

export const GET: RequestHandler = () => {
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>
    <loc>${BASE}${p.loc}</loc>
    <priority>${p.priority}</priority>
    <changefreq>${p.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
