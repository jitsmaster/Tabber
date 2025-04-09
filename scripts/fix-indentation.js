#!/usr/bin/env node

/**
 * Command-line tool for fixing indentation issues (converting spaces to tabs)
 * 
 * Usage:
 *   node fix-indentation.js [options] <file-or-directory>
 * 
 * Options:
 *   --all             Fix all files in directory (recursively)
 *   --tab-size=<n>    Number of spaces that equal one tab (default: 4)
 *   --help            Show help
 * 
 * Examples:
 *   node fix-indentation.js ./media/src/components/App.jsx
 *   node fix-indentation.js --all ./media/src/components
 *   node fix-indentation.js --tab-size=2 ./media/src/components/App.jsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let options = {
	all: false,
	tabSize: 4,
	help: false,
	target: null
};

// Parse arguments
for (const arg of args) {
	if (arg === '--all') {
		options.all = true;
	} else if (arg === '--help') {
		options.help = true;
	} else if (arg.startsWith('--tab-size=')) {
		const size = parseInt(arg.split('=')[1]);
		if (!isNaN(size) && size > 0) {
			options.tabSize = size;
		} else {
			console.error('Error: Tab size must be a positive number');
			process.exit(1);
		}
	} else if (!arg.startsWith('--')) {
		options.target = arg;
	}
}

// Show help if requested or if no target provided
if (options.help || !options.target) {
	console.log(`
Tabber: Fix Indentation
======================

A command-line tool for fixing indentation issues by converting spaces to tabs.

Usage:
  node fix-indentation.js [options] <file-or-directory>

Options:
  --all             Fix all files in directory (recursively)
  --tab-size=<n>    Number of spaces that equal one tab (default: 4)
  --help            Show help

Examples:
  node fix-indentation.js ./media/src/components/App.jsx
  node fix-indentation.js --all ./media/src/components
  node fix-indentation.js --tab-size=2 ./media/src/components/App.jsx
`);
	process.exit(0);
}

// Check if target exists
if (!fs.existsSync(options.target)) {
	console.error(`Error: Target '${options.target}' does not exist`);
	process.exit(1);
}

// Determine if target is a file or directory
const isDirectory = fs.statSync(options.target).isDirectory();

// Ensure correct usage
if (!options.all && isDirectory) {
	console.error(`Error: '${options.target}' is a directory. Use --all to process all files in directory`);
	process.exit(1);
}

if (options.all && !isDirectory) {
	console.error(`Error: '${options.target}' is not a directory but --all option was specified`);
	process.exit(1);
}

/**
 * Gets a list of files in a directory, optionally recursively
 * @param {string} directory Directory to scan
 * @param {boolean} recursive Whether to scan recursively
 * @returns {string[]} Array of file paths
 */
function getFilesInDirectory(directory, recursive = true) {
	let results = [];
	const items = fs.readdirSync(directory);
	
	for (const item of items) {
		const itemPath = path.join(directory, item);
		const stat = fs.statSync(itemPath);
		
		if (stat.isDirectory()) {
			if (recursive) {
				results = results.concat(getFilesInDirectory(itemPath, recursive));
			}
		} else {
			// Skip files that are likely to be binary
			const ext = path.extname(itemPath).toLowerCase();
			const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.ico', '.exe', '.dll'];
			if (!skipExtensions.includes(ext)) {
				results.push(itemPath);
			}
		}
	}
	
	return results;
}

/**
 * Analyzes a file to check for space-based indentation
 * @param {string} filePath Path to the file
 * @returns {object} Analysis result
 */
function analyzeFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n');
		
		let spaceIndentedLines = 0;
		let mixedIndentationLines = 0;
		const issues = [];
		
		lines.forEach((line, index) => {
			// Skip empty lines
			if (line.trim() === '') return;
			
			// Extract leading whitespace
			const leadingWhitespace = line.match(/^[ \t]*/)[0];
			
			// Check if indentation uses spaces instead of tabs
			if (leadingWhitespace.includes(' ')) {
				if (leadingWhitespace.includes('\t')) {
					mixedIndentationLines++;
				} else {
					spaceIndentedLines++;
				}
				
				issues.push({
					lineNumber: index + 1,
					indentation: leadingWhitespace.length,
					content: line.trim().substring(0, 50) + (line.trim().length > 50 ? '...' : '')
				});
			}
		});
		
		return {
			filePath,
			stats: {
				spaceIndentedLines,
				mixedIndentationLines,
				totalIssues: spaceIndentedLines + mixedIndentationLines
			},
			issues
		};
	} catch (error) {
		return {
			filePath,
			error: error.message
		};
	}
}

/**
 * Fixes space indentation in a file
 * @param {string} filePath Path to the file
 * @param {number} tabSize Number of spaces that equal one tab
 * @returns {object} Result of the operation
 */
function fixSingleFile(filePath, tabSize = 4) {
	try {
		// Read file content
		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n');
		
		let linesChanged = 0;
		let spacesReplaced = 0;
		
		// Create new content with fixed indentation
		const newLines = lines.map(line => {
			// Skip empty lines
			if (line.trim() === '') return line;
			
			// Extract leading whitespace
			const leadingWhitespace = line.match(/^[ \t]*/)[0];
			
			// Skip if no spaces in indentation
			if (!leadingWhitespace.includes(' ')) return line;
			
			// Fix indentation
			const indentLevel = Math.floor(leadingWhitespace.length / tabSize);
			const remainder = leadingWhitespace.length % tabSize;
			const newIndentation = '\t'.repeat(indentLevel) + ' '.repeat(remainder);
			
			// Replace only the leading whitespace
			const newLine = newIndentation + line.substring(leadingWhitespace.length);
			
			if (newLine !== line) {
				linesChanged++;
				spacesReplaced += (leadingWhitespace.match(/ /g) || []).length;
			}
			
			return newLine;
		});
		
		// Only write file if changes were made
		if (linesChanged > 0) {
			fs.writeFileSync(filePath, newLines.join('\n'));
		}
		
		return {
			filePath,
			linesChanged,
			spacesReplaced,
			success: true
		};
	} catch (error) {
		return {
			filePath,
			linesChanged: 0,
			spacesReplaced: 0,
			success: false,
			error: error.message
		};
	}
}

/**
 * Fix indentation issues in multiple files
 * @param {string[]} filePaths Array of file paths
 * @param {number} tabSize Number of spaces that equal one tab
 * @returns {object} Summary of operations
 */
function fixAllFiles(filePaths, tabSize = 4) {
	const summary = {
		totalFiles: filePaths.length,
		totalFilesFixed: 0,
		totalLinesChanged: 0,
		totalSpacesReplaced: 0,
		failedFiles: [],
		results: []
	};
	
	for (const filePath of filePaths) {
		console.log(`Processing ${filePath}...`);
		const result = fixSingleFile(filePath, tabSize);
		summary.results.push(result);
		
		// Update summary stats
		if (result.success) {
			if (result.linesChanged > 0) {
				summary.totalFilesFixed++;
			}
			summary.totalLinesChanged += result.linesChanged;
			summary.totalSpacesReplaced += result.spacesReplaced;
		} else {
			summary.failedFiles.push(filePath);
		}
	}
	
	return summary;
}

/**
 * Creates a human-readable report from fix summary
 * @param {object} summary Summary of fix operations
 * @returns {string} Formatted report string
 */
function createReport(summary) {
	let report = `Indentation Fix Report\n`;
	report += `===================\n\n`;
	report += `Total files processed: ${summary.totalFiles}\n`;
	report += `Files with fixes applied: ${summary.totalFilesFixed}\n`;
	report += `Total lines changed: ${summary.totalLinesChanged}\n`;
	report += `Total spaces replaced: ${summary.totalSpacesReplaced}\n`;
	
	if (summary.failedFiles.length > 0) {
		report += `\nFiles that failed to process (${summary.failedFiles.length}):\n`;
		summary.failedFiles.forEach(file => {
			report += `- ${file}\n`;
		});
	}
	
	report += `\nDetailed Results:\n`;
	summary.results.forEach(result => {
		if (result.success) {
			if (result.linesChanged > 0) {
				report += `✓ ${result.filePath}: ${result.linesChanged} lines changed, ${result.spacesReplaced} spaces replaced\n`;
			} else {
				report += `✓ ${result.filePath}: No changes needed\n`;
			}
		} else {
			report += `✗ ${result.filePath}: Failed - ${result.error}\n`;
		}
	});
	
	return report;
}

// Main execution
try {
	console.log(`Tabber: Fix Indentation Tool`);
	console.log(`===========================\n`);
	
	if (options.all) {
		console.log(`Processing all files in ${options.target}...\n`);
		const files = getFilesInDirectory(options.target);
		const summary = fixAllFiles(files, options.tabSize);
		console.log('\n' + createReport(summary));
	} else {
		console.log(`Processing file ${options.target}...\n`);
		// Analyze file before fixing
		const analysis = analyzeFile(options.target);
		
		if (analysis.error) {
			console.error(`Error analyzing file: ${analysis.error}`);
			process.exit(1);
		}
		
		if (analysis.stats.totalIssues === 0) {
			console.log(`No indentation issues found in ${options.target}`);
			process.exit(0);
		}
		
		console.log(`Found ${analysis.stats.totalIssues} indentation issues in ${options.target}`);
		
		// Fix file
		const result = fixSingleFile(options.target, options.tabSize);
		
		// Create summary for single file
		const summary = {
			totalFiles: 1,
			totalFilesFixed: result.linesChanged > 0 ? 1 : 0,
			totalLinesChanged: result.linesChanged,
			totalSpacesReplaced: result.spacesReplaced,
			failedFiles: result.success ? [] : [options.target],
			results: [result]
		};
		
		console.log('\n' + createReport(summary));
	}
	
	console.log(`\nDone!`);
} catch (error) {
	console.error(`Error: ${error.message}`);
	process.exit(1);
}