import * as vscode from 'vscode';
import { TabberService } from './services/tabber-service';
import { ConfigurationService } from './services/configuration-service';
import { WebviewManager } from './ui/webview-manager';

/**
 * Activate the extension
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext): void {
	// Create services
	const configService = new ConfigurationService();
	const tabberService = new TabberService(configService);
	const webviewManager = new WebviewManager(context, configService, tabberService);
	
	// Register commands
	const commands = [
		vscode.commands.registerCommand('tabber.convertSpacesToTabs', () => {
			tabberService.convertSpacesToTabs();
		}),
		vscode.commands.registerCommand('tabber.formatAndConvert', () => {
			tabberService.formatAndConvert();
		}),
		vscode.commands.registerCommand('tabber.analyzeIndentation', () => {
			tabberService.analyzeIndentation();
		}),
		vscode.commands.registerCommand('tabber.configureSettings', () => {
			tabberService.configureSettings();
		}),
		vscode.commands.registerCommand('tabber.showAnalysisPanel', () => {
			webviewManager.getOrCreatePanel();
			// Trigger initial analysis when panel is opened
			vscode.commands.executeCommand('tabber.analyzeWorkspace');
		}),
		vscode.commands.registerCommand('tabber.analyzeWorkspace', () => {
			// This command will be called from the webview UI
			const panel = webviewManager.getOrCreatePanel();
			panel.title = 'Tabber: Analyzing Workspace...';
			
			// Message will be sent to webview when analysis completes
			webviewManager.analyzeWorkspace();
		})
	];
	
	// Register disposables
	context.subscriptions.push(
		...commands,
		configService,
		tabberService,
		webviewManager
	);
	
	// Log extension activation
	console.log('Extension "tabber" is now active');
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
	// Clean up if needed
}