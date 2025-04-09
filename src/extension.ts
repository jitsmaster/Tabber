import * as vscode from 'vscode';
import { TabberService } from './services/tabber-service';
import { ConfigurationService } from './services/configuration-service';

/**
 * Activate the extension
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext): void {
	// Create services
	const configService = new ConfigurationService();
	const tabberService = new TabberService(configService);
	
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
		})
	];
	
	// Register disposables
	context.subscriptions.push(
		...commands,
		configService,
		tabberService
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