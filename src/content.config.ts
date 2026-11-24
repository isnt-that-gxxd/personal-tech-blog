import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { categoryNames } from './lib/categories';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			category: z.enum(categoryNames),
			draft: z.boolean().default(false),
			thumbnail: image().optional(),
			thumbnailAlt: z.string().optional(),
		}),
});

export const collections = { posts };
