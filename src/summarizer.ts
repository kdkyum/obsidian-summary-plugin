import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { parseFrontmatter, getFirstFilePath, getFileExtension } from './frontmatter';
import { extractPdfText } from './extractors/pdf';
import { extractHtmlText } from './extractors/html';
import type { SummaryPluginSettings } from './settings';

const DEFAULT_PROMPT = `You are a research assistant for a postdoctoral researcher. Your task is to provide clear, technically rigorous summaries of academic papers. Assume the reader has graduate-level expertise and values precision over simplification. Follow GitHub Flavored Markdown Specification and use LaTeX for math equations.

---

## Summary Structure

For each paper, provide:

### 1. One-Sentence Takeaway
A single sentence capturing the paper's core contribution or finding.

### 2. Research Question & Motivation
- What problem does this paper address?
- Why does it matter? (Gap in literature, practical relevance, theoretical importance)

### 3. Methodology
- Study design, data sources, models, or theoretical framework
- Key assumptions or constraints
- Sample size / datasets (if empirical)

### 4. Key Findings
- Primary results (quantitative where possible)
- Secondary or surprising findings
- Null results if relevant

### 5. Contributions & Novelty
- What is genuinely new here?
- How does this advance the field beyond prior work?

### 6. Limitations & Open Questions
- Acknowledged limitations
- Unacknowledged weaknesses you observe
- Natural follow-up questions

---

## Formatting Guidelines

- Use precise technical language; do not over-simplify
- Include key equations, metrics, or statistical results when central to the argument
- Quote exact figures (e.g., "accuracy improved from 78.2% to 84.6%") rather than vague descriptors
- Flag any claims that appear under-supported or potentially problematic
- Note if the paper is a preprint vs. peer-reviewed publication

## Example / Output

**Input:** [User uploads or pastes paper]

**Output:**

TL;DR: *(one-sentence takeaway)*

> [!question] **Research Question:** *(research question)*

### Motivation

*(motivation)*	

### Methodology

*(methodology)*

### Findings

*(findings)*

### Main Contributions

*(contributions)*

### Limitations

*(limitations)*

---

## Notes

- If the paper is missing key details (e.g., no code availability, unclear statistics), note this explicitly.
- Distinguish between what the authors claim and what the evidence supports.
- For review papers, shift focus to synthesis quality and coverage gaps.

> Abstract
`;

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
		throw new Error(`Source file not found: ${filePath} `);
	}

	// Extract text based on file type
	const ext = getFileExtension(filePath);
	let extractedText: string;

	if (ext === 'pdf') {
		extractedText = await extractPdfText(filePath);
	} else if (ext === 'html' || ext === 'htm') {
		extractedText = await extractHtmlText(filePath);
	} else {
		throw new Error(`Unsupported file type: ${ext} `);
	}

	// Truncate to ~8000 tokens (roughly 32000 characters)
	const maxLength = 32000;
	if (extractedText.length > maxLength) {
		extractedText = extractedText.slice(0, maxLength) + '\n\n[Content truncated...]';
	}

	// Call Claude CLI
	const prompt = settings.customPrompt || DEFAULT_PROMPT;
	const summary = await callClaude(settings.claudePath, prompt, extractedText);

	// Insert summary into document
	const newContent = insertSummary(content, summary, settings.summaryHeading);

	return { summary, newContent };
}

async function callClaude(claudePath: string, systemPrompt: string, content: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn(claudePath, [
			'--model', 'sonnet',
			'--system-prompt', systemPrompt,
			'-p', content
		], {
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
				reject(new Error(`Claude CLI exited with code ${code}: ${stderr} `));
			}
		});

		proc.on('error', (err) => {
			reject(new Error(`Claude CLI failed: ${err.message} `));
		});
	});
}

function insertSummary(content: string, summary: string, heading: string): string {
	const summarySection = `\n\n${heading} \n\n${summary} \n`;

	// Check if summary section already exists
	const headingEscaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const existingSummaryRegex = new RegExp(`(${headingEscaped}\\n\\n)[\\s\\S]*? (\\n\\n## |\\n\\n-- -| $)`);

	if (existingSummaryRegex.test(content)) {
		// Replace existing summary
		return content.replace(existingSummaryRegex, `$1${summary} \n$2`);
	}

	// Try to insert after Abstract section
	const abstractRegex = /(## Abstract[\s\S]*?)(\n\n## |\n\n---|\n*$)/;
	const abstractMatch = content.match(abstractRegex);

	if (abstractMatch) {
		return content.replace(abstractRegex, `$1${summarySection} $2`);
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
