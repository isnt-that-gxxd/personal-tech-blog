import type { APIRoute } from 'astro';
import { categoryNames, categorySlugs } from '../lib/categories';
import { getPublishedPosts } from '../lib/posts';
import { withBase } from '../lib/urls';

const site = import.meta.env.SITE;

if (!site) {
	throw new Error('Astro site must be configured to generate the sitemap.');
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export const GET: APIRoute = async () => {
	const publicPaths = [
		'/',
		'/posts/',
		...categoryNames.map((category) => `/category/${categorySlugs[category]}/`),
	];
	const staticUrls = publicPaths.map((path) => new URL(withBase(path), site).href);
	const posts = await getPublishedPosts();
	const postUrls = posts.map((post) => {
		const loc = new URL(withBase(`/posts/${post.id}/`), site).href;
		const lastmod = post.data.updatedDate?.toISOString().slice(0, 10);
		return `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
	});
	const staticEntries = staticUrls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`);
	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...staticEntries,
		...postUrls,
		'</urlset>',
	].join('');

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
