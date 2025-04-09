/**
 * Tabber VS Code Extension Platform Utilities
 * 
 * This script provides platform-specific utilities for the deployment process,
 * ensuring cross-platform compatibility between Windows and Unix-based systems.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Determine if running on Windows
 * @returns {boolean} - True if running on Windows
 */
function isWindows() {
	return os.platform() === 'win32';
}

/**
 * Get the appropriate file extension for executable scripts
 * @returns {string} - File extension
 */
function getScriptExtension() {
	return isWindows() ? '.cmd' : '.sh';
}

/**
 * Format a path for the current platform
 * @param {string} inputPath - The path to format
 * @returns {string} - Formatted path
 */
function formatPath(inputPath) {
	return isWindows() ? inputPath.replace(/\//g, '\\') : inputPath.replace(/\\/g, '/');
}

/**
 * Check if VS Code is installed and accessible in the PATH
 * @returns {boolean} - True if VS Code is available
 */
function isVSCodeAvailable() {
	try {
		execSync('code --version', { stdio: 'ignore' });
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Get the VS Code extensions directory
 * @returns {string|null} - Path to the extensions directory or null if not found
 */
function getVSCodeExtensionsDir() {
	try {
		let extensionsDir = null;
		
		if (isWindows()) {
			// Windows: %USERPROFILE%\.vscode\extensions
			extensionsDir = path.join(os.homedir(), '.vscode', 'extensions');
		} else if (os.platform() === 'darwin') {
			// macOS: ~/.vscode/extensions
			extensionsDir = path.join(os.homedir(), '.vscode', 'extensions');
		} else {
			// Linux: ~/.vscode/extensions
			extensionsDir = path.join(os.homedir(), '.vscode', 'extensions');
		}
		
		return fs.existsSync(extensionsDir) ? extensionsDir : null;
	} catch (error) {
		console.error('Failed to locate VS Code extensions directory:', error);
		return null;
	}
}

/**
 * Verify if the VS Code CLI is available, and provide installation instructions if not
 * @returns {Object} - Result object with success flag and optional message
 */
function verifyVSCodeCLI() {
	const result = { success: true, message: null };
	
	if (!isVSCodeAvailable()) {
		result.success = false;
		
		let installInstructions = '';
		if (isWindows()) {
			installInstructions = 'Add VS Code to your PATH or run from the VS Code terminal.';
		} else if (os.platform() === 'darwin') {
			installInstructions = 'Run "Install \'code\' command in PATH" from the VS Code command palette (Cmd+Shift+P).';
		} else {
			installInstructions = 'Run "Install \'code\' command in PATH" from the VS Code command palette (Ctrl+Shift+P).';
		}
		
		result.message = `VS Code CLI not found. ${installInstructions}`;
	}
	
	return result;
}

/**
 * Create a command string that is compatible with the current platform
 * @param {string[]} commands - Array of commands to join
 * @returns {string} - Platform-compatible command string
 */
function createCommandString(commands) {
	if (isWindows()) {
		// Windows uses & to chain commands in cmd.exe
		return commands.join(' & ');
	} else {
		// Unix uses && to chain commands that should all succeed
		return commands.join(' && ');
	}
}

/**
 * Get the appropriate directory creation command for the platform
 * @param {string} dirPath - Directory path to create
 * @returns {string} - Command to create the directory
 */
function getMkdirCommand(dirPath) {
	if (isWindows()) {
		return `if not exist "${dirPath}" mkdir "${dirPath}"`;
	} else {
		return `mkdir -p "${dirPath}"`;
	}
}

/**
 * Get the appropriate file copy command for the platform
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @returns {string} - Command to copy the file
 */
function getCopyCommand(source, destination) {
	if (isWindows()) {
		return `copy "${source}" "${destination}"`;
	} else {
		return `cp "${source}" "${destination}"`;
	}
}

/**
 * Get the appropriate file delete command for the platform
 * @param {string} filePath - File path to delete
 * @returns {string} - Command to delete the file
 */
function getDeleteCommand(filePath) {
	if (isWindows()) {
		return `del "${filePath}"`;
	} else {
		return `rm "${filePath}"`;
	}
}

/**
 * Get a command to open a file or URL in the default application
 * @param {string} target - File path or URL to open
 * @returns {string} - Command to open the target
 */
function getOpenCommand(target) {
	if (isWindows()) {
		return `start "" "${target}"`;
	} else if (os.platform() === 'darwin') {
		return `open "${target}"`;
	} else {
		return `xdg-open "${target}"`;
	}
}

/**
 * Find installations of VS Code (stable and insiders)
 * @returns {Object} - Object with paths to VS Code installations
 */
function findVSCodeInstallations() {
	const installations = {
		stable: null,
		insiders: null
	};
	
	try {
		if (isWindows()) {
			// Windows: Check Program Files
			const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
			const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
			
			const possiblePaths = [
				path.join(programFiles, 'Microsoft VS Code', 'code.exe'),
				path.join(programFilesX86, 'Microsoft VS Code', 'code.exe'),
				path.join(programFiles, 'Microsoft VS Code Insiders', 'code-insiders.exe'),
				path.join(programFilesX86, 'Microsoft VS Code Insiders', 'code-insiders.exe')
			];
			
			for (const possiblePath of possiblePaths) {
				if (fs.existsSync(possiblePath)) {
					if (possiblePath.includes('Insiders')) {
						installations.insiders = possiblePath;
					} else {
						installations.stable = possiblePath;
					}
				}
			}
		} else if (os.platform() === 'darwin') {
			// macOS
			const possiblePaths = [
				'/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
				'/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code'
			];
			
			for (const possiblePath of possiblePaths) {
				if (fs.existsSync(possiblePath)) {
					if (possiblePath.includes('Insiders')) {
						installations.insiders = possiblePath;
					} else {
						installations.stable = possiblePath;
					}
				}
			}
		} else {
			// Linux: usually installed via package manager, so rely on PATH
			try {
				execSync('which code', { stdio: 'ignore' });
				installations.stable = 'code';
			} catch (e) {
				// Not found
			}
			
			try {
				execSync('which code-insiders', { stdio: 'ignore' });
				installations.insiders = 'code-insiders';
			} catch (e) {
				// Not found
			}
		}
	} catch (error) {
		console.error('Error finding VS Code installations:', error);
	}
	
	return installations;
}

module.exports = {
	isWindows,
	getScriptExtension,
	formatPath,
	isVSCodeAvailable,
	getVSCodeExtensionsDir,
	verifyVSCodeCLI,
	createCommandString,
	getMkdirCommand,
	getCopyCommand,
	getDeleteCommand,
	getOpenCommand,
	findVSCodeInstallations
};