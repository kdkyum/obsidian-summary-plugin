import {readFile} from 'fs/promises';

export async function extractHtmlText(htmlPath: string): Promise<string> {
	try {
		const html = await readFile(htmlPath, 'utf-8');
		return stripHtmlTags(html);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to extract HTML text: ${error.message}`);
		}
		throw error;
	}
}

function stripHtmlTags(html: string): string {
	// Remove script and style elements entirely
	let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
	text = text.replace(/<style[\s\S]*?<\/style>/gi, '');

	// Remove HTML comments
	text = text.replace(/<!--[\s\S]*?-->/g, '');

	// Replace common block elements with newlines
	text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|section|article)[^>]*>/gi, '\n');

	// Remove remaining HTML tags
	text = text.replace(/<[^>]+>/g, '');

	// Decode common HTML entities
	text = text.replace(/&nbsp;/g, ' ');
	text = text.replace(/&amp;/g, '&');
	text = text.replace(/&lt;/g, '<');
	text = text.replace(/&gt;/g, '>');
	text = text.replace(/&quot;/g, '"');
	text = text.replace(/&#39;/g, "'");

	// Clean up whitespace
	text = text.replace(/\n\s*\n/g, '\n\n');
	text = text.trim();

	return text;
}
