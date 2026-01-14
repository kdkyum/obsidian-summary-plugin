import { App, PluginSettingTab, Setting } from "obsidian";
import SummaryPlugin from "./main";

export interface SummaryPluginSettings {
	claudePath: string;
	model: string;
	customPrompt: string;
	summaryHeading: string;
}

export const DEFAULT_SETTINGS: SummaryPluginSettings = {
	claudePath: 'claude',
	model: 'sonnet',
	customPrompt: '',
	summaryHeading: '# Summary'
};

export class SummarySettingTab extends PluginSettingTab {
	plugin: SummaryPlugin;

	constructor(app: App, plugin: SummaryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Claude CLI path')
			.setDesc('The path to the claude command.')
			.addText(text => text
				.setPlaceholder('Enter path')
				.setValue(this.plugin.settings.claudePath)
				.onChange(async (value) => {
					this.plugin.settings.claudePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Claude model')
			.setDesc('The model to use.')
			.addText(text => text
				.setPlaceholder('Enter model')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Custom prompt')
			.setDesc('Custom prompt for summarization (leave empty for default)')
			.addTextArea(text => text
				.setPlaceholder('Summarize this academic paper in a short paragraph...')
				.setValue(this.plugin.settings.customPrompt)
				.onChange(async (value) => {
					this.plugin.settings.customPrompt = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Summary heading')
			.setDesc('Markdown heading for the summary section.')
			.addText(text => text
				.setPlaceholder('Enter heading')
				.setValue(this.plugin.settings.summaryHeading)
				.onChange(async (value) => {
					this.plugin.settings.summaryHeading = value;
					await this.plugin.saveSettings();
				}));
	}
}
