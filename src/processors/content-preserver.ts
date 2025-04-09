import * as vscode from 'vscode';

/**
 * Special content region in a document that should be preserved during processing
 */
export interface PreservedRegion {
	range: vscode.Range;
	content: string;
}

/**
 * Handles preserving special content (strings, comments, etc.) during processing
 */
export class ContentPreserver {
	private preservedRegions: PreservedRegion[] = [];

	/**
	 * Find and store regions that should be preserved
	 * @param document The document to analyze
	 */
	public captureRegions(document: vscode.TextDocument): void {
		this.preservedRegions = [];
		
		// This is a simplified implementation
		// For a production version, proper parsing would be needed to handle complex cases
		
		const text = document.getText();
		
		// Find string literals
		this.captureStringLiterals(document, text);
		
		// Find comment blocks
		this.captureComments(document, text);
		
		// Find regex literals (simplified)
		this.captureRegexLiterals(document, text);
	}

	/**
	 * Restore preserved regions after processing
	 * @param document The processed document
	 * @returns The document with restored regions
	 */
	public restoreRegions(document: vscode.TextDocument): vscode.TextDocument {
		// If no regions, return document as is
		if (this.preservedRegions.length === 0) {
			return document;
		}

		// Sort regions in reverse order to avoid position changes
		const sortedRegions = [...this.preservedRegions]
			.sort((a, b) => b.range.start.compareTo(a.range.start));
		
		// Apply edits to restore regions
		const edit = new vscode.WorkspaceEdit();
		
		for (const region of sortedRegions) {
			edit.replace(
				document.uri,
				region.range,
				region.content
			);
		}
		
		// This is a simplified implementation
		// In a real extension, we'd apply the edits and return the updated document
		// Here we assume the document was updated
		return document;
	}

	/**
	 * Preserve document content during processing
	 * @param document The document to process
	 * @param processor The function that processes the document
	 * @returns The processed document with preserved regions restored
	 */
	public preserveContent(
		document: vscode.TextDocument,
		processor: (document: vscode.TextDocument) => vscode.TextDocument
	): vscode.TextDocument {
		// Capture regions to preserve
		this.captureRegions(document);
		
		// Process the document
		const processedDocument = processor(document);
		
		// Restore preserved regions
		return this.restoreRegions(processedDocument);
	}

	/**
	 * Capture string literals in the document
	 * @param document The document to analyze
	 * @param text The document text
	 */
	private captureStringLiterals(document: vscode.TextDocument, text: string): void {
		// Find double-quoted strings
		let match: RegExpExecArray | null;
		const doubleQuoteRegex = /"(?:[^"\\]|\\.)*"/g;
		
		while ((match = doubleQuoteRegex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			
			this.preservedRegions.push({
				range: new vscode.Range(startPos, endPos),
				content: match[0]
			});
		}
		
		// Find single-quoted strings
		const singleQuoteRegex = /'(?:[^'\\]|\\.)*'/g;
		
		while ((match = singleQuoteRegex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			
			this.preservedRegions.push({
				range: new vscode.Range(startPos, endPos),
				content: match[0]
			});
		}
		
		// Find template literals
		const templateRegex = /`(?:[^`\\]|\\.|\${(?:[^{}]|{[^{}]*})*})*`/g;
		
		while ((match = templateRegex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			
			this.preservedRegions.push({
				range: new vscode.Range(startPos, endPos),
				content: match[0]
			});
		}
	}

	/**
	 * Capture comments in the document
	 * @param document The document to analyze
	 * @param text The document text
	 */
	private captureComments(document: vscode.TextDocument, text: string): void {
		// Find single-line comments
		let match: RegExpExecArray | null;
		const singleLineCommentRegex = /\/\/.*$/gm;
		
		while ((match = singleLineCommentRegex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			
			this.preservedRegions.push({
				range: new vscode.Range(startPos, endPos),
				content: match[0]
			});
		}
		
		// Find multi-line comments
		const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;
		
		while ((match = multiLineCommentRegex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			
			this.preservedRegions.push({
				range: new vscode.Range(startPos, endPos),
				content: match[0]
			});
		}
	}

	/**
	 * Capture regex literals in the document
	 * @param document The document to analyze
	 * @param text The document text
	 */
	private captureRegexLiterals(document: vscode.TextDocument, text: string): void {
		// This is a simplified regex literal finder
		// A proper implementation would need to consider context to avoid false positives
		const regexLiteralRegex = /(?<![=<>:]\s*)\/((?![*+?])(?:[^\r\n[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/[gimyus]*/g;
		
		let match: RegExpExecArray | null;
		while ((match = regexLiteralRegex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			
			this.preservedRegions.push({
				range: new vscode.Range(startPos, endPos),
				content: match[0]
			});
		}
	}
}