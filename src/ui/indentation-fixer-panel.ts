import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationService } from '../services/configuration-service';
import { TabberService } from '../services/tabber-service';
import { fixSingleFile, fixAllFiles } from '../processors/indentation-fixer';
import { getNonce } from '../utils/webview-utils';

/**
 * Interface representing an indentation issue
 */
interface IndentationIssue {
	lineNumber: number;
	indentation: number;
	content: string;
}

/**
 * WebView panel for displaying and fixing indentation issues in a file
 */
export class IndentationFixerPanel {
	public static readonly viewType = 'indentationFixerPanel';
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _configService: ConfigurationService;
	private _tabberService: TabberService;
	private _currentFilePath: string = '';
	private _issues: IndentationIssue[] = [];

	/**
	 * Create a new indentation fixer panel
	 */
	constructor(
		context: vscode.ExtensionContext,
		configService: ConfigurationService,
		tabberService: TabberService,
		filePath?: string
	) {
		this._extensionUri = context.extensionUri;
		this._configService = configService;
		this._tabberService = tabberService;

		// If filePath is provided, store it
		if (filePath) {
			this._currentFilePath = filePath;
		}

		// Create and configure webview panel
		this._panel = vscode.window.createWebviewPanel(
			IndentationFixerPanel.viewType,
			'Indentation Fixer',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this._extensionUri, 'media')
				],
				retainContextWhenHidden: true
			}
		);

		// Set webview content
		this._panel.webview.html = this._getWebviewContent();

		// Set up event handlers
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.onDidReceiveMessage(
			message => this._handleMessage(message),
			null,
			this._disposables
		);

		// If file path was provided, analyze it immediately
		if (filePath) {
			this._analyzeFile(filePath);
		}
	}

	/**
	 * Reveals the panel to the user
	 */
	public reveal(): void {
		this._panel.reveal();
	}

	/**
	 * Analyze a specific file for indentation issues
	 * @param filePath Path to the file to analyze
	 */
	private async _analyzeFile(filePath: string): Promise<void> {
		try {
			// Show loading indicator
			await this._panel.webview.postMessage({
				command: 'showLoading'
			});

			// Store current file path
			this._currentFilePath = filePath;

			// Read the file
			const uri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();
			const lines = content.split('\n');

			// Find indentation issues
			const issues: IndentationIssue[] = [];
			lines.forEach((line, index) => {
				// Skip empty lines
				if (line.trim() === '') return;
				
				// Extract leading whitespace
				const leadingWhitespace = line.match(/^[ \t]*/)?.[0] || '';
				
				// Check if indentation uses spaces instead of tabs
				if (leadingWhitespace.includes(' ') && !leadingWhitespace.includes('\t')) {
					issues.push({
						lineNumber: index + 1,
						indentation: leadingWhitespace.length,
						content: line.trim().substring(0, 50) + (line.trim().length > 50 ? '...' : '')
					});
				}
			});

			// Store issues
			this._issues = issues;

			// Send issues to webview
			await this._panel.webview.postMessage({
				command: 'showIndentationIssues',
				filePath,
				issues
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Error analyzing file: ${error}`);
			
			// Hide loading indicator
			await this._panel.webview.postMessage({
				command: 'hideLoading'
			});
		}
	}

	/**
	 * Handle messages from the webview
	 */
	private async _handleMessage(message: any): Promise<void> {
		switch (message.command) {
			case 'getIndentationIssues':
				if (this._currentFilePath) {
					await this._analyzeFile(this._currentFilePath);
				}
				break;
			case 'fixFile':
				await this._fixSingleFile(message.filePath);
				break;
			case 'fixAllFiles':
				await this._fixAllFiles();
				break;
			case 'openFile':
				await this._openFile(message.filePath, message.lineNumber);
				break;
		}
	}

	/**
	 * Fix indentation in a single file
	 */
	private async _fixSingleFile(filePath: string): Promise<void> {
		try {
			// Show loading indicator
			await this._panel.webview.postMessage({
				command: 'showLoading'
			});

			// Fix the file
			const result = await fixSingleFile(filePath);

			// Show result
			if (result.success) {
				vscode.window.showInformationMessage(
					`Fixed ${result.linesChanged} lines in ${path.basename(filePath)}, replaced ${result.spacesReplaced} spaces with tabs.`
				);
			} else {
				vscode.window.showErrorMessage(`Failed to fix file: ${result.error}`);
			}

			// Re-analyze the file to update the UI
			await this._analyzeFile(filePath);
		} catch (error) {
			vscode.window.showErrorMessage(`Error fixing file: ${error}`);
			
			// Hide loading indicator
			await this._panel.webview.postMessage({
				command: 'hideLoading'
			});
		}
	}

	/**
	 * Fix indentation in all files
	 */
	private async _fixAllFiles(): Promise<void> {
		try {
			// Confirm with user
			const response = await vscode.window.showWarningMessage(
				'Are you sure you want to fix indentation in all files?',
				{ modal: true },
				'Yes',
				'No'
			);

			if (response !== 'Yes') {
				return;
			}

			// Show loading indicator
			await this._panel.webview.postMessage({
				command: 'showLoading'
			});

			// Find all text files in workspace
			const files = await vscode.workspace.findFiles(
				'**/*.{js,ts,jsx,tsx,html,css,json,md}',
				'**/node_modules/**'
			);

			// Convert URIs to file paths
			const filePaths = files.map(fileUri => fileUri.fsPath);

			// Fix all files
			const summary = await fixAllFiles(filePaths);

			// Show summary
			vscode.window.showInformationMessage(
				`Fixed ${summary.totalLinesChanged} lines in ${summary.totalFilesFixed} files.`
			);

			// Re-analyze the current file if there is one
			if (this._currentFilePath) {
				await this._analyzeFile(this._currentFilePath);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error fixing files: ${error}`);
			
			// Hide loading indicator
			await this._panel.webview.postMessage({
				command: 'hideLoading'
			});
		}
	}

	/**
	 * Open a file at a specific line
	 */
	private async _openFile(filePath: string, lineNumber: number): Promise<void> {
		try {
			const uri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			
			// Adjust line number (webview uses 1-based, vscode uses 0-based)
			const adjustedLineNumber = Math.max(0, lineNumber - 1);
			
			// Open document and position cursor at line
			await vscode.window.showTextDocument(document, {
				selection: new vscode.Selection(
					adjustedLineNumber, 0,
					adjustedLineNumber, 0
				)
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Error opening file: ${error}`);
		}
	}

	/**
	 * Get webview HTML content
	 */
	private _getWebviewContent(): string {
		// Create URIs for scripts and styles
		const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'indentation-fixer-panel.html');
		const htmlUri = this._panel.webview.asWebviewUri(htmlPath);
		
		// Generate nonce for script security
		const nonce = getNonce();

		// Return HTML content that loads the HTML file
		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this._panel.webview.cspSource} https:; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>
				<iframe src="${htmlUri}" style="border: none; width: 100%; height: 100vh;" sandbox="allow-scripts allow-same-origin"></iframe>
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					window.addEventListener('message', event => {
						const iframe = document.querySelector('iframe');
						if (iframe && iframe.contentWindow) {
							iframe.contentWindow.postMessage(event.data, '*');
						}
					});
					window.addEventListener('message', event => {
						if (event.source === document.querySelector('iframe').contentWindow) {
							vscode.postMessage(event.data);
						}
					});
				</script>
			</body>
			</html>
		`;
	}

	/**
	 * Cleanup when panel is closed
	 */
	public dispose(): void {
		// Clean up resources
		this._panel.dispose();
		
		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	/**
	 * Event listener for panel disposal
	 */
	public onDidDispose(callback: () => void): vscode.Disposable {
		return this._panel.onDidDispose(callback);
	}
}