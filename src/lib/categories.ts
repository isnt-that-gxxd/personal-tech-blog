export const categoryNames = [
	'Learn AI',
	'Vibe Coding',
	'Projects',
	'Product Design',
] as const;

export type CategoryName = (typeof categoryNames)[number];

export const categorySlugs: Record<CategoryName, string> = {
	'Learn AI': 'learn-ai',
	'Vibe Coding': 'vibe-coding',
	Projects: 'projects',
	'Product Design': 'product-design',
};
