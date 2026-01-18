import { App, PluginSettingTab, Setting, DropdownComponent } from "obsidian";
import SummaryPlugin from "./main";

export type CliProvider = 'claude' | 'gemini';

export interface SummaryPluginSettings {
	cliProvider: CliProvider;
	model: string;
}

export const AVAILABLE_CLIS: Record<CliProvider, string> = {
	'claude': 'Claude CLI',
	'gemini': 'Gemini CLI'
};

export const CLAUDE_MODELS: Record<string, string> = {
	'claude-sonnet-4-5': 'Claude Sonnet 4.5',
	'claude-opus-4-5': 'Claude Opus 4.5'
};

export const GEMINI_MODELS: Record<string, string> = {
	'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
	'gemini-3-flash-preview': 'Gemini 3 Flash Preview'
};

export const DEFAULT_SETTINGS: SummaryPluginSettings = {
	cliProvider: 'claude',
	model: 'claude-sonnet-4-5'
};

export function getModelsForCli(cli: CliProvider): Record<string, string> {
	return cli === 'claude' ? CLAUDE_MODELS : GEMINI_MODELS;
}

export function getDefaultModelForCli(cli: CliProvider): string {
	return cli === 'claude' ? 'claude-sonnet-4-5' : 'gemini-3-pro-preview';
}

export class SummarySettingTab extends PluginSettingTab {
	plugin: SummaryPlugin;

	constructor(app: App, plugin: SummaryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		let modelDropdown: DropdownComponent;

		new Setting(containerEl)
			.setName('CLI Provider')
			.setDesc('Choose which AI CLI to use.')
			.addDropdown(dropdown => dropdown
				.addOptions(AVAILABLE_CLIS)
				.setValue(this.plugin.settings.cliProvider)
				.onChange(async (value: CliProvider) => {
					this.plugin.settings.cliProvider = value;
					this.plugin.settings.model = getDefaultModelForCli(value);
					await this.plugin.saveSettings();
					// Refresh model dropdown
					this.display();
				}));

		new Setting(containerEl)
			.setName('Model')
			.setDesc('The model to use.')
			.addDropdown(dropdown => {
				modelDropdown = dropdown;
				const models = getModelsForCli(this.plugin.settings.cliProvider);
				dropdown
					.addOptions(models)
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
