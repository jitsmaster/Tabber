# Tabber File Type Handling and Edge Cases

## File Type Handling

The Tabber extension needs to handle various file types appropriately. This document outlines the approach for different languages and file formats.

### Language-Specific Handling

```
FUNCTION shouldProcessFile(document, configuration)
	// Get document language ID
	languageId = document.languageId
	
	// Check if language is in the excluded list
	excludedLanguages = configuration.get("excludedLanguages") || []
	IF excludedLanguages.includes(languageId)
		RETURN false
	END IF
	
	// Check if we're only processing specific languages
	includeLanguagesOnly = configuration.get("includeLanguagesOnly") || []
	IF includeLanguagesOnly.length > 0 AND !includeLanguagesOnly.includes(languageId)
		RETURN false
	END IF
	
	// Check VS Code's language-specific settings if configured to respect them
	IF configuration.get("respectVSCodeSettings")
		languageSpecificConfig = getLanguageSpecificConfiguration(languageId)
		IF languageSpecificConfig.insertSpaces === true
			// Language is explicitly configured to use spaces in VS Code
			RETURN false
		END IF
	END IF
	
	RETURN true
END FUNCTION
```

### Language-Specific Tab Size Detection

```
FUNCTION getEffectiveTabSize(document, configuration)
	// Start with extension configuration
	tabSize = configuration.get("tabSize") || 4
	
	// Check if we should respect VS Code settings
	IF configuration.get("respectVSCodeSettings")
		// Get language-specific editor config
		languageConfig = getLanguageSpecificConfiguration(document.languageId)
		
		IF languageConfig.tabSize !== undefined
			tabSize = languageConfig.tabSize
		ELSE
			// Fall back to editor default tab size
			editorConfig = getEditorConfiguration()
			tabSize = editorConfig.tabSize || tabSize
		END IF
	END IF
	
	RETURN tabSize
END FUNCTION
```

### Special File Type Handlers

The extension will include specialized handling for certain file types:

#### Markdown Files

```
FUNCTION handleMarkdownFile(document, tabSize)
	// Special processing for markdown files
	// - Preserve code blocks formatting
	// - Handle list indentation carefully
	
	// Identify code blocks and their ranges
	codeBlocks = findMarkdownCodeBlocks(document)
	
	// Identify list structures
	listStructures = findMarkdownLists(document)
	
	// Process regular content
	edits = []
	
	FOR EACH line, lineIndex IN document
		// Skip lines in code blocks (they will be processed separately)
		IF isLineInCodeBlock(lineIndex, codeBlocks)
			CONTINUE
		END IF
		
		// Handle list indentation specially
		IF isLineInList(lineIndex, listStructures)
			edits.push(processMarkdownListIndentation(line, lineIndex, tabSize))
		ELSE
			// Process normal line
			edits.push(processNormalIndentation(line, lineIndex, tabSize))
		END IF
	END FOR
	
	// Process code blocks according to their language
	FOR EACH codeBlock IN codeBlocks
		languageId = codeBlock.language || "plaintext"
		blockEdits = processCodeBlockWithLanguage(document, codeBlock, languageId, tabSize)
		edits.push(...blockEdits)
	END FOR
	
	RETURN edits
END FUNCTION
```

#### HTML/XML Files

```
FUNCTION handleHtmlFile(document, tabSize)
	// Special processing for HTML/XML files
	// - Preserve attribute indentation
	// - Handle inline elements properly
	
	// Parse document structure
	documentStructure = parseHtmlStructure(document)
	
	// Generate edits
	edits = []
	
	FOR EACH element IN documentStructure
		// Process element based on its type and nesting level
		elementEdits = processHtmlElement(element, tabSize)
		edits.push(...elementEdits)
	END FOR
	
	RETURN edits
END FUNCTION
```

### File Type Matrix

The extension will handle different file types as follows:

| File Type | Special Handling | Default Tab Size | Notes |
|-----------|-----------------|------------------|-------|
| JavaScript/TypeScript | Yes - Handle JSX/TSX constructs | 2 | Respect user's prettier/eslint config when available |
| HTML/XML | Yes - Attribute indentation | 2 | Maintain attribute alignment |
| CSS/SCSS/LESS | Yes - Handle nested rules | 2 | Preserve property alignment |
| Python | Yes - Significant whitespace | 4 | Special care for indentation sensitivity |
| Markdown | Yes - Code blocks & lists | 2 | Preserve code block language indentation |
| Yaml | Yes - Significant whitespace | 2 | Be careful with indentation significance |
| JSON | Yes - Auto-formatting | 2 | Respect JSON schema validation |
| C/C++/C# | No | 4 | Standard processing |
| Java | No | 4 | Standard processing |
| Ruby | No | 2 | Standard processing |
| PHP | No | 4 | Standard processing |
| Go | No | 4 (traditionally uses tabs) | Standard processing |
| Rust | No | 4 | Standard processing |
| Plain Text | No | 4 | Optional processing (configurable) |

## Edge Cases and Special Considerations

### Mixed Indentation Handling

```
FUNCTION handleMixedIndentation(document, tabSize)
	// Initialize indentation analysis
	indentationInfo = detectIndentation(document)
	
	// Determine strategy based on analysis
	IF indentationInfo.hasMixedIndentation
		// Option 1: Try to normalize based on line context
		IF canDetermineContextualIndentation(document, indentationInfo)
			RETURN normalizeByContext(document, tabSize, indentationInfo)
		
		// Option 2: Normalize everything to tabs
		ELSE
			RETURN normalizeAllToTabs(document, tabSize)
		END IF
	ELSE
		// Standard handling for non-mixed indentation
		RETURN standardTabConversion(document, tabSize)
	END IF
END FUNCTION
```

### Special Content Preservation

```
FUNCTION preserveSpecialContent(document, processor)
	// Identify ranges of special content to preserve
	preserveRanges = []
	
	// Add string literals
	stringLiterals = findStringLiterals(document)
	preserveRanges.push(...stringLiterals)
	
	// Add comments
	comments = findComments(document)
	preserveRanges.push(...comments)
	
	// Add regex literals
	regexLiterals = findRegexLiterals(document)
	preserveRanges.push(...regexLiterals)
	
	// Add template literals
	templateLiterals = findTemplateLiterals(document)
	preserveRanges.push(...templateLiterals)
	
	// Add other special content based on language
	languageSpecificRanges = findLanguageSpecificRanges(document)
	preserveRanges.push(...languageSpecificRanges)
	
	// Create replacements for sensitive content
	replacements = createPlaceholdersForRanges(document, preserveRanges)
	
	// Replace sensitive content with placeholders
	documentWithPlaceholders = replaceContentWithPlaceholders(document, replacements)
	
	// Process the document with placeholders
	processedDocument = processor(documentWithPlaceholders)
	
	// Restore original content
	finalDocument = restorePlaceholders(processedDocument, replacements)
	
	RETURN finalDocument
END FUNCTION
```

### Alignment Preservation

```
FUNCTION preserveAlignment(document, tabSize)
	// Identify code patterns with alignment
	alignedRegions = detectCodeAlignment(document)
	
	// Process each aligned region
	FOR EACH region IN alignedRegions
		// Determine alignment strategy
		alignmentStrategy = determineAlignmentStrategy(region)
		
		// Apply special processing for aligned code
		processAlignedRegion(document, region, alignmentStrategy, tabSize)
	END FOR
END FUNCTION
```

## Error Handling

```
FUNCTION safelyProcessDocument(document, processor)
	TRY
		// Apply the processor function to the document
		result = processor(document)
		RETURN {
			success: true,
			result: result
		}
	CATCH error
		// Log the error for debugging
		logError("Error processing document", error)
		
		// Return failure with error information
		RETURN {
			success: false,
			error: error.message,
			document: document  // Return original document unchanged
		}
	END TRY
END FUNCTION
```

### Error Scenarios

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| File too large (>10MB) | Show warning and offer incremental processing |
| Language not supported | Skip processing with notification |
| Mixed indentation inconsistencies | Show ambiguity warning and use best-effort conversion |
| Syntax errors in document | Attempt to preserve structure, show warning |
| VS Code API errors | Log error, notify user, maintain original document |
| Performance timeout | Process in chunks with progress indicator |

## Performance Considerations

### Large File Handling

```
FUNCTION processLargeFile(document, processor, progressReporter)
	// Check file size
	fileSize = document.getText().length
	
	// If file is small enough, process normally
	IF fileSize < LARGE_FILE_THRESHOLD
		RETURN processor(document)
	END IF
	
	// For large files, process in chunks
	lineCount = document.lineCount
	chunkSize = Math.ceil(lineCount / 10)  // Process in 10 chunks
	
	edits = []
	
	FOR startLine = 0 TO lineCount STEP chunkSize
		endLine = Math.min(startLine + chunkSize, lineCount)
		
		// Process chunk
		chunkText = getTextForLineRange(document, startLine, endLine)
		chunkEdits = processor(chunkText, startLine)
		edits.push(...chunkEdits)
		
		// Report progress
		progressReporter({
			increment: (chunkSize / lineCount) * 100,
			message: `Processing lines ${startLine} to ${endLine} of ${lineCount}`
		})
	END FOR
	
	RETURN edits
END FUNCTION
```

### Incremental Processing

```
FUNCTION setupIncrementalProcessing()
	// Set up document change listener for incremental processing
	workspace.onDidChangeTextDocument(event => {
		IF !isEnabled("incrementalProcessing")
			RETURN
		END IF
		
		// Get changed document
		document = event.document
		
		// Skip if document shouldn't be processed
		IF !shouldProcessFile(document, getConfiguration())
			RETURN
		END IF
		
		// Process only the changed lines
		FOR EACH change IN event.contentChanges
			startLine = document.positionAt(change.rangeOffset).line
			endLine = document.positionAt(change.rangeOffset + change.rangeLength).line
			
			// Process the changed region
			processDocumentRange(document, startLine, endLine)
		END FOR
	})
END FUNCTION
```

## TDD Anchors

### File Type Handling Tests
- Test handling of different file types (all supported languages)
- Verify language-specific tab size detection
- Test special handling for markdown, HTML, and other specialized formats

### Edge Case Tests
- Test mixed indentation scenarios
- Verify handling of special content (strings, comments, regex)
- Test processing of large files
- Verify alignment preservation
- Test handling of files with syntax errors

### Performance Tests
- Measure processing time for files of various sizes
- Test incremental processing efficiency
- Benchmark memory usage during large file processing