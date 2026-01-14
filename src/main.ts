import { MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, SummaryPluginSettings, SummarySettingTab } from "./settings";
import { summarizeDocument } from "./summarizer";
import { formatToOFM } from "./ofm-formatter";
import { translateContent } from "./translator";

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

		// Add command to format as Obsidian Flavored Markdown
		this.addCommand({
			id: 'format-ofm',
			name: 'Format Markdown',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView?.file) {
					if (!checking) {
						void this.runFormatOFM();
					}
					return true;
				}
				return false;
			}
		});

		// Add command to translate document
		this.addCommand({
			id: 'translate-document',
			name: 'Translate document',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView?.file) {
					if (!checking) {
						void this.runTranslate();
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

			const content = await this.app.vault.read(file);
			const result = await summarizeDocument(content, this.settings);
			await this.app.vault.modify(file, result.newContent);

			new Notice('Summary added successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Summarization failed: ${message}`);
			console.error('Summary plugin error:', error);
		}
	}

	async runFormatOFM(): Promise<void> {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView?.file) {
			new Notice('No active Markdown file');
			return;
		}

		const file = markdownView.file;

		try {
			new Notice('Formatting Markdown...');

			const content = await this.app.vault.read(file);
			const formatted = await formatToOFM(content, this.settings);
			await this.app.vault.modify(file, formatted);

			new Notice('Formatted successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Formatting failed: ${message}`);
			console.error('OFM formatter error:', error);
		}
	}

	async runTranslate(): Promise<void> {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView?.file) {
			new Notice('No active Markdown file');
			return;
		}

		const file = markdownView.file;

		try {
			new Notice('Translating document...');

			const content = await this.app.vault.read(file);
			const result = await translateContent(content, this.settings);
			await this.app.vault.modify(file, result.newContent);

			new Notice('Translation appended successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Translation failed: ${message}`);
			console.error('Translator error:', error);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SummaryPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
