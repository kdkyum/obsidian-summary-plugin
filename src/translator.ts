import { spawn } from 'child_process';
import type { SummaryPluginSettings } from './settings';
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
	const translation = await callClaude(
		settings.claudePath,
		settings.model,
		TRANSLATOR_PROMPT,
		content
	);

	// Append translation to the end of the original content
	const separator = '\n\n---\n\n# Translation\n\n';
	const newContent = content + separator + translation;

	return { translation, newContent };
}

async function callClaude(
	claudePath: string,
	model: string,
	systemPrompt: string,
	content: string
): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn(claudePath, [
			'--model', model,
			'--system-prompt', systemPrompt,
			'-p', '-'
		]);

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

		proc.stdin.write(content);
		proc.stdin.end();

		proc.on('error', (err) => {
			reject(new Error(`Claude CLI failed: ${err.message}`));
		});
	});
}
