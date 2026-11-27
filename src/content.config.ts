import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { categoryNames, categorySlugs, type CategoryName } from './lib/categories';
import { normalizeTags } from './lib/tags';

const categorySchema = z.string().transform((value, context): CategoryName => {
	const category = categoryNames.find(
		(name) => name === value || categorySlugs[name] === value,
	);
	if (!category) {
		context.addIssue({ code: 'custom', message: `Invalid category: ${value}` });
		return z.NEVER;
	}
	return category;
});

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			category: categorySchema,
			draft: z.boolean().default(false),
			thumbnail: image().optional(),
			thumbnailAlt: z.string().optional(),
			tags: z.array(z.string()).optional().transform(normalizeTags),
		}),
});

export const collections = { posts };
