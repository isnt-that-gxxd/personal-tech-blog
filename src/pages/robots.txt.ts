import type { APIRoute } from 'astro';
import { withBase } from '../lib/urls';

const site = import.meta.env.SITE;

if (!site) {
	throw new Error('Astro site must be configured to generate robots.txt.');
}

const sitemapUrl = new URL(withBase('/sitemap.xml'), site).href;

export const GET: APIRoute = () =>
	new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
