import * as vscode from 'vscode';
import { IndentationUtils } from '../utils/indentation-utils';

/**
 * Options for space to tab conversion
 */
export interface ConversionOptions {
	preserveIndentationInEmptyLines?: boolean;
	onlyLeadingSpaces?: boolean;
}

/**
 * Result of space to tab conversion
 */
export interface ConversionResult {
	edits: vscode.TextEdit[];
	linesChanged: number;
	spacesReplaced: number;
}

/**
 * Converts space indentation to tabs
 */
export class SpaceToTabConverter {
	private tabSize: number;
	private options: ConversionOptions;

	/**
	 * Create a new space to tab converter
	 * @param tabSize Number of spaces that equal one tab
	 * @param options Conversion options
	 */
	constructor(tabSize: number, options: ConversionOptions = {}) {
		this.tabSize = tabSize;
		this.options = {
			preserveIndentationInEmptyLines: true,
			onlyLeadingSpaces: true,
			...options
		};
	}

	/**
	 * Convert spaces to tabs in a document
	 * @param document The document to convert
	 * @returns Result of the conversion
	 */
	public convert(document: vscode.TextDocument): ConversionResult {
		const edits: vscode.TextEdit[] = [];
		let linesChanged = 0;
		let spacesReplaced = 0;

		// Process each line in the document
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const lineText = line.text;
			
			// Skip empty lines if configured
			if (line.isEmptyOrWhitespace && !this.options.preserveIndentationInEmptyLines) {
				continue;
			}

			// Convert the line
			const convertedLine = this.convertLine(lineText);
			
			// Only create edits if the line changed
			if (convertedLine !== lineText) {
				edits.push(vscode.TextEdit.replace(line.range, convertedLine));
				linesChanged++;
				spacesReplaced += IndentationUtils.calculateSpacesReplaced(lineText, convertedLine);
			}
		}

		return {
			edits,
			linesChanged,
			spacesReplaced
		};
	}

	/**
	 * Convert a single line from spaces to tabs
	 * @param line The line to convert
	 * @returns The converted line
	 */
	private convertLine(line: string): string {
		if (this.options.onlyLeadingSpaces) {
			return this.convertLeadingSpaces(line);
		} else {
			// Convert all spaces in the line (not typically recommended)
			return this.convertAllSpaces(line);
		}
	}

	/**
	 * Convert only leading spaces to tabs
	 * @param line The line to convert
	 * @returns The converted line
	 */
	private convertLeadingSpaces(line: string): string {
		// Extract leading whitespace
		const leadingWhitespace = IndentationUtils.extractLeadingWhitespace(line);
		const contentAfterWhitespace = line.substring(leadingWhitespace.length);
		
		// If no leading whitespace, return original line
		if (leadingWhitespace.length === 0) {
			return line;
		}
		
		// If already has tabs, handle mixed indentation
		if (leadingWhitespace.includes('\t')) {
			return this.convertMixedIndentation(leadingWhitespace) + contentAfterWhitespace;
		}
		
		// Only convert if there are actually spaces in the leading whitespace
		if (!leadingWhitespace.includes(' ')) {
			return line;
		}

		// Convert spaces to tabs
		const spacesCount = leadingWhitespace.length;
		const tabsCount = Math.floor(spacesCount / this.tabSize);
		const remainingSpaces = spacesCount % this.tabSize;
		
		const newIndentation =
			'\t'.repeat(tabsCount) +
			(remainingSpaces > 0 ? ' '.repeat(remainingSpaces) : '');
		
		return newIndentation + contentAfterWhitespace;
	}

	/**
	 * Convert mixed indentation (spaces and tabs) to consistent tab indentation
	 * @param indentation The mixed indentation string
	 * @returns Consistent tab indentation
	 */
	private convertMixedIndentation(indentation: string): string {
		// Convert to all spaces first
		const allSpacesIndentation = indentation.replace(/\t/g, ' '.repeat(this.tabSize));
		
		// Then convert back to tabs + spaces
		const spacesCount = allSpacesIndentation.length;
		const tabsCount = Math.floor(spacesCount / this.tabSize);
		const remainingSpaces = spacesCount % this.tabSize;
		
		return '\t'.repeat(tabsCount) + (remainingSpaces > 0 ? ' '.repeat(remainingSpaces) : '');
	}

	/**
	 * Convert all spaces to tabs (including those in content - generally not desirable)
	 * This is mostly here for completeness, not typically used
	 * @param line The line to convert
	 * @returns The converted line
	 */
	private convertAllSpaces(line: string): string {
		// This would replace all sequences of tabSize spaces with tabs
		// Not recommended for normal use as it can affect string literals, etc.
		let result = '';
		let spaceCount = 0;
		
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			
			if (char === ' ') {
				spaceCount++;
				
				if (spaceCount === this.tabSize) {
					result += '\t';
					spaceCount = 0;
				}
			} else {
				// Add any pending spaces
				if (spaceCount > 0) {
					result += ' '.repeat(spaceCount);
					spaceCount = 0;
				}
				
				result += char;
			}
		}
		
		// Add any trailing spaces
		if (spaceCount > 0) {
			result += ' '.repeat(spaceCount);
		}
		
		return result;
	}
}