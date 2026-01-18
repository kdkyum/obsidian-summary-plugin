import { existsSync } from 'fs';
import { parseFrontmatter, getFirstFilePath, getFileExtension } from './frontmatter';
import { extractPdfText } from './extractors/pdf';
import { extractHtmlText } from './extractors/html';
import type { SummaryPluginSettings } from './settings';
import { callLLM } from './llm-client';
// @ts-ignore
import DEFAULT_PROMPT from './prompts/summarizer.md';

export interface SummarizeResult {
	summary: string;
	newContent: string;
}

export async function summarizeDocument(
	content: string,
	settings: SummaryPluginSettings
): Promise<SummarizeResult> {
	// Parse frontmatter
	const frontmatter = parseFrontmatter(content);
	if (!frontmatter) {
		throw new Error('No frontmatter found in document');
	}

	// Get the source file path
	const filePath = getFirstFilePath(frontmatter);
	if (!filePath) {
		throw new Error('No file path found in frontmatter');
	}

	// Check if file exists
	if (!existsSync(filePath)) {
		throw new Error(`Source file not found: ${filePath}`);
	}

	// Extract text based on file type
	const ext = getFileExtension(filePath);
	let extractedText: string;

	if (ext === 'pdf') {
		extractedText = await extractPdfText(filePath);
	} else if (ext === 'html' || ext === 'htm') {
		extractedText = await extractHtmlText(filePath);
	} else {
		throw new Error(`Unsupported file type: ${ext}`);
	}

	// Truncate to ~8000 tokens (roughly 32000 characters)
	const maxLength = 3200000;
	if (extractedText.length > maxLength) {
		extractedText = extractedText.slice(0, maxLength) + '\n\n[Content truncated...]';
	}

	// Call LLM
	const summary = await callLLM(settings.cliProvider, settings.model, DEFAULT_PROMPT, extractedText);

	// Insert summary into document
	const SUMMARY_HEADING = '# Summary';
	const newContent = insertSummary(content, summary, SUMMARY_HEADING);

	return { summary, newContent };
}

function insertSummary(content: string, summary: string, heading: string): string {
	const summarySection = `\n\n${heading}\n\n${summary}\n`;

	// Check if summary section already exists - replace it
	const headingEscaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const existingSummaryRegex = new RegExp(`${headingEscaped}\\n\\n[\\s\\S]*?(?=\\n\\n## |\\n\\n---|$)`);

	if (existingSummaryRegex.test(content)) {
		return content.replace(existingSummaryRegex, `${heading}\n\n${summary}`);
	}

	// Find the end of the Abstract callout and insert after it
	const abstractCalloutRegex = />\s*\[!abstract\]\+?\n(>.*\n?)*/i;
	const abstractMatch = content.match(abstractCalloutRegex);
	if (abstractMatch) {
		const abstractStart = content.indexOf(abstractMatch[0]);
		const abstractEnd = abstractStart + abstractMatch[0].length;
		return content.slice(0, abstractEnd) + summarySection + content.slice(abstractEnd);
	}

	// Also check for ## Abstract heading format
	const abstractHeadingMatch = content.match(/## Abstract\s*\n/);
	if (abstractHeadingMatch) {
		const abstractStart = content.indexOf(abstractHeadingMatch[0]);
		const afterAbstract = abstractStart + abstractHeadingMatch[0].length;
		const restContent = content.slice(afterAbstract);
		const nextSectionMatch = restContent.match(/\n## /);

		if (nextSectionMatch) {
			const insertPos = afterAbstract + (nextSectionMatch.index ?? 0);
			return content.slice(0, insertPos) + summarySection + content.slice(insertPos);
		} else {
			return content + summarySection;
		}
	}

	// Fallback: insert after frontmatter
	const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
	if (frontmatterMatch) {
		const frontmatterEnd = frontmatterMatch[0].length;
		return content.slice(0, frontmatterEnd) + summarySection + content.slice(frontmatterEnd);
	}

	// Last resort: append to end
	return content + summarySection;
}
