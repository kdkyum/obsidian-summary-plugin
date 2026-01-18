import type { SummaryPluginSettings } from './settings';
import { callLLM } from './llm-client';
// @ts-ignore
import OFM_PROMPT from './prompts/ofm-formatter.md';

export async function formatToOFM(
	content: string,
	settings: SummaryPluginSettings
): Promise<string> {
	// Check for YAML frontmatter
	const fmRegex = /^---\n[\s\S]*?\n---\n/;
	const match = content.match(fmRegex);

	if (match) {
		const frontmatter = match[0];
		const body = content.slice(frontmatter.length);

		// Format only the body
		const formattedBody = await callLLM(
			settings.cliProvider,
			settings.model,
			OFM_PROMPT,
			body
		);

		// Join back together
		return frontmatter + formattedBody;
	}

	return callLLM(settings.cliProvider, settings.model, OFM_PROMPT, content);
}
