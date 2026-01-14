import { spawn } from 'child_process';
import type { SummaryPluginSettings } from './settings';
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
		const formattedBody = await callClaude(
			settings.claudePath,
			settings.model,
			OFM_PROMPT,
			body
		);

		// Join back together
		return frontmatter + formattedBody;
	}

	return callClaude(settings.claudePath, settings.model, OFM_PROMPT, content);
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
