import { existsSync } from 'fs';

export interface Frontmatter {
	title?: string;
	authors?: string;
	year?: string;
	file?: string;
	[key: string]: string | undefined;
}

export function parseFrontmatter(content: string): Frontmatter | null {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
	const match = content.match(frontmatterRegex);

	if (!match?.[1]) {
		return null;
	}

	const frontmatter: Frontmatter = {};
	const lines = match[1].split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim();
		let value = line.slice(colonIndex + 1).trim();

		// Remove quotes if present
		if ((value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		frontmatter[key] = value;
	}

	return frontmatter;
}

export function getFirstFilePath(frontmatter: Frontmatter): string | null {
	if (!frontmatter.file) {
		return null;
	}

	const filePath = frontmatter.file.trim();

	// First, try the full path as-is (handles filenames with commas)
	if (existsSync(filePath)) {
		return filePath;
	}

	// If not found, try splitting by comma (for multiple files)
	const paths = filePath.split(',');
	const firstPath = paths[0]?.trim();

	return firstPath || null;
}

export function getFileExtension(filePath: string): string {
	const lastDot = filePath.lastIndexOf('.');
	if (lastDot === -1) return '';
	return filePath.slice(lastDot + 1).toLowerCase();
}
