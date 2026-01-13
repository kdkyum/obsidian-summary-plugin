import {spawn} from 'child_process';
import {existsSync} from 'fs';
import {parseFrontmatter, getFirstFilePath, getFileExtension} from './frontmatter';
import {extractPdfText} from './extractors/pdf';
import {extractHtmlText} from './extractors/html';
import type {SummaryPluginSettings} from './settings';

const DEFAULT_PROMPT = 'Summarize this academic paper in a short paragraph. Focus on the main findings, methodology, and key contributions.';

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

	// Truncate if too long (Claude CLI has limits)
	const maxLength = 100000;
	if (extractedText.length > maxLength) {
		extractedText = extractedText.slice(0, maxLength) + '\n\n[Content truncated...]';
	}

	// Call Claude CLI
	const prompt = settings.customPrompt || DEFAULT_PROMPT;
	const summary = await callClaude(settings.claudePath, prompt, extractedText);

	// Insert summary into document
	const newContent = insertSummary(content, summary, settings.summaryHeading);

	return {summary, newContent};
}

async function callClaude(claudePath: string, prompt: string, content: string): Promise<string> {
	const fullPrompt = `${prompt}\n\n---\n\n${content}`;

	return new Promise((resolve, reject) => {
		const proc = spawn(claudePath, ['-p', fullPrompt], {
			timeout: 300000 // 5 minute timeout
		});

		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data) => {
			stdout += String(data);
		});

		proc.stderr.on('data', (data) => {
			stderr += String(data);
		});

		proc.on('close', (code) => {
			if (code === 0) {
				resolve(stdout.trim());
			} else {
				reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
			}
		});

		proc.on('error', (err) => {
			reject(new Error(`Claude CLI failed: ${err.message}`));
		});
	});
}

function insertSummary(content: string, summary: string, heading: string): string {
	const summarySection = `\n\n${heading}\n\n${summary}\n`;

	// Check if summary section already exists
	const headingEscaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const existingSummaryRegex = new RegExp(`(${headingEscaped}\\n\\n)[\\s\\S]*?(\\n\\n##|\\n\\n---|$)`);

	if (existingSummaryRegex.test(content)) {
		// Replace existing summary
		return content.replace(existingSummaryRegex, `$1${summary}\n$2`);
	}

	// Try to insert after Abstract section
	const abstractRegex = /(## Abstract[\s\S]*?)(\n\n## |\n\n---|\n*$)/;
	const abstractMatch = content.match(abstractRegex);

	if (abstractMatch) {
		return content.replace(abstractRegex, `$1${summarySection}$2`);
	}

	// Fallback: insert after frontmatter
	const frontmatterEndRegex = /^---\n[\s\S]*?\n---\n/;
	const frontmatterMatch = content.match(frontmatterEndRegex);

	if (frontmatterMatch) {
		const frontmatterEnd = frontmatterMatch[0].length;
		return content.slice(0, frontmatterEnd) + summarySection + content.slice(frontmatterEnd);
	}

	// Last resort: append to end
	return content + summarySection;
}
