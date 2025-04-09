import * as vscode from 'vscode';
import { ConfigurationService } from '../services/configuration-service';
import { TabberService } from '../services/tabber-service';
import { getNonce } from '../utils/webview-utils';

/**
 * WebView panel for displaying and fixing indentation issues
 */
export class TabberWebviewPanel {
	public static readonly viewType = 'tabberAnalysisPanel';
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _configService: ConfigurationService;
	private _tabberService: TabberService;

	/**
	 * Create a new webview panel
	 */
	constructor(
		context: vscode.ExtensionContext,
		configService: ConfigurationService,
		tabberService: TabberService
	) {
		this._extensionUri = context.extensionUri;
		this._configService = configService;
		this._tabberService = tabberService;

		// Create and configure webview panel
		this._panel = vscode.window.createWebviewPanel(
			TabberWebviewPanel.viewType,
			'Tabber Analysis',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this._extensionUri, 'media'),
					vscode.Uri.joinPath(this._extensionUri, 'out')
				],
				retainContextWhenHidden: true
			}
		);

		// Set webview content
		this._panel.webview.html = this._getWebviewContent(this._panel.webview);

		// Set up event handlers
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.onDidReceiveMessage(
			message => this._handleMessage(message),
			null,
			this._disposables
		);
	}

	/**
	 * Reveals the panel to the user
	 */
	public reveal(): void {
		this._panel.reveal();
	}

	/**
	 * Show indentation analysis results in the webview
	 */
	public async showIndentationResults(results: any): Promise<void> {
		await this._panel.webview.postMessage({
			command: 'showResults',
			results
		});
	}

	/**
	 * Handle messages from the webview
	 */
	private async _handleMessage(message: any): Promise<void> {
		switch (message.command) {
			case 'analyzeWorkspace':
				await this._analyzeWorkspace();
				break;
			case 'fixAll':
				await this._fixAllFiles(message.files);
				break;
			case 'fixFile':
				await this._fixSingleFile(message.file);
				break;
			case 'openFile':
				await this._openFile(message.file, message.lineNumber);
				break;
		}
	}

	/**
	 * Analyze workspace for indentation issues
	 */
	private async _analyzeWorkspace(): Promise<void> {
		try {
			// Show progress indicator
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Analyzing workspace indentation...",
					cancellable: true
				},
				async (progress) => {
					// Find all text files in workspace
					const files = await vscode.workspace.findFiles(
						'**/*.{js,ts,jsx,tsx,html,css,json,md}',
						'**/node_modules/**'
					);

					const results: any[] = [];
					let filesAnalyzed = 0;

					// Process files in batches
					for (const fileUri of files) {
						try {
							filesAnalyzed++;
							progress.report({
								message: `Analyzing file ${filesAnalyzed} of ${files.length}`,
								increment: (1 / files.length) * 100
							});

							// Skip files that shouldn't be processed
							const document = await vscode.workspace.openTextDocument(fileUri);
							if (!this._configService.shouldProcessFile(document)) {
								continue;
							}

							// Analyze indentation
							const analysisResult = this._tabberService.analyzer.analyze(document);
							
							// Only include files with space indentation or mixed indentation
							if (analysisResult.indentationStats.spaceIndentedLines > 0 || 
								analysisResult.indentationStats.mixedIndentationLines > 0) {
								results.push({
									fileUri: fileUri.toString(),
									fileName: fileUri.path.split('/').pop(),
									filePath: vscode.workspace.asRelativePath(fileUri),
									analysisResult
								});
							}
						} catch (error) {
							console.error(`Error analyzing file ${fileUri.toString()}:`, error);
						}
					}

					// Send results to webview
					await this.showIndentationResults(results);
				}
			);
		} catch (error) {
			vscode.window.showErrorMessage(`Error analyzing workspace: ${error}`);
		}
	}

	/**
	 * Fix indentation in multiple files
	 */
	private async _fixAllFiles(files: string[]): Promise<void> {
		// Confirm with user
		const response = await vscode.window.showWarningMessage(
			`Are you sure you want to convert spaces to tabs in ${files.length} files?`,
			{ modal: true },
			'Yes',
			'No'
		);

		if (response !== 'Yes') {
			return;
		}

		// Show progress indicator
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Converting spaces to tabs...",
				cancellable: true
			},
			async (progress) => {
				let filesProcessed = 0;
				let totalLinesChanged = 0;
				let totalSpacesReplaced = 0;

				for (const fileUriString of files) {
					try {
						filesProcessed++;
						progress.report({
							message: `Processing file ${filesProcessed} of ${files.length}`,
							increment: (1 / files.length) * 100
						});

						const fileUri = vscode.Uri.parse(fileUriString);
						const document = await vscode.workspace.openTextDocument(fileUri);
						
						// Convert spaces to tabs
						const edits = await this._tabberService.generateConversionEdits(document);
						
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
								
								totalLinesChanged += edits.length;
								totalSpacesReplaced += spacesReplaced;
							}
						}
					} catch (error) {
						console.error(`Error processing file: ${error}`);
					}
				}

				// Save all documents
				await vscode.workspace.saveAll();

				// Show summary
				vscode.window.showInformationMessage(
					`Tabber: Converted ${totalLinesChanged} lines across ${filesProcessed} files, ` +
					`replaced ${totalSpacesReplaced} spaces with tabs`
				);

				// Re-analyze workspace to update results
				await this._analyzeWorkspace();
			}
		);
	}

	/**
	 * Fix indentation in a single file
	 */
	private async _fixSingleFile(fileUriString: string): Promise<void> {
		try {
			const fileUri = vscode.Uri.parse(fileUriString);
			const document = await vscode.workspace.openTextDocument(fileUri);
			
			// Convert spaces to tabs
			const edits = await this._tabberService.generateConversionEdits(document);
			
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
					
					// Save document
					await document.save();
					
					vscode.window.showInformationMessage(
						`Tabber: Converted ${edits.length} lines, ` +
						`replaced ${spacesReplaced} spaces with tabs`
					);

					// Re-analyze workspace to update results
					await this._analyzeWorkspace();
				}
			} else {
				vscode.window.showInformationMessage('Tabber: No spaces to convert in this file');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error fixing file: ${error}`);
		}
	}

	/**
	 * Open a file at a specific line
	 */
	private async _openFile(fileUriString: string, lineNumber: number): Promise<void> {
		try {
			const fileUri = vscode.Uri.parse(fileUriString);
			const document = await vscode.workspace.openTextDocument(fileUri);
			
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
	private _getWebviewContent(webview: vscode.Webview): string {
		// Create URIs for scripts and styles
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js')
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.css')
		);
		const codiconsUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
		);

		// Generate nonce for script security
		const nonce = getNonce();

		// Return HTML content
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
	<link href="${styleUri}" rel="stylesheet">
	<link href="${codiconsUri}" rel="stylesheet">
	<title>Tabber Analysis</title>
</head>
<body>
	<div id="app">
		<header class="header">
			<h1>Tabber Indentation Analysis</h1>
			<div class="actions">
				<button id="analyze-btn" class="button primary">
					<span class="codicon codicon-search"></span>
					Analyze Workspace
				</button>
				<button id="fix-all-btn" class="button" disabled>
					<span class="codicon codicon-wand"></span>
					Fix All
				</button>
			</div>
		</header>
		<div class="content">
			<div id="loading" class="loading hidden">
				<div class="loader"></div>
				<span>Analyzing workspace...</span>
			</div>
			<div id="results" class="results hidden">
				<div class="results-header">
					<div class="results-summary">
						<span id="file-count">0</span> files with indentation issues
					</div>
					<div class="results-filter">
						<input type="text" id="filter-input" placeholder="Filter files...">
					</div>
				</div>
				<div id="file-list" class="file-list"></div>
			</div>
			<div id="empty-state" class="empty-state">
				<div class="empty-state-icon">
					<span class="codicon codicon-search"></span>
				</div>
				<h2>No indentation issues found</h2>
				<p>Click "Analyze Workspace" to scan for space indentation issues</p>
			</div>
		</div>
		<div id="confirmation-dialog" class="dialog hidden">
			<div class="dialog-content">
				<h2>Confirm Conversion</h2>
				<p id="confirmation-message">Are you sure you want to convert spaces to tabs in all files?</p>
				<div class="dialog-actions">
					<button id="cancel-btn" class="button">Cancel</button>
					<button id="confirm-btn" class="button primary">Convert</button>
				</div>
			</div>
		</div>
	</div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
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