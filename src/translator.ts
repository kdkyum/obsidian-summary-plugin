import type { SummaryPluginSettings } from './settings';
import { callLLM } from './llm-client';
// @ts-ignore
import TRANSLATOR_PROMPT from './prompts/translator.md';

export interface TranslateResult {
	translation: string;
	newContent: string;
}

export async function translateContent(
	content: string,
	settings: SummaryPluginSettings
): Promise<TranslateResult> {
	const translation = await callLLM(
		settings.cliProvider,
		settings.model,
		TRANSLATOR_PROMPT,
		content
	);

	// Append translation to the end of the original content
	const separator = '\n\n---\n\n# Translation\n\n';
	const newContent = content + separator + translation;

	return { translation, newContent };
}
