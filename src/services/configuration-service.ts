import * as vscode from 'vscode';

/**
 * Service for handling the extension configuration
 */
export class ConfigurationService {
	private configuration!: vscode.WorkspaceConfiguration;
	private configChangeListener!: vscode.Disposable;
	
	// Cached configuration values
	private _tabSize!: number;
	private _formatOnSave!: boolean;
	private _excludedLanguages!: string[];
	private _includeLanguagesOnly!: string[];
	private _respectVSCodeSettings!: boolean;
	private _preserveIndentationInEmptyLines!: boolean;
	private _analyzeOnOpen!: boolean;

	/**
	 * Create a new configuration service
	 */
	constructor() {
		// Initialize default configuration
		this.loadConfiguration();
		
		// Subscribe to configuration changes
		this.configChangeListener = vscode.workspace.onDidChangeConfiguration(
			this.handleConfigChange.bind(this)
		);
	}

	/**
	 * Load the extension configuration
	 */
	private loadConfiguration(): void {
		// Load global configuration
		this.configuration = vscode.workspace.getConfiguration('tabber');
		
		// Cache common settings
		this._tabSize = this.configuration.get<number>('tabSize') || 4;
		this._formatOnSave = this.configuration.get<boolean>('formatOnSave') || false;
		this._excludedLanguages = this.configuration.get<string[]>('excludedLanguages') || [];
		this._includeLanguagesOnly = this.configuration.get<string[]>('includeLanguagesOnly') || [];
		this._respectVSCodeSettings = this.configuration.get<boolean>('respectVSCodeSettings') || true;
		this._preserveIndentationInEmptyLines = this.configuration.get<boolean>('preserveIndentationInEmptyLines') || true;
		this._analyzeOnOpen = this.configuration.get<boolean>('analyzeOnOpen') || false;
	}

	/**
	 * Handle configuration changes
	 * @param event Configuration change event
	 */
	private handleConfigChange(event: vscode.ConfigurationChangeEvent): void {
		// Reload configuration if our settings changed
		if (event.affectsConfiguration('tabber')) {
			this.loadConfiguration();
		}
	}

	/**
	 * Get the effective tab size for a document
	 * @param document The document to get tab size for
	 * @returns The effective tab size
	 */
	public getEffectiveTabSize(document: vscode.TextDocument): number {
		if (this._respectVSCodeSettings) {
			// Try to get language-specific tab size
			const languageConfig = vscode.workspace.getConfiguration(`[${document.languageId}]`);
			const editorConfig = languageConfig.get<{ tabSize?: number }>('editor');
			
			if (editorConfig && editorConfig.tabSize !== undefined) {
				return editorConfig.tabSize;
			}
			
			// Fall back to editor tab size
			const editorTabSize = vscode.workspace.getConfiguration('editor').get<number>('tabSize');
			if (editorTabSize !== undefined) {
				return editorTabSize;
			}
		}
		
		// Fall back to our configured tab size
		return this._tabSize;
	}

	/**
	 * Check if a file should be processed based on its language
	 * @param document The document to check
	 * @param respectInsertSpacesSetting If true, respects VS Code's insertSpaces setting
	 * @returns True if the file should be processed
	 */
	public shouldProcessFile(document: vscode.TextDocument, respectInsertSpacesSetting = true): boolean {
		const languageId = document.languageId;
		
		// Check exclusion list
		if (this._excludedLanguages.includes(languageId)) {
			return false;
		}
		
		// Check inclusion list
		if (this._includeLanguagesOnly.length > 0) {
			return this._includeLanguagesOnly.includes(languageId);
		}
		
		// Check VS Code settings for this language (only if requested)
		if (respectInsertSpacesSetting && this._respectVSCodeSettings) {
			const languageConfig = vscode.workspace.getConfiguration(`[${languageId}]`);
			const editorConfig = languageConfig.get<{ insertSpaces?: boolean }>('editor');
			
			if (editorConfig && editorConfig.insertSpaces === true) {
				// Language explicitly configured to use spaces
				return false;
			}
		}
		
		return true;
	}

	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		if (this.configChangeListener) {
			this.configChangeListener.dispose();
		}
	}

	// Getters for configuration values
	get tabSize(): number {
		return this._tabSize;
	}

	get formatOnSave(): boolean {
		return this._formatOnSave;
	}

	get excludedLanguages(): string[] {
		return this._excludedLanguages;
	}

	get includeLanguagesOnly(): string[] {
		return this._includeLanguagesOnly;
	}

	get respectVSCodeSettings(): boolean {
		return this._respectVSCodeSettings;
	}

	get preserveIndentationInEmptyLines(): boolean {
		return this._preserveIndentationInEmptyLines;
	}

	get analyzeOnOpen(): boolean {
		return this._analyzeOnOpen;
	}
}