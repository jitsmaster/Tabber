import * as assert from 'assert';
import { IndentationUtils } from '../../utils/indentation-utils';

suite('IndentationUtils Tests', () => {
	test('extractLeadingWhitespace should extract spaces and tabs correctly', () => {
		// Test with spaces
		assert.strictEqual(
			IndentationUtils.extractLeadingWhitespace('    test'),
			'    '
		);
		
		// Test with tabs
		assert.strictEqual(
			IndentationUtils.extractLeadingWhitespace('\t\ttest'),
			'\t\t'
		);
		
		// Test with mixed
		assert.strictEqual(
			IndentationUtils.extractLeadingWhitespace('\t  test'),
			'\t  '
		);
		
		// Test with no whitespace
		assert.strictEqual(
			IndentationUtils.extractLeadingWhitespace('test'),
			''
		);
	});
	
	test('countLeadingSpaces should count spaces correctly', () => {
		// Test with only spaces
		assert.strictEqual(
			IndentationUtils.countLeadingSpaces('    test'),
			4
		);
		
		// Test with tabs (should count only spaces)
		assert.strictEqual(
			IndentationUtils.countLeadingSpaces('\t\ttest'),
			0
		);
		
		// Test with mixed (should count only spaces)
		assert.strictEqual(
			IndentationUtils.countLeadingSpaces('\t  test'),
			2
		);
		
		// Test with no whitespace
		assert.strictEqual(
			IndentationUtils.countLeadingSpaces('test'),
			0
		);
	});
	
	test('findMostFrequentValue should identify the most common value', () => {
		// Create test frequency map
		const frequencyMap = new Map<number, number>();
		frequencyMap.set(2, 5);  // 2 spaces appears 5 times
		frequencyMap.set(4, 10); // 4 spaces appears 10 times
		frequencyMap.set(8, 3);  // 8 spaces appears 3 times
		
		assert.strictEqual(
			IndentationUtils.findMostFrequentValue(frequencyMap),
			4
		);
		
		// Test with empty map
		assert.strictEqual(
			IndentationUtils.findMostFrequentValue(new Map<number, number>()),
			null
		);
	});
	
	test('repeatCharacter should repeat characters correctly', () => {
		assert.strictEqual(
			IndentationUtils.repeatCharacter(' ', 4),
			'    '
		);
		
		assert.strictEqual(
			IndentationUtils.repeatCharacter('\t', 2),
			'\t\t'
		);
		
		assert.strictEqual(
			IndentationUtils.repeatCharacter('x', 3),
			'xxx'
		);
	});
	
	test('convertTabsToSpaces should replace tabs with spaces', () => {
		assert.strictEqual(
			IndentationUtils.convertTabsToSpaces('\t\ttest', 4),
			'        test'
		);
		
		assert.strictEqual(
			IndentationUtils.convertTabsToSpaces('\t  test', 2),
			'    test'
		);
	});
	
	test('calculateSpacesReplaced should count replaced spaces correctly', () => {
		// 4 spaces replaced with 1 tab
		assert.strictEqual(
			IndentationUtils.calculateSpacesReplaced('    test', '\ttest'),
			4
		);
		
		// 8 spaces replaced with 2 tabs
		assert.strictEqual(
			IndentationUtils.calculateSpacesReplaced('        test', '\t\ttest'),
			8
		);
		
		// No spaces replaced
		assert.strictEqual(
			IndentationUtils.calculateSpacesReplaced('\ttest', '\ttest'),
			0
		);
	});
});