/**
 * Indentation utility functions for the Tabber extension
 */
export class IndentationUtils {
	/**
	 * Extract leading whitespace from a line of text
	 * @param line The line to extract whitespace from
	 * @returns The extracted whitespace
	 */
	public static extractLeadingWhitespace(line: string): string {
		const match = line.match(/^[ \t]*/);
		return match ? match[0] : "";
	}

	/**
	 * Count the number of leading spaces in a line
	 * @param line The line to count spaces in
	 * @returns The number of leading spaces
	 */
	public static countLeadingSpaces(line: string): number {
		const whitespace = this.extractLeadingWhitespace(line);
		return whitespace.replace(/\t/g, "").length;
	}

	/**
	 * Find the most frequent value in a frequency map
	 * @param frequencyMap Map of value to frequency
	 * @returns The most frequent value
	 */
	public static findMostFrequentValue(frequencyMap: Map<number, number>): number | null {
		let highestFrequency = 0;
		let mostFrequentValue: number | null = null;

		for (const [value, frequency] of frequencyMap.entries()) {
			if (frequency > highestFrequency) {
				highestFrequency = frequency;
				mostFrequentValue = value;
			}
		}

		return mostFrequentValue;
	}

	/**
	 * Repeat a character a specified number of times
	 * @param char The character to repeat
	 * @param count The number of times to repeat
	 * @returns The repeated character string
	 */
	public static repeatCharacter(char: string, count: number): string {
		return char.repeat(count);
	}

	/**
	 * Convert tabs to spaces
	 * @param text The text to convert
	 * @param tabSize The number of spaces per tab
	 * @returns Text with tabs replaced by spaces
	 */
	public static convertTabsToSpaces(text: string, tabSize: number): string {
		return text.replace(/\t/g, this.repeatCharacter(' ', tabSize));
	}

	/**
	 * Count the number of spaces in a string
	 * @param text The text to count spaces in
	 * @returns The number of spaces
	 */
	public static countSpaces(text: string): number {
		const matches = text.match(/ /g);
		return matches ? matches.length : 0;
	}

	/**
	 * Calculate the number of spaces replaced in a conversion
	 * @param originalLine The original line
	 * @param newLine The new line
	 * @returns The number of spaces replaced
	 */
	public static calculateSpacesReplaced(originalLine: string, newLine: string): number {
		const originalSpaces = this.countSpaces(this.extractLeadingWhitespace(originalLine));
		const newSpaces = this.countSpaces(this.extractLeadingWhitespace(newLine));
		return originalSpaces - newSpaces;
	}
}