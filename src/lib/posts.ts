import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export interface PostWithNeighbors {
	post: PostEntry;
	previous: PostEntry | undefined;
	next: PostEntry | undefined;
}

const featuredPostIds = ['ai-basics', 'resilient-async-work'] as const;

export async function getPublishedPosts(): Promise<PostEntry[]> {
	return getCollection('posts', ({ data }) => !data.draft);
}

export function getFeaturedPosts(posts: readonly PostEntry[]): PostEntry[] {
	const publishedPostsById = new Map(
		posts.filter((post) => !post.data.draft).map((post) => [post.id, post] as const),
	);
	const selectedIds = new Set<string>();

	const featuredPosts = featuredPostIds.flatMap((id) => {
		if (selectedIds.has(id)) return [];
		selectedIds.add(id);
		const post = publishedPostsById.get(id);
		return post ? [post] : [];
	});

	return sortPostsByDate(featuredPosts).slice(0, 3);
}

export function sortPostsByDate(
	posts: readonly PostEntry[],
	direction: 'newest' | 'oldest' = 'newest',
): PostEntry[] {
	return [...posts].sort((a, b) => {
		const aTime = a.data.publishedAt ? Date.parse(a.data.publishedAt) : a.data.date.getTime();
		const bTime = b.data.publishedAt ? Date.parse(b.data.publishedAt) : b.data.date.getTime();
		const idDifference = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		const newestFirst = bTime - aTime || idDifference;
		return direction === 'newest' ? newestFirst : -newestFirst;
	});
}

export function getPostsWithNeighbors(posts: readonly PostEntry[]): PostWithNeighbors[] {
	const chronologicalPosts = sortPostsByDate(posts, 'oldest');

	return chronologicalPosts.map((post, index) => ({
		post,
		previous: chronologicalPosts[index - 1],
		next: chronologicalPosts[index + 1],
	}));
}

export function formatPostDate(date: Date): string {
	return new Intl.DateTimeFormat('ko-KR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	}).format(date);
}
