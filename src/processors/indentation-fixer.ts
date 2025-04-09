import * as fs from 'fs';
import * as vscode from 'vscode';
import { SpaceToTabConverter, ConversionOptions, ConversionResult } from './space-to-tab-converter';
import { IndentationAnalyzer } from './indentation-analyzer';

/**
 * Result of fixing indentation in a file
 */
export interface IndentationFixResult {
	filePath: string;
	linesChanged: number;
	spacesReplaced: number;
	success: boolean;
	error?: string;
}

/**
 * Aggregated result of fixing indentation across multiple files
 */
export interface IndentationFixSummary {
	totalFiles: number;
	totalFilesFixed: number;
	totalLinesChanged: number;
	totalSpacesReplaced: number;
	failedFiles: string[];
	results: IndentationFixResult[];
}

/**
 * Fixes indentation issues in files by converting spaces to tabs
 */
export class IndentationFixer {
	/**
	 * Converts space indentation to tab indentation in a single file
	 * @param filePath Path to the file to fix
	 * @param tabSize Number of spaces that equal one tab (default: 4)
	 * @param options Conversion options
	 * @returns Result of the fix operation
	 */
	public static async fixSingleFile(
		filePath: string, 
		tabSize: number = 4, 
		options: ConversionOptions = { preserveIndentationInEmptyLines: true, onlyLeadingSpaces: true }
	): Promise<IndentationFixResult> {
		try {
			// Get document from workspace
			const uri = vscode.Uri.file(filePath);
			let document: vscode.TextDocument;
			
			try {
				// Try to get document if it's already open
				document = await vscode.workspace.openTextDocument(uri);
			} catch (error) {
				// Return error result if file can't be opened
				// Safely handle error message
				const errorMessage = error instanceof Error ? error.message : String(error);
				return {
					filePath,
					linesChanged: 0,
					spacesReplaced: 0,
					success: false,
					error: `Failed to open file: ${errorMessage}`
				};
			}
			
			// Check if file already uses tabs exclusively
			const analyzer = new IndentationAnalyzer();
			const analysis = analyzer.analyze(document);
			
			// If there are no space indented lines, no need to fix
			if (analysis.indentationStats.spaceIndentedLines === 0 && analysis.indentationStats.mixedIndentationLines === 0) {
				return {
					filePath,
					linesChanged: 0,
					spacesReplaced: 0,
					success: true
				};
			}
			
			// Create converter and convert document
			const converter = new SpaceToTabConverter(tabSize, options);
			const result = converter.convert(document);
			
			// Apply edits to the document
			if (result.edits.length > 0) {
				const edit = new vscode.WorkspaceEdit();
				result.edits.forEach(textEdit => {
					edit.replace(uri, textEdit.range, textEdit.newText);
				});
				
				// Apply the edits
				await vscode.workspace.applyEdit(edit);
				
				// Save the document
				await document.save();
			}
			
			return {
				filePath,
				linesChanged: result.linesChanged,
				spacesReplaced: result.spacesReplaced,
				success: true
			};
		} catch (error) {
			// Safely handle error message
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				filePath,
				linesChanged: 0,
				spacesReplaced: 0,
				success: false,
				error: errorMessage
			};
		}
	}
	
	/**
	 * Converts space indentation to tab indentation across multiple files
	 * @param filePaths Array of file paths to fix
	 * @param tabSize Number of spaces that equal one tab (default: 4)
	 * @param options Conversion options
	 * @returns Summary of the fix operations
	 */
	public static async fixAllFiles(
		filePaths: string[], 
		tabSize: number = 4, 
		options: ConversionOptions = { preserveIndentationInEmptyLines: true, onlyLeadingSpaces: true }
	): Promise<IndentationFixSummary> {
		const summary: IndentationFixSummary = {
			totalFiles: filePaths.length,
			totalFilesFixed: 0,
			totalLinesChanged: 0,
			totalSpacesReplaced: 0,
			failedFiles: [],
			results: []
		};
		
		// Process each file
		for (const filePath of filePaths) {
			const result = await this.fixSingleFile(filePath, tabSize, options);
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
	 * Creates a human-readable report of indentation fixes
	 * @param summary Summary of fix operations
	 * @returns Formatted report string
	 */
	public static createReport(summary: IndentationFixSummary): string {
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
}

// Export the fixSingleFile and fixAllFiles functions directly for easier access
export const fixSingleFile = IndentationFixer.fixSingleFile;
export const fixAllFiles = IndentationFixer.fixAllFiles;