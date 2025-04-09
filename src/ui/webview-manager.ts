import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationService } from '../services/configuration-service';
import { TabberService } from '../services/tabber-service';
import { IndentationAnalysisResult } from '../processors/indentation-analyzer';

/**
 * Manages the webview panel for the Tabber extension
 */
export class WebviewManager {
	private panel: vscode.WebviewPanel | undefined;
	private context: vscode.ExtensionContext;
	private configService: ConfigurationService;
	private tabberService: TabberService;
	private disposables: vscode.Disposable[] = [];

	constructor(
		context: vscode.ExtensionContext,
		configService: ConfigurationService,
		tabberService: TabberService
	) {
		this.context = context;
		this.configService = configService;
		this.tabberService = tabberService;
	}

	/**
	 * Creates or shows the webview panel
	 * @returns The webview panel
	 */
	public getOrCreatePanel(): vscode.WebviewPanel {
		if (this.panel) {
			// If panel already exists, show it
			this.panel.reveal(vscode.ViewColumn.One);
			return this.panel;
		}

		// Create a new panel
		this.panel = vscode.window.createWebviewPanel(
			'tabberAnalysisPanel',
			'Tabber: Indentation Analysis',
			vscode.ViewColumn.One,
			{
				// Enable JavaScript in the webview
				enableScripts: true,
				// Restrict the webview to only load resources from the extension's directory
				localResourceRoots: [
					vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
				],
				// Retain context when hidden
				retainContextWhenHidden: true
			}
		);

		// Handle panel disposal
		this.panel.onDidDispose(() => {
			this.panel = undefined;
			
			// Dispose all disposables related to this panel
			while (this.disposables.length) {
				const disposable = this.disposables.pop();
				if (disposable) {
					disposable.dispose();
				}
			}
		}, null, this.disposables);

		// Set webview content
		this.panel.webview.html = this.getWebviewContent();

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this));

		return this.panel;
	}

	/**
	 * Posts a message to the webview
	 * @param message The message to post
	 */
	public postMessage(message: any): void {
		if (this.panel) {
			this.panel.webview.postMessage(message);
		}
	}

	/**
	 * Calculates overall workspace indentation statistics
	 * @param analysisResults The analysis results from all files
	 * @returns Workspace indentation statistics
	 */
	private calculateWorkspaceStats(analysisResults: any): any {
		const stats = {
			totalFiles: analysisResults.files.length,
			filesWithSpaces: 0,
			filesWithTabs: 0,
			filesWithMixed: 0,
			totalLinesAnalyzed: 0,
			spaceIndentedLines: 0,
			tabIndentedLines: 0,
			mixedIndentationLines: 0
		};

		// Calculate stats from all files
		for (const fileResult of analysisResults.files) {
			const fileStats = fileResult.analysis.indentationStats;
			
			// Count file types
			if (fileStats.spaceIndentedLines > 0) {
				stats.filesWithSpaces++;
			}
			if (fileStats.tabIndentedLines > 0) {
				stats.filesWithTabs++;
			}
			if (fileStats.mixedIndentationLines > 0) {
				stats.filesWithMixed++;
			}
			
			// Sum up lines
			stats.totalLinesAnalyzed += fileStats.totalLines;
			stats.spaceIndentedLines += fileStats.spaceIndentedLines;
			stats.tabIndentedLines += fileStats.tabIndentedLines;
			stats.mixedIndentationLines += fileStats.mixedIndentationLines;
		}
		
		return stats;
	}

	/**
	 * Updates the indentation analysis results in the webview
	 * @param results The analysis results
	 */
	public updateAnalysisResults(analysisResults: any): void {
		// Format the results data for the webview
		const formattedResults = {
			files: analysisResults.files.map((fileResult: any) => {
				const issues = [];
				const stats = fileResult.analysis.indentationStats;
				
				// Include space indented lines as issues
				if (stats.spaceIndentedLines > 0) {
					for (const line of fileResult.analysis.spaceIndentedLineNumbers) {
						issues.push({
							lineNumber: line,
							message: 'Line uses space indentation'
						});
					}
				}
				
				// Include mixed indentation lines as issues
				if (stats.mixedIndentationLines > 0) {
					for (const line of fileResult.analysis.mixedIndentationLineNumbers) {
						issues.push({
							lineNumber: line,
							message: 'Line uses mixed indentation (tabs and spaces)'
						});
					}
				}
				
				return {
					path: fileResult.path,
					filename: fileResult.filename || path.basename(fileResult.path),
					issues: issues
				};
			})
		};
		
		// Calculate overall statistics for the workspace
		const workspaceStats = this.calculateWorkspaceStats(analysisResults);
		
		this.postMessage({
			command: 'updateAnalysisResults',
			results: formattedResults,
			stats: workspaceStats
		});
	}

	/**
	 * Handles messages from the webview
	 * @param message The message from the webview
	 */
	private handleWebviewMessage(message: any): void {
		switch (message.command) {
			case 'analyzeWorkspace':
				this.analyzeWorkspace();
				break;
			case 'fixAll':
				this.fixAll(message.filePaths);
				break;
			case 'fixFile':
				this.fixFile(message.filePath);
				break;
			case 'openFile':
				this.openFile(message.filePath, message.lineNumber);
				break;
		}
	}

	/**
	 * Analyzes the workspace for indentation issues
	 */
	public async analyzeWorkspace(): Promise<void> {
		try {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Analyzing workspace indentation...",
				cancellable: true
			}, async (progress, token) => {
				// Define analysis result type
				interface FileAnalysisResult {
					path: string;
					analysis: IndentationAnalysisResult;
					filename: string | undefined;
				}

				interface WorkspaceAnalysisResult {
					files: FileAnalysisResult[];
				}

				// Get all text documents in the workspace
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders) {
					vscode.window.showErrorMessage('No workspace folder is open');
					return;
				}

				progress.report({ increment: 0 });

				// Find all files in workspace and analyze them
				const fileUris = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**');
				const results: WorkspaceAnalysisResult = { files: [] };
				
				let processedFiles = 0;
				for (const uri of fileUris) {
					if (token.isCancellationRequested) {
						break;
					}
					
					try {
						const document = await vscode.workspace.openTextDocument(uri);
						
						// Check if this file should be processed
						if (this.configService.shouldProcessFile(document)) {
							const analysis = this.tabberService.analyzer.analyze(document);
							
							// Only include files with space indentation or mixed indentation
							if (analysis.indentationStats.spaceIndentedLines > 0 ||
								analysis.indentationStats.mixedIndentationLines > 0) {
								results.files.push({
									path: uri.fsPath,
									analysis: analysis,
									filename: uri.fsPath.split(/[/\\]/).pop()
								});
							}
						}
					} catch (error) {
						console.error(`Error analyzing file ${uri.fsPath}:`, error);
					}
					
					processedFiles++;
					progress.report({
						increment: (100 * processedFiles / fileUris.length),
						message: `Analyzed ${processedFiles} of ${fileUris.length} files`
					});
				}
				
				progress.report({ increment: 100 });
				
				// Send results to webview
				this.updateAnalysisResults(results);
				
				return results;
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to analyze workspace: ${error}`);
		}
	}

	/**
	 * Fixes indentation for all files
	 * @param filePaths The file paths to fix
	 */
	private async fixAll(filePaths: string[]): Promise<void> {
		try {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Converting spaces to tabs...",
				cancellable: true
			}, async (progress, token) => {
				const totalFiles = filePaths.length;
				let processedFiles = 0;
				let convertedFiles = 0;
				
				for (const filePath of filePaths) {
					if (token.isCancellationRequested) {
						break;
					}
					
					try {
						const uri = vscode.Uri.file(filePath);
						const document = await vscode.workspace.openTextDocument(uri);
						
						// Generate edits
						const edits = await this.tabberService.generateConversionEdits(document);
						
						// Apply edits
						if (edits.length > 0) {
							const edit = new vscode.WorkspaceEdit();
							edits.forEach(e => edit.replace(document.uri, e.range, e.newText));
							
							const success = await vscode.workspace.applyEdit(edit);
							if (success) {
								convertedFiles++;
							}
						}
					} catch (err) {
						console.error(`Error processing file ${filePath}:`, err);
					}
					
					processedFiles++;
					progress.report({ 
						increment: (100 / totalFiles),
						message: `Processed ${processedFiles} of ${totalFiles} files`
					});
				}
				
				vscode.window.showInformationMessage(
					`Tabber: Converted indentation in ${convertedFiles} of ${totalFiles} files`
				);
				
				// Update analysis results after fixing
				this.analyzeWorkspace();
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to fix indentation: ${error}`);
		}
	}

	/**
	 * Fixes indentation for a single file
	 * @param filePath The file path to fix
	 */
	private async fixFile(filePath: string): Promise<void> {
		try {
			const uri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			
			// Generate edits
			const edits = await this.tabberService.generateConversionEdits(document);
			
			// Apply edits
			if (edits.length > 0) {
				const edit = new vscode.WorkspaceEdit();
				edits.forEach(e => edit.replace(document.uri, e.range, e.newText));
				
				const success = await vscode.workspace.applyEdit(edit);
				if (success) {
					vscode.window.showInformationMessage(
						`Tabber: Converted ${edits.length} lines in ${path.basename(filePath)}`
					);
				} else {
					vscode.window.showErrorMessage(`Failed to apply edits to ${path.basename(filePath)}`);
				}
			} else {
				vscode.window.showInformationMessage(
					`Tabber: No changes needed in ${path.basename(filePath)}`
				);
			}
			
			// Update analysis results after fixing
			this.analyzeWorkspace();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to fix file: ${error}`);
		}
	}

	/**
	 * Opens a file at the specified line
	 * @param filePath The file path to open
	 * @param lineNumber The line number to reveal
	 */
	private async openFile(filePath: string, lineNumber: number): Promise<void> {
		try {
			const uri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(document);
			
			// Move to the specified line
			if (lineNumber >= 0) {
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					const position = new vscode.Position(lineNumber, 0);
					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(
						new vscode.Range(position, position),
						vscode.TextEditorRevealType.InCenter
					);
				}
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open file: ${error}`);
		}
	}

	/**
	 * Gets the HTML content for the webview
	 * @returns The HTML content
	 */
	private getWebviewContent(): string {
		// Get the local paths to the resources
		const mediaPath = path.join(this.context.extensionPath, 'media');
		const scriptPath = vscode.Uri.file(path.join(mediaPath, 'main.js'));
		const scriptUri = this.panel?.webview.asWebviewUri(scriptPath);

		// Get the CSS file for the webview
		const stylePath = vscode.Uri.file(path.join(mediaPath, 'styles.css'));
		const styleUri = this.panel?.webview.asWebviewUri(stylePath);
		
		// For script security
		// No nonce needed as we're using webview.cspSource

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this.panel?.webview.cspSource} https:; style-src ${this.panel?.webview.cspSource}; script-src ${this.panel?.webview.cspSource};">
			<title>Tabber: Indentation Analysis</title>
			<link rel="stylesheet" type="text/css" href="${styleUri}">
		</head>
		<body>
			<div id="root"></div>
			<script src="${scriptUri}"></script>
		</body>
		</html>`;
	}


	/**
	 * Disposes the webview manager
	 */
	public dispose(): void {
		if (this.panel) {
			this.panel.dispose();
		}
		
		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}