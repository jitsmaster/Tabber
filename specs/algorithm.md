# Tabber Core Algorithm Specifications

## Overview
This document outlines the algorithms and logic for the core functionality of the Tabber extension: converting space-based indentation to tab-based indentation and applying standard formatting.

## Indentation Detection Algorithm

```
FUNCTION detectIndentation(document)
	// Initialize variables to track indentation patterns
	spaceIndentationLevels = {}  // Map to track frequency of space indentation levels
	tabIndentationPresent = false
	mixedIndentationLines = []
	
	// Scan document to detect existing indentation patterns
	FOR EACH line IN document
		IF line is empty OR contains only whitespace
			CONTINUE
		
		// Extract leading whitespace
		leadingWhitespace = extractLeadingWhitespace(line)
		
		IF leadingWhitespace contains tabs
			tabIndentationPresent = true
			
			IF leadingWhitespace contains spaces (not after tabs)
				ADD line number to mixedIndentationLines
		ELSE IF leadingWhitespace contains spaces
			spaceCount = countLeadingSpaces(line)
			
			IF spaceCount > 0
				INCREMENT spaceIndentationLevels[spaceCount]
		END IF
	END FOR
	
	// Determine dominant space indentation level
	dominantSpaceLevel = findMostFrequentValue(spaceIndentationLevels)
	
	RETURN {
		hasTabs: tabIndentationPresent,
		dominantSpaceLevel: dominantSpaceLevel,
		mixedIndentationLines: mixedIndentationLines,
		spaceFrequencyMap: spaceIndentationLevels
	}
END FUNCTION
```

## Space to Tab Conversion Algorithm

```
FUNCTION convertSpacesToTabs(document, tabSize, editorConfig)
	// Initialize statistics and settings
	convertedLines = 0
	spacesReplaced = 0
	tabSize = tabSize || getConfiguredTabSize(editorConfig) || 4
	
	// Get current indentation style
	indentationInfo = detectIndentation(document)
	
	// If no dominant space pattern is found, use configured tab size
	effectiveTabSize = indentationInfo.dominantSpaceLevel || tabSize
	
	// Prepare edit operations
	edits = []
	
	// Process document line by line
	FOR EACH line, lineIndex IN document
		originalLine = line
		newLine = line
		
		// Extract and analyze leading whitespace
		leadingWhitespace = extractLeadingWhitespace(line)
		
		IF leadingWhitespace contains only spaces
			spaceCount = countLeadingSpaces(line)
			tabCount = Math.floor(spaceCount / effectiveTabSize)
			remainingSpaces = spaceCount % effectiveTabSize
			
			// Create new indentation
			newIndentation = repeatCharacter('\t', tabCount)
			
			// Handle remaining spaces if alignment is needed
			IF remainingSpaces > 0
				newIndentation += repeatCharacter(' ', remainingSpaces)
			END IF
			
			// Replace original indentation with new tab-based indentation
			nonWhitespaceContent = line.substring(leadingWhitespace.length)
			newLine = newIndentation + nonWhitespaceContent
			
			IF newLine !== originalLine
				ADD edit operation to replace line at lineIndex
				INCREMENT convertedLines
				spacesReplaced += spaceCount - remainingSpaces
			END IF
		ELSE IF leadingWhitespace contains mixed tabs and spaces
			// Handle mixed indentation by converting spaces to tabs where appropriate
			// This is a simplified version - actual implementation would be more complex
			newLine = convertMixedIndentation(line, effectiveTabSize)
			
			IF newLine !== originalLine
				ADD edit operation to replace line at lineIndex
				INCREMENT convertedLines
				// Calculate spaces replaced by comparing whitespace
				spacesReplaced += calculateSpacesReplaced(originalLine, newLine)
			END IF
		END IF
	END FOR
	
	// Apply all edit operations as a single transaction
	applyEdits(document, edits)
	
	RETURN {
		linesConverted: convertedLines,
		spacesReplaced: spacesReplaced,
		effectiveTabSize: effectiveTabSize
	}
END FUNCTION
```

## Handling Mixed Indentation

```
FUNCTION convertMixedIndentation(line, tabSize)
	// This function handles the complex case of mixed tabs and spaces
	
	// Extract leading whitespace
	leadingWhitespace = extractLeadingWhitespace(line)
	nonWhitespaceContent = line.substring(leadingWhitespace.length)
	
	// Normalize to all spaces first
	spaceOnlyIndentation = convertTabsToSpaces(leadingWhitespace, tabSize)
	spaceCount = spaceOnlyIndentation.length
	
	// Then convert spaces to tabs
	tabCount = Math.floor(spaceCount / tabSize)
	remainingSpaces = spaceCount % tabSize
	
	// Create new indentation
	newIndentation = repeatCharacter('\t', tabCount)
	
	// Handle remaining spaces
	IF remainingSpaces > 0
		newIndentation += repeatCharacter(' ', remainingSpaces)
	END IF
	
	// Return new line with tab-based indentation
	RETURN newIndentation + nonWhitespaceContent
END FUNCTION
```

## String Content Handling

```
FUNCTION preserveStringContent(document, processFunction)
	// Initialize variables
	processedDocument = ""
	stringRanges = []
	
	// Identify string content to preserve
	FOR EACH line, lineIndex IN document
		stringRangesInLine = findStringRanges(line)
		FOR EACH range IN stringRangesInLine
			ADD {line: lineIndex, start: range.start, end: range.end} to stringRanges
		END FOR
	END FOR
	
	// Replace string content with placeholders
	documentWithPlaceholders = replaceSensitiveContentWithPlaceholders(document, stringRanges)
	
	// Apply indentation processing
	processedWithPlaceholders = processFunction(documentWithPlaceholders)
	
	// Restore string content
	processedDocument = restorePlaceholdersWithOriginalContent(processedWithPlaceholders, stringRanges)
	
	RETURN processedDocument
END FUNCTION
```

## Document Formatting Integration

```
FUNCTION formatDocument(document, formattingOptions)
	// Attempt to use VS Code's formatting provider
	vscodeFormatting = tryVsCodeFormatting(document, formattingOptions)
	
	IF vscodeFormatting is successful
		formattedDocument = vscodeFormatting.result
	ELSE
		// Fall back to basic formatting rules if VS Code formatting fails
		formattedDocument = applyBasicFormatting(document, formattingOptions)
	END IF
	
	// Ensure tabs are used for indentation after formatting
	finalDocument = convertSpacesToTabs(formattedDocument, formattingOptions.tabSize)
	
	RETURN finalDocument
END FUNCTION
```

## Utility Functions

```
FUNCTION extractLeadingWhitespace(line)
	// Extract the leading whitespace from a line of text
	match = line.match(/^[ \t]*/)
	RETURN match ? match[0] : ""
END FUNCTION

FUNCTION countLeadingSpaces(line)
	// Count the number of leading spaces in a line
	whitespace = extractLeadingWhitespace(line)
	RETURN whitespace.replace(/\t/g, "").length
END FUNCTION

FUNCTION findMostFrequentValue(frequencyMap)
	// Find the most frequent value in a frequency map
	highestFrequency = 0
	mostFrequentValue = null
	
	FOR EACH [value, frequency] IN frequencyMap
		IF frequency > highestFrequency
			highestFrequency = frequency
			mostFrequentValue = value
		END IF
	END FOR
	
	RETURN mostFrequentValue
END FUNCTION

FUNCTION repeatCharacter(char, count)
	// Create a string with a character repeated count times
	result = ""
	FOR i = 0 TO count - 1
		result += char
	END FOR
	RETURN result
END FUNCTION

FUNCTION convertTabsToSpaces(text, tabSize)
	// Convert tabs to spaces
	RETURN text.replace(/\t/g, repeatCharacter(' ', tabSize))
END FUNCTION

FUNCTION calculateSpacesReplaced(originalLine, newLine)
	// Calculate how many spaces were replaced
	originalSpaces = countSpaces(extractLeadingWhitespace(originalLine))
	newSpaces = countSpaces(extractLeadingWhitespace(newLine))
	RETURN originalSpaces - newSpaces
END FUNCTION

FUNCTION countSpaces(text)
	// Count spaces in a string
	RETURN (text.match(/ /g) || []).length
END FUNCTION
```

## TDD Anchors

### Test Cases for Indentation Detection
- Detect documents with only space indentation
- Detect documents with only tab indentation
- Detect documents with mixed indentation
- Correctly identify the dominant space indentation level
- Handle edge cases like empty documents and documents with only empty lines

### Test Cases for Space to Tab Conversion
- Convert simple space indentation to tabs
- Handle partial tab conversion (when spaces don't divide evenly by tab size)
- Correctly convert mixed indentation scenarios
- Preserve non-indentation spaces
- Handle special cases (comments, string literals, etc.)

### Test Cases for Document Formatting
- Integrate with VS Code's formatting providers
- Fall back to basic formatting when needed
- Preserve special syntax and structures during formatting
- Handle language-specific formatting rules