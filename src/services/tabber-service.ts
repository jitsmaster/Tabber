import * as vscode from 'vscode';
import { IndentationAnalyzer, IndentationAnalysisResult } from '../processors/indentation-analyzer';
import { SpaceToTabConverter, ConversionOptions } from '../processors/space-to-tab-converter';
import { ContentPreserver } from '../processors/content-preserver';
import { ConfigurationService } from './configuration-service';

/**
 * Main service for the Tabber extension
 */
export class TabberService {
	public analyzer: IndentationAnalyzer;
	private configService: ConfigurationService;
	private statusBarItem: vscode.StatusBarItem;

	/**
	 * Create a new Tabber service
	 * @param configService The configuration service
	 */
	constructor(configService: ConfigurationService) {
		this.configService = configService;
		this.analyzer = new IndentationAnalyzer();
		
		// Create status bar item
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		
		this.statusBarItem.command = 'tabber.analyzeIndentation';
		this.statusBarItem.tooltip = 'Analyze document indentation';
		
		// Initialize extension
		this.registerEventListeners();
	}

	/**
	 * Register event listeners
	 */
	private registerEventListeners(): void {
		// Update status bar when active editor changes
		vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
			this.updateStatusBar(editor);
		});
		
		// Update status bar when document is saved
		vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
			if (document === vscode.window.activeTextEditor?.document) {
				this.updateStatusBar(vscode.window.activeTextEditor);
			}
		});
		
		// Handle format on save
		vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
			if (this.configService.formatOnSave) {
				const document = event.document;
				
				if (this.configService.shouldProcessFile(document)) {
					event.waitUntil(this.generateConversionEdits(document));
				}
			}
		});
		
		// Handle document open
		vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
			if (this.configService.analyzeOnOpen &&
				vscode.window.activeTextEditor?.document === document) {
				this.analyzeIndentation(document);
			}
		});
		
		// Initial status bar update
		this.updateStatusBar(vscode.window.activeTextEditor);
	}

	/**
	 * Update the status bar with indentation information
	 * @param editor The active text editor
	 */
	private updateStatusBar(editor: vscode.TextEditor | undefined): void {
		if (!editor) {
			this.statusBarItem.hide();
			return;
		}
		
		const document = editor.document;
		
		// Analyze indentation
		try {
			const result = this.analyzer.analyze(document);
			
			if (result.hasTabs) {
				this.statusBarItem.text = '$(list-ordered) Tabs';
				this.statusBarItem.backgroundColor = undefined;
			} else if (result.dominantSpaceLevel) {
				this.statusBarItem.text = `$(list-ordered) ${result.dominantSpaceLevel} Spaces`;
				this.statusBarItem.backgroundColor = undefined;
			} else {
				this.statusBarItem.text = '$(list-ordered) No Indentation';
				this.statusBarItem.backgroundColor = undefined;
			}
			
			if (result.mixedIndentationLines.length > 0) {
				this.statusBarItem.text += ' (Mixed)';
				this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
			}
			
			this.statusBarItem.show();
		} catch (error) {
			this.statusBarItem.hide();
			console.error('Error updating status bar:', error);
		}
	}

	/**
	 * Convert spaces to tabs in the active document
	 */
	public async convertSpacesToTabs(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('Tabber: No active editor');
			return;
		}
		
		const document = editor.document;
		
		// Check if file should be processed
		if (!this.configService.shouldProcessFile(document)) {
			vscode.window.showInformationMessage(
				`Tabber: Skipping file due to excluded language (${document.languageId})`
			);
			return;
		}
		
		try {
			// Generate edits
			const edits = await this.generateConversionEdits(document);
			
			// Apply edits
			if (edits.length > 0) {
				const edit = new vscode.WorkspaceEdit();
				edits.forEach(e => edit.replace(document.uri, e.range, e.newText));
				
				const success = await vscode.workspace.applyEdit(edit);
				
				if (success) {
					// Calculate stats
					let spacesReplaced = 0;
					for (const textEdit of edits) {
						const originalText = document.getText(textEdit.range);
						spacesReplaced += (originalText.match(/ /g) || []).length - 
											(textEdit.newText.match(/ /g) || []).length;
					}
					
					vscode.window.showInformationMessage(
						`Tabber: Converted ${edits.length} lines, replaced ${spacesReplaced} spaces with tabs`
					);
				} else {
					vscode.window.showErrorMessage('Tabber: Failed to apply edits');
				}
			} else {
				vscode.window.showInformationMessage('Tabber: No spaces to convert');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Tabber: Error converting spaces to tabs: ${error}`);
			console.error('Error converting spaces to tabs:', error);
		}
	}

	/**
	 * Format the document and convert spaces to tabs
	 */
	public async formatAndConvert(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('Tabber: No active editor');
			return;
		}
		
		// Format document first
		try {
			await vscode.commands.executeCommand('editor.action.formatDocument');
			await this.convertSpacesToTabs();
		} catch (error) {
			vscode.window.showErrorMessage(`Tabber: Error formatting document: ${error}`);
			console.error('Error formatting document:', error);
		}
	}

	/**
	 * Analyze and display indentation information
	 * @param document The document to analyze
	 */
	public async analyzeIndentation(document?: vscode.TextDocument): Promise<void> {
		const doc = document || vscode.window.activeTextEditor?.document;
		if (!doc) {
			vscode.window.showInformationMessage('Tabber: No active document');
			return;
		}
		
		try {
			const result = this.analyzer.analyze(doc);
			
			// Create a message with indentation stats
			const message = this.createIndentationSummary(result);
			
			// Show the message
			const selection = await vscode.window.showInformationMessage(
				message,
				'Convert to Tabs',
				'Details'
			);
			
			if (selection === 'Convert to Tabs') {
				await this.convertSpacesToTabs();
			} else if (selection === 'Details') {
				this.showIndentationDetails(result);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Tabber: Error analyzing indentation: ${error}`);
			console.error('Error analyzing indentation:', error);
		}
	}

	/**
	 * Generate edits for converting spaces to tabs
	 * @param document The document to convert
	 * @public Used by the webview UI
	 * @returns Array of text edits
	 */
	public async generateConversionEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
		// Get tab size from configuration
		const tabSize = this.configService.getEffectiveTabSize(document);
		
		// Create converter
		const options: ConversionOptions = {
			preserveIndentationInEmptyLines: this.configService.preserveIndentationInEmptyLines,
			onlyLeadingSpaces: true
		};
		
		const converter = new SpaceToTabConverter(tabSize, options);
		
		// Create content preserver
		const preserver = new ContentPreserver();
		preserver.captureRegions(document);
		
		// Convert document
		const result = converter.convert(document);
		
		return result.edits;
	}

	/**
	 * Create a summary of indentation analysis
	 * @param result The analysis result
	 * @returns Summary message
	 */
	private createIndentationSummary(result: IndentationAnalysisResult): string {
		const stats = result.indentationStats;
		
		let message = 'Indentation Analysis: ';
		
		if (stats.tabIndentedLines > 0 && stats.spaceIndentedLines > 0) {
			message += 'Mixed indentation - ';
			message += `${stats.tabIndentedLines} tab-indented lines, `;
			message += `${stats.spaceIndentedLines} space-indented lines`;
		} else if (stats.tabIndentedLines > 0) {
			message += 'Tab indentation';
		} else if (stats.spaceIndentedLines > 0) {
			const spaceLevel = result.dominantSpaceLevel || 'mixed';
			message += `${spaceLevel}-space indentation`;
		} else {
			message += 'No indentation detected';
		}
		
		if (stats.mixedIndentationLines > 0) {
			message += ` (${stats.mixedIndentationLines} lines with mixed indentation)`;
		}
		
		return message;
	}

	/**
	 * Show detailed indentation information
	 * @param result The analysis result
	 */
	private showIndentationDetails(result: IndentationAnalysisResult): void {
		// Create a detail message for output panel
		const stats = result.indentationStats;
		
		// Create and show output channel
		const outputChannel = vscode.window.createOutputChannel('Tabber: Indentation Analysis');
		outputChannel.clear();
		
		outputChannel.appendLine('Tabber: Indentation Analysis');
		outputChannel.appendLine('===============================');
		outputChannel.appendLine(`Total lines: ${stats.totalLines}`);
		outputChannel.appendLine(`Empty lines: ${stats.emptyLines}`);
		outputChannel.appendLine(`Tab-indented lines: ${stats.tabIndentedLines}`);
		outputChannel.appendLine(`Space-indented lines: ${stats.spaceIndentedLines}`);
		outputChannel.appendLine(`Mixed indentation lines: ${stats.mixedIndentationLines}`);
		
		if (stats.spaceIndentedLines > 0) {
			outputChannel.appendLine('\nSpace indentation levels:');
			for (const [level, count] of stats.spaceFrequency.entries()) {
				outputChannel.appendLine(`  ${level} spaces: ${count} lines`);
			}
		}
		
		if (result.mixedIndentationLines.length > 0) {
			outputChannel.appendLine('\nLines with mixed indentation:');
			result.mixedIndentationLines.slice(0, 10).forEach(line => {
				outputChannel.appendLine(`  Line ${line + 1}`);
			});
			
			if (result.mixedIndentationLines.length > 10) {
				outputChannel.appendLine(`  ...and ${result.mixedIndentationLines.length - 10} more`);
			}
		}
		
		// Show the output channel
		outputChannel.show();
	}

	/**
	 * Configure extension settings
	 */
	public async configureSettings(): Promise<void> {
		// Open settings with tabber filter
		await vscode.commands.executeCommand(
			'workbench.action.openSettings',
			'@ext:tabber.tabber'
		);
	}

	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		this.statusBarItem.dispose();
	}
}