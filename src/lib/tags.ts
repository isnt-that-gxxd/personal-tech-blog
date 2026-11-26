export function normalizeTagName(value: string): string {
	return value.trim().replace(/^#+\s*/, '').trim();
}

export function normalizeTagKey(value: string): string {
	return normalizeTagName(value).toLowerCase();
}

export function normalizeTags(tags: readonly string[] | undefined): string[] {
	const seen = new Set<string>();

	return (tags ?? []).flatMap((value) => {
		const tag = normalizeTagName(value);
		const key = tag.toLowerCase();

		if (!tag || seen.has(key)) return [];
		seen.add(key);
		return [tag];
	});
}
