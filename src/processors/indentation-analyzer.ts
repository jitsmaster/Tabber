import * as vscode from 'vscode';
import { IndentationUtils } from '../utils/indentation-utils';

/**
 * Result of indentation analysis
 */
export interface IndentationAnalysisResult {
	hasTabs: boolean;
	dominantSpaceLevel: number | null;
	mixedIndentationLines: number[];
	indentationStats: IndentationStats;
}

/**
 * Statistics about document indentation
 */
export interface IndentationStats {
	totalLines: number;
	emptyLines: number;
	tabIndentedLines: number;
	spaceIndentedLines: number;
	mixedIndentationLines: number;
	spaceFrequency: Map<number, number>;
}

/**
 * Analyzes document indentation patterns
 */
export class IndentationAnalyzer {
	/**
	 * Analyze a document's indentation patterns
	 * @param document The document to analyze
	 * @returns Analysis result
	 */
	public analyze(document: vscode.TextDocument): IndentationAnalysisResult {
		const stats = this.collectIndentationStats(document);
		
		return {
			hasTabs: stats.tabIndentedLines > 0,
			dominantSpaceLevel: IndentationUtils.findMostFrequentValue(stats.spaceFrequency),
			mixedIndentationLines: this.findMixedIndentationLines(document),
			indentationStats: stats
		};
	}

	/**
	 * Collect indentation statistics for a document
	 * @param document The document to analyze
	 * @returns Indentation statistics
	 */
	private collectIndentationStats(document: vscode.TextDocument): IndentationStats {
		const stats: IndentationStats = {
			totalLines: document.lineCount,
			emptyLines: 0,
			tabIndentedLines: 0,
			spaceIndentedLines: 0,
			mixedIndentationLines: 0,
			spaceFrequency: new Map<number, number>()
		};

		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			
			// Skip empty lines
			if (line.isEmptyOrWhitespace) {
				stats.emptyLines++;
				continue;
			}

			const leadingWhitespace = IndentationUtils.extractLeadingWhitespace(line.text);
			
			// Check for tabs
			if (leadingWhitespace.includes('\t')) {
				stats.tabIndentedLines++;
				
				// Check for mixed indentation
				if (leadingWhitespace.includes(' ')) {
					stats.mixedIndentationLines++;
				}
			} 
			// Check for spaces
			else if (leadingWhitespace.length > 0) {
				stats.spaceIndentedLines++;
				
				// Count space frequencies
				const spaceCount = leadingWhitespace.length;
				const currentCount = stats.spaceFrequency.get(spaceCount) || 0;
				stats.spaceFrequency.set(spaceCount, currentCount + 1);
			}
		}
		
		return stats;
	}

	/**
	 * Find lines with mixed indentation (both spaces and tabs)
	 * @param document The document to analyze
	 * @returns Array of line numbers (0-based)
	 */
	private findMixedIndentationLines(document: vscode.TextDocument): number[] {
		const mixedLines: number[] = [];
		
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			if (line.isEmptyOrWhitespace) {
				continue;
			}
			
			const leadingWhitespace = IndentationUtils.extractLeadingWhitespace(line.text);
			if (leadingWhitespace.includes('\t') && leadingWhitespace.includes(' ')) {
				mixedLines.push(i);
			}
		}
		
		return mixedLines;
	}
}