/**
 * Tabber VS Code Extension Deployment Configuration
 * 
 * This file contains the default configuration for the deployment script.
 * Command-line arguments will override these settings.
 */

module.exports = {
	// Default output directory for the packaged extension
	outputDir: './dist',
	
	// Extension configuration
	extension: {
		// Minimum VS Code version required
		minVSCodeVersion: '^1.60.0',
		
		// Categories for the extension in the marketplace
		categories: ['Formatters', 'Other']
	},
	
	// Validation settings
	validation: {
		// Files that must exist before packaging
		requiredFiles: [
			'package.json',
			'README.md',
			'CHANGELOG.md',
			'./src/extension.ts'
		],
		
		// Run these commands during validation
		commands: {
			lint: 'npm run lint',
			test: 'npm test',
			compile: 'npm run compile'
		}
	},
	
	// Marketplace publishing configuration
	marketplace: {
		// URL for the VS Code marketplace
		url: 'https://marketplace.visualstudio.com/vscode',
		
		// Default PAT environment variable name (can be overridden with --token)
		patEnvVar: 'VSCE_PAT'
	}
};