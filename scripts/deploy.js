#!/usr/bin/env node

/**
 * Tabber VS Code Extension Deployment Script
 * 
 * This script automates the deployment process for the Tabber extension.
 * It can package, validate, install locally, and publish to VS Code Marketplace.
 * 
 * Usage:
 *   node deploy.js [options]
 * 
 * Options:
 *   --help, -h          Show this help
 *   --package, -p       Package the extension only
 *   --install, -i       Package and install locally
 *   --publish, -P       Publish to VS Code Marketplace
 *   --bump TYPE         Bump version (patch|minor|major)
 *   --skip-tests        Skip running tests
 *   --skip-validation   Skip validation checks
 *   --token TOKEN       Marketplace PAT (Personal Access Token)
 * 
 * Examples:
 *   node deploy.js --package
 *   node deploy.js --install
 *   node deploy.js --publish --token YOUR_PAT
 *   node deploy.js --publish --bump patch --token YOUR_PAT
 * 
 * Requirements:
 *   - Node.js 14+
 *   - vsce (VS Code Extension Manager): npm install -g vsce
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const readline = require('readline');

// Configuration
const config = require('./deploy.config');
const DEFAULT_CONFIG = {
	skipTests: false,
	skipValidation: false,
	bumpVersion: null,
	token: null,
	packageOnly: false,
	installLocally: false,
	publish: false
};

// Parse command line arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const options = { ...DEFAULT_CONFIG };
	
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		
		switch (arg) {
			case '--help':
			case '-h':
				showHelp();
				process.exit(0);
				break;
			case '--package':
			case '-p':
				options.packageOnly = true;
				break;
			case '--install':
			case '-i':
				options.installLocally = true;
				break;
			case '--publish':
			case '-P':
				options.publish = true;
				break;
			case '--bump':
				if (i + 1 < args.length && ['patch', 'minor', 'major'].includes(args[i + 1])) {
					options.bumpVersion = args[i + 1];
					i++;
				} else {
					console.error('Error: --bump requires a valid version type (patch|minor|major)');
					process.exit(1);
				}
				break;
			case '--skip-tests':
				options.skipTests = true;
				break;
			case '--skip-validation':
				options.skipValidation = true;
				break;
			case '--token':
				if (i + 1 < args.length) {
					options.token = args[i + 1];
					i++;
				} else {
					console.error('Error: --token requires a value');
					process.exit(1);
				}
				break;
			default:
				console.error(`Error: Unknown option '${arg}'`);
				showHelp();
				process.exit(1);
		}
	}
	
	// Validation
	if (options.publish && !options.token) {
		console.error('Error: Publishing requires a marketplace token (--token)');
		process.exit(1);
	}
	
	return options;
}

// Show help
function showHelp() {
	const helpText = `
Tabber VS Code Extension Deployment Script

Usage:
  node deploy.js [options]

Options:
  --help, -h          Show this help
  --package, -p       Package the extension only
  --install, -i       Package and install locally
  --publish, -P       Publish to VS Code Marketplace
  --bump TYPE         Bump version (patch|minor|major)
  --skip-tests        Skip running tests
  --skip-validation   Skip validation checks
  --token TOKEN       Marketplace PAT (Personal Access Token)

Examples:
  node deploy.js --package
  node deploy.js --install
  node deploy.js --publish --token YOUR_PAT
  node deploy.js --publish --bump patch --token YOUR_PAT
	`;
	
	console.log(helpText);
}

// Check prerequisites
function checkPrerequisites() {
	console.log('🔍 Checking prerequisites...');
	
	try {
		// Check Node.js version
		const nodeVersion = process.version;
		const versionMatch = /v(\d+)\./.exec(nodeVersion);
		const majorVersion = versionMatch ? parseInt(versionMatch[1]) : 0;
		
		if (majorVersion < 14) {
			console.error(`❌ Node.js 14+ required. Found: ${nodeVersion}`);
			process.exit(1);
		}
		
		// Check vsce installation
		try {
			execSync('vsce --version', { stdio: 'ignore' });
		} catch (error) {
			console.error('❌ vsce not found. Please install it using: npm install -g @vscode/vsce');
			process.exit(1);
		}
		
		// Check git installation
		try {
			execSync('git --version', { stdio: 'ignore' });
		} catch (error) {
			console.warn('⚠️ Git not found. Version bumping may not work as expected.');
		}
		
		console.log('✅ All prerequisites satisfied.');
		return true;
	} catch (error) {
		console.error('❌ Error checking prerequisites:', error.message);
		process.exit(1);
	}
}

// Read package.json
function getPackageJson() {
	try {
		const packageJsonPath = path.resolve(process.cwd(), 'package.json');
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		return packageJson;
	} catch (error) {
		console.error('❌ Error reading package.json:', error.message);
		process.exit(1);
	}
}

// Update package.json with new version
function updateVersion(type) {
	if (!type) return null;
	
	console.log(`🔄 Bumping ${type} version...`);
	
	try {
		// Use npm version to bump the version
		const result = execSync(`npm version ${type} --no-git-tag-version`, { encoding: 'utf8' });
		const newVersion = result.trim();
		console.log(`✅ Version bumped to ${newVersion}`);
		return newVersion;
	} catch (error) {
		console.error('❌ Error bumping version:', error.message);
		process.exit(1);
	}
}

// Run validation checks
async function runValidation(options) {
	if (options.skipValidation) {
		console.log('⏩ Skipping validation (--skip-validation)');
		return true;
	}
	
	console.log('🔍 Running validation checks...');
	
	try {
		// Linting
		console.log('   Running linter...');
		execSync('npm run lint', { stdio: 'inherit' });
		
		// Run tests if not skipped
		if (!options.skipTests) {
			console.log('   Running tests...');
			execSync('npm test', { stdio: 'inherit' });
		} else {
			console.log('   Skipping tests (--skip-tests)');
		}
		
		// Ensure the extension builds
		console.log('   Building extension...');
		execSync('npm run compile', { stdio: 'inherit' });
		
		console.log('✅ Validation completed successfully.');
		return true;
	} catch (error) {
		console.error('❌ Validation failed:', error.message);
		return false;
	}
}

// Package the extension
function packageExtension() {
	console.log('📦 Packaging extension...');
	
	try {
		// Run vscode:prepublish script
		execSync('npm run vscode:prepublish', { stdio: 'inherit' });
		
		// Package with vsce
		const packageJson = getPackageJson();
		const outputFilename = `${packageJson.name}-${packageJson.version}.vsix`;
		execSync(`vsce package -o ${outputFilename}`, { stdio: 'inherit' });
		
		console.log(`✅ Extension packaged as ${outputFilename}`);
		return outputFilename;
	} catch (error) {
		console.error('❌ Packaging failed:', error.message);
		process.exit(1);
	}
}

// Install the extension locally
function installLocally(vsixPath) {
	console.log('🔌 Installing extension locally...');
	
	try {
		// Uninstall existing extension if installed
		const packageJson = getPackageJson();
		try {
			execSync(`code --uninstall-extension ${packageJson.publisher}.${packageJson.name}`, { stdio: 'ignore' });
			console.log('   Uninstalled existing extension.');
		} catch (error) {
			// Ignore error if extension was not installed
		}
		
		// Install the extension
		execSync(`code --install-extension ${vsixPath}`, { stdio: 'inherit' });
		
		console.log('✅ Extension installed locally.');
		return true;
	} catch (error) {
		console.error('❌ Installation failed:', error.message);
		return false;
	}
}

// Publish to VS Code Marketplace
function publishToMarketplace(options) {
	console.log('🚀 Publishing to VS Code Marketplace...');
	
	try {
		// Set environment variable for token
		const env = { ...process.env, VSCE_PAT: options.token };
		
		// Publish with vsce
		execSync('vsce publish', { stdio: 'inherit', env });
		
		console.log('✅ Extension published to VS Code Marketplace.');
		return true;
	} catch (error) {
		console.error('❌ Publishing failed:', error.message);
		return false;
	}
}

// Create a prompt interface for confirmation
function createPrompt() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
}

// Ask for confirmation
function confirm(message) {
	return new Promise((resolve) => {
		const rl = createPrompt();
		rl.question(`${message} (y/n) `, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
		});
	});
}

// Main function
async function main() {
	console.log('🚀 Tabber VS Code Extension Deployment');
	console.log('======================================');
	
	const options = parseArgs();
	
	// Default to package if no action specified
	if (!options.packageOnly && !options.installLocally && !options.publish) {
		options.packageOnly = true;
	}
	
	// Check prerequisites
	checkPrerequisites();
	
	// Show current configuration
	const packageJson = getPackageJson();
	console.log(`\nCurrent extension: ${packageJson.displayName} v${packageJson.version}`);
	console.log(`Publisher: ${packageJson.publisher}`);
	
	// Confirm deployment
	let proceed = await confirm('Do you want to proceed with deployment?');
	if (!proceed) {
		console.log('Deployment cancelled.');
		process.exit(0);
	}
	
	// Update version if requested
	if (options.bumpVersion) {
		updateVersion(options.bumpVersion);
	}
	
	// Run validation
	const validationSuccess = await runValidation(options);
	if (!validationSuccess && !options.skipValidation) {
		proceed = await confirm('Validation failed. Continue anyway?');
		if (!proceed) {
			console.log('Deployment cancelled.');
			process.exit(1);
		}
	}
	
	// Package the extension
	const vsixPath = packageExtension();
	
	// Install locally if requested
	if (options.installLocally) {
		installLocally(vsixPath);
	}
	
	// Publish to marketplace if requested
	if (options.publish) {
		proceed = await confirm('Publishing to VS Code Marketplace. This is irreversible. Continue?');
		if (proceed) {
			publishToMarketplace(options);
		} else {
			console.log('Publishing cancelled.');
		}
	}
	
	console.log('\n✨ Deployment completed successfully!');
}

// Run the main function
main().catch((error) => {
	console.error('❌ Deployment failed:', error.message);
	process.exit(1);
});