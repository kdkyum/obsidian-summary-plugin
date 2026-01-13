import {MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, SummaryPluginSettings, SummarySettingTab} from "./settings";
import {summarizeDocument} from "./summarizer";

export default class SummaryPlugin extends Plugin {
	settings: SummaryPluginSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon for quick access
		this.addRibbonIcon('file-text', 'Summarize document', async () => {
			await this.runSummarize();
		});

		// Add command to summarize current document
		this.addCommand({
			id: 'summarize-document',
			name: 'Summarize current document',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView?.file) {
					if (!checking) {
						void this.runSummarize();
					}
					return true;
				}
				return false;
			}
		});

		// Add settings tab
		this.addSettingTab(new SummarySettingTab(this.app, this));
	}

	async runSummarize(): Promise<void> {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView?.file) {
			new Notice('No active Markdown file');
			return;
		}

		const file = markdownView.file;

		try {
			new Notice('Summarizing document...');

			// Read current content
			const content = await this.app.vault.read(file);

			// Run summarization
			const result = await summarizeDocument(content, this.settings);

			// Write back to file
			await this.app.vault.modify(file, result.newContent);

			new Notice('Summary added successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Summarization failed: ${message}`);
			console.error('Summary plugin error:', error);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SummaryPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
