# Tabber Testing Guide

## Overview

This document outlines the testing approach and test cases for the Tabber VS Code extension. Comprehensive testing is essential to ensure the extension functions correctly across different file types, handles edge cases appropriately, and integrates seamlessly with VS Code.

## Testing Levels

### Unit Testing

Unit tests should be implemented for all core algorithms and utility functions:

```
FUNCTION testIndentationDetection()
	// Test cases for indentation detection
	testCases = [
		{
			name: "Empty document",
			input: "",
			expected: { hasTabs: false, dominantSpaceLevel: null, mixedIndentationLines: [] }
		},
		{
			name: "Space indentation only",
			input: "    function test() {\n        return true;\n    }",
			expected: { hasTabs: false, dominantSpaceLevel: 4, mixedIndentationLines: [] }
		},
		{
			name: "Tab indentation only",
			input: "\tfunction test() {\n\t\treturn true;\n\t}",
			expected: { hasTabs: true, dominantSpaceLevel: null, mixedIndentationLines: [] }
		},
		{
			name: "Mixed indentation",
			input: "    function test() {\n\t    return true;\n    }",
			expected: { hasTabs: true, dominantSpaceLevel: 4, mixedIndentationLines: [1] }
		}
	]
	
	// Run test cases
	FOR EACH testCase IN testCases
		document = createMockDocument(testCase.input)
		result = detectIndentation(document)
		
		ASSERT_EQUALS(result.hasTabs, testCase.expected.hasTabs)
		ASSERT_EQUALS(result.dominantSpaceLevel, testCase.expected.dominantSpaceLevel)
		ASSERT_ARRAY_EQUALS(result.mixedIndentationLines, testCase.expected.mixedIndentationLines)
	END FOR
END FUNCTION

FUNCTION testSpaceToTabConversion()
	// Test cases for space to tab conversion
	testCases = [
		{
			name: "Basic conversion",
			input: "    function test() {\n        return true;\n    }",
			tabSize: 4,
			expected: "\tfunction test() {\n\t\treturn true;\n\t}"
		},
		{
			name: "Partial tab conversion",
			input: "    function test() {\n      return true;\n    }",
			tabSize: 4,
			expected: "\tfunction test() {\n\t  return true;\n\t}"
		},
		{
			name: "Handle mixed indentation",
			input: "    function test() {\n\t    return true;\n    }",
			tabSize: 4,
			expected: "\tfunction test() {\n\t\treturn true;\n\t}"
		},
		{
			name: "Preserve non-indentation spaces",
			input: "    function test(a, b) {\n        return a + b;\n    }",
			tabSize: 4,
			expected: "\tfunction test(a, b) {\n\t\treturn a + b;\n\t}"
		}
	]
	
	// Run test cases
	FOR EACH testCase IN testCases
		document = createMockDocument(testCase.input)
		result = convertSpacesToTabs(document, testCase.tabSize, {})
		
		ASSERT_EQUALS(getDocumentText(document), testCase.expected)
	END FOR
END FUNCTION

FUNCTION testContentPreservation()
	// Test cases for content preservation
	testCases = [
		{
			name: "Preserve string literals",
			input: '    function test() {\n        return "    indented string";\n    }',
			tabSize: 4,
			expected: '\tfunction test() {\n\t\treturn "    indented string";\n\t}'
		},
		{
			name: "Preserve comment indentation",
			input: "    function test() {\n        // This is a comment with    spaces\n        return true;\n    }",
			tabSize: 4,
			expected: "\tfunction test() {\n\t\t// This is a comment with    spaces\n\t\treturn true;\n\t}"
		},
		{
			name: "Preserve regex literals",
			input: "    function test() {\n        const regex = /^    [a-z]+$/;\n        return regex;\n    }",
			tabSize: 4,
			expected: "\tfunction test() {\n\t\tconst regex = /^    [a-z]+$/;\n\t\treturn regex;\n\t}"
		}
	]
	
	// Run test cases
	FOR EACH testCase IN testCases
		document = createMockDocument(testCase.input)
		contentPreserver = new ContentPreserver()
		
		result = contentPreserver.preserveContent(document, (doc) => {
			converter = new SpaceToTabConverter(testCase.tabSize)
			return converter.convert(doc)
		})
		
		ASSERT_EQUALS(getDocumentText(result), testCase.expected)
	END FOR
END FUNCTION
```

### Integration Testing

Integration tests should verify the interaction between different components of the extension:

```
FUNCTION testCommandExecution()
	// Mock VS Code environment
	mockVSCode = createMockVSCodeEnvironment()
	
	// Create test document
	document = createTestDocument("    function test() {\n        return true;\n    }")
	
	// Register commands
	extension = activateExtension(mockVSCode.extensionContext)
	
	// Execute command
	mockVSCode.commands.executeCommand("tabber.convertSpacesToTabs")
	
	// Verify result
	ASSERT_EQUALS(
		getDocumentText(mockVSCode.window.activeTextEditor.document),
		"\tfunction test() {\n\t\treturn true;\n\t}"
	)
	
	// Verify notifications
	ASSERT_TRUE(mockVSCode.window.showInformationMessage.calledWith("Converted 3 lines, replaced 12 spaces with tabs"))
END FUNCTION

FUNCTION testConfigurationHandling()
	// Mock VS Code environment with custom configuration
	config = {
		"tabber.tabSize": 2,
		"tabber.formatOnSave": true,
		"tabber.excludedLanguages": ["markdown"],
		"editor.tabSize": 4
	}
	
	mockVSCode = createMockVSCodeEnvironment(config)
	
	// Create test documents
	jsDocument = createTestDocument("  function test() {\n    return true;\n  }", "javascript")
	mdDocument = createTestDocument("  # Heading\n  Text", "markdown")
	
	// Activate extension
	extension = activateExtension(mockVSCode.extensionContext)
	
	// Set JS document as active
	mockVSCode.window.activeTextEditor.document = jsDocument
	
	// Execute command
	mockVSCode.commands.executeCommand("tabber.convertSpacesToTabs")
	
	// Verify JS document was converted with tab size 2
	ASSERT_EQUALS(
		getDocumentText(jsDocument),
		"\tfunction test() {\n\t\treturn true;\n\t}"
	)
	
	// Set MD document as active
	mockVSCode.window.activeTextEditor.document = mdDocument
	
	// Execute command
	mockVSCode.commands.executeCommand("tabber.convertSpacesToTabs")
	
	// Verify MD document was not converted (excluded language)
	ASSERT_EQUALS(
		getDocumentText(mdDocument),
		"  # Heading\n  Text"
	)
	
	// Verify proper message was shown
	ASSERT_TRUE(mockVSCode.window.showInformationMessage.calledWith(
		"Tabber: Skipping file due to excluded language (markdown)"
	))
END FUNCTION
```

### End-to-End Testing

End-to-end tests should verify the extension works correctly in a real VS Code environment:

```
FUNCTION testEndToEnd()
	// These tests would be run in a real VS Code environment
	// using the VS Code Extension Testing API
	
	// Use real test files of different types
	files = [
		"test-files/javascript.js",
		"test-files/typescript.ts",
		"test-files/python.py",
		"test-files/html.html",
		"test-files/markdown.md",
		"test-files/large-file.js"
	]
	
	// For each file:
	// 1. Open the file
	// 2. Execute the command
	// 3. Verify the file was converted correctly
	// 4. Verify the status bar shows the correct information
	// 5. Test undo/redo functionality
	
	// Test format-on-save functionality
	// Test keyboard shortcuts
	// Test with different VS Code settings
END FUNCTION
```

## Test Matrix

The following matrix outlines the different dimensions that should be tested:

| Dimension | Test Cases |
|-----------|------------|
| File Size | Small (<10KB), Medium (10KB-1MB), Large (>1MB) |
| Languages | JavaScript, TypeScript, Python, HTML, CSS, JSON, Markdown, etc. |
| Indentation Types | Spaces only, Tabs only, Mixed, Empty file |
| Tab Sizes | 2, 3, 4, 8 |
| Special Content | String literals, Comments, Regex, Template literals |
| VS Code Settings | Different tab/space settings, Language-specific settings |
| Commands | All extension commands with different inputs |
| Events | Document open, save, format, etc. |

## Performance Testing

Performance should be tested with files of increasing size:

```
FUNCTION testPerformance()
	// Generate test files of different sizes
	smallFile = generateTestFile(100) // 100 lines
	mediumFile = generateTestFile(10000) // 10,000 lines
	largeFile = generateTestFile(100000) // 100,000 lines
	
	// Measure conversion time for each file
	smallTime = measureExecutionTime(() => {
		convertSpacesToTabs(createMockDocument(smallFile), 4, {})
	})
	
	mediumTime = measureExecutionTime(() => {
		convertSpacesToTabs(createMockDocument(mediumFile), 4, {})
	})
	
	largeTime = measureExecutionTime(() => {
		convertSpacesToTabs(createMockDocument(largeFile), 4, {})
	})
	
	// Verify performance meets requirements
	ASSERT_LESS_THAN(smallTime, 100) // milliseconds
	ASSERT_LESS_THAN(mediumTime, 1000) // milliseconds
	ASSERT_LESS_THAN(largeTime, 10000) // milliseconds
	
	// Test memory usage during large file processing
	memoryUsage = measureMemoryUsage(() => {
		convertSpacesToTabs(createMockDocument(largeFile), 4, {})
	})
	
	// Verify memory usage is reasonable
	ASSERT_LESS_THAN(memoryUsage, 100) // MB
END FUNCTION
```

## User Acceptance Testing

The following scenarios should be tested manually to ensure a good user experience:

1. **First-time user experience**
   - Install extension
   - Open different file types
   - Use commands from palette
   - Use keyboard shortcuts

2. **Configuration experience**
   - Change settings
   - Verify settings are applied
   - Test language-specific settings

3. **Integration with other extensions**
   - Test with formatter extensions
   - Test with linter extensions
   - Test with other indentation-related extensions

4. **Error handling**
   - Test with corrupted files
   - Test with read-only files
   - Test with unsupported file types

## Testing Checklist

Before releasing:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] End-to-end tests pass
- [ ] Performance tests meet requirements
- [ ] User acceptance testing completed
- [ ] Tested on all supported platforms (Windows, Mac, Linux)
- [ ] Tested with different VS Code themes
- [ ] Tested with different VS Code settings
- [ ] Tested with different file encodings
- [ ] Verified that the extension doesn't conflict with other extensions

## Continuous Integration

The extension should be set up with continuous integration to automatically run tests on each commit:

- Use GitHub Actions or Azure Pipelines
- Run unit tests and integration tests
- Run linting
- Check for security vulnerabilities
- Verify package size
- Generate test coverage report