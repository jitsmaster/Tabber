# Tabber Extension Architecture

## System Overview

Tabber is a VS Code extension designed to convert space indentation to tab indentation while providing standard document formatting. This document outlines the high-level architecture and component relationships.

## Component Architecture

```
┌───────────────────────────────────────────────────────────┐
│                   Tabber Extension                         │
├───────────┬─────────────────┬───────────────┬─────────────┤
│ Commands  │ Core Algorithms │ Configuration │   UI        │
│           │                 │   Service     │ Components  │
└───────────┴─────────────────┴───────────────┴─────────────┘
      │             │                 │              │
      ▼             ▼                 ▼              ▼
┌───────────┐ ┌─────────────────┐ ┌───────────┐ ┌─────────────┐
│ Command   │ │ Indentation     │ │ Settings  │ │ Status Bar  │
│ Handlers  │ │ Processors      │ │ Manager   │ │ Integration │
└───────────┘ └─────────────────┘ └───────────┘ └─────────────┘
      │             │                 │              │
      └─────────────┼─────────────────┼──────────────┘
                    ▼                 ▼
           ┌─────────────────┐ ┌───────────────────┐
           │ VS Code API     │ │ Document          │
           │ Integration     │ │ Formatters        │
           └─────────────────┘ └───────────────────┘
                    │                  │
                    └──────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Text Document     │
                  │ Processing        │
                  └───────────────────┘
```

## Core Modules

### 1. Extension Entry Point (`extension.ts`)

```
FUNCTION activate(context)
	// Initialize services
	configurationService = new ConfigurationService()
	statusBarService = new StatusBarService(context)
	formatterService = new FormatterService(configurationService)
	
	// Register components
	registerCommands(context, configurationService, statusBarService, formatterService)
	registerEventHandlers(context, configurationService, formatterService)
	
	// Register formatter providers
	registerFormatters(context, formatterService)
	
	// Log activation
	log("Tabber extension activated")
	
	// Return public API
	RETURN {
		convertSpacesToTabs: formatterService.convertSpacesToTabs.bind(formatterService),
		analyzeIndentation: formatterService.analyzeIndentation.bind(formatterService)
	}
END FUNCTION

FUNCTION deactivate()
	// Clean up resources
	disposeServices()
END FUNCTION
```

### 2. Configuration Service (`configuration-service.ts`)

```
CLASS ConfigurationService
	CONSTRUCTOR()
		// Initialize default configuration
		this.loadConfiguration()
		
		// Subscribe to configuration changes
		this.configChangeListener = workspace.onDidChangeConfiguration(this.handleConfigChange.bind(this))
	END CONSTRUCTOR
	
	FUNCTION loadConfiguration()
		// Load global configuration
		this.configuration = workspace.getConfiguration("tabber")
		
		// Cache common settings
		this.tabSize = this.configuration.get("tabSize") || 4
		this.formatOnSave = this.configuration.get("formatOnSave") || false
		this.excludedLanguages = this.configuration.get("excludedLanguages") || []
		this.includeLanguagesOnly = this.configuration.get("includeLanguagesOnly") || []
		this.respectVSCodeSettings = this.configuration.get("respectVSCodeSettings") || true
	END FUNCTION
	
	FUNCTION handleConfigChange(event)
		// Reload configuration if our settings changed
		IF event.affectsConfiguration("tabber")
			this.loadConfiguration()
			this.emitConfigurationChanged()
		END IF
	END FUNCTION
	
	FUNCTION getEffectiveTabSize(document)
		// Get correct tab size based on document and settings
		IF this.respectVSCodeSettings
			// Try to get language-specific tab size
			languageConfig = workspace.getConfiguration("[" + document.languageId + "]")
			editorConfig = languageConfig.get("editor")
			
			IF editorConfig && editorConfig.tabSize !== undefined
				RETURN editorConfig.tabSize
			END IF
			
			// Fall back to editor tab size
			editorTabSize = workspace.getConfiguration("editor").get("tabSize")
			IF editorTabSize !== undefined
				RETURN editorTabSize
			END IF
		END IF
		
		// Fall back to our configured tab size
		RETURN this.tabSize
	END FUNCTION
	
	FUNCTION shouldProcessFile(document)
		// Check if file should be processed based on language
		languageId = document.languageId
		
		// Check exclusion list
		IF this.excludedLanguages.includes(languageId)
			RETURN false
		END IF
		
		// Check inclusion list
		IF this.includeLanguagesOnly.length > 0
			RETURN this.includeLanguagesOnly.includes(languageId)
		END IF
		
		// Check VS Code settings for this language
		IF this.respectVSCodeSettings
			languageConfig = workspace.getConfiguration("[" + languageId + "]")
			editorConfig = languageConfig.get("editor")
			
			IF editorConfig && editorConfig.insertSpaces === true
				// Language explicitly configured to use spaces
				RETURN false
			END IF
		END IF
		
		RETURN true
	END FUNCTION
	
	FUNCTION dispose()
		// Clean up
		IF this.configChangeListener
			this.configChangeListener.dispose()
		END IF
	END FUNCTION
END CLASS
```

### 3. Formatter Service (`formatter-service.ts`)

```
CLASS FormatterService
	CONSTRUCTOR(configService)
		this.configService = configService
		this.indentationDetector = new IndentationDetector()
		this.contentPreserver = new ContentPreserver()
	END CONSTRUCTOR
	
	FUNCTION convertSpacesToTabs(document, options)
		// Check if we should process this file
		IF !this.configService.shouldProcessFile(document)
			RETURN { linesConverted: 0, spacesReplaced: 0 }
		END IF
		
		// Get effective tab size
		tabSize = (options && options.tabSize) || 
				  this.configService.getEffectiveTabSize(document)
		
		// Preserve sensitive content (strings, comments, etc.)
		RETURN this.contentPreserver.preserveContent(document, (processedDoc) => {
			// Perform the actual conversion
			converter = new SpaceToTabConverter(tabSize)
			RETURN converter.convert(processedDoc)
		})
	END FUNCTION
	
	FUNCTION formatDocument(document, options)
		// Try to use VS Code's formatting
		formattingOptions = {
			tabSize: (options && options.tabSize) || this.configService.getEffectiveTabSize(document),
			insertSpaces: false,
			...options
		}
		
		// Get document formatter for this language
		formatter = this.getDocumentFormatter(document.languageId)
		
		// Format with vs code formatter if available
		IF formatter
			edits = formatter.provideDocumentFormattingEdits(document, formattingOptions)
			RETURN this.applyEdits(document, edits)
		END IF
		
		// Fall back to basic formatting
		RETURN this.basicFormat(document, formattingOptions)
	END FUNCTION
	
	FUNCTION analyzeIndentation(document)
		RETURN this.indentationDetector.detectIndentation(document)
	END FUNCTION
	
	FUNCTION getDocumentFormatter(languageId)
		// Get formatter for language
		// This delegates to VS Code's formatter infrastructure
		RETURN languages.getDocumentFormattingProvider(document)
	END FUNCTION
	
	FUNCTION basicFormat(document, options)
		// Basic formatting rules when no VS Code formatter is available
		// ...implementation details...
	END FUNCTION
	
	FUNCTION applyEdits(document, edits)
		// Apply text edits to document
		// ...implementation details...
	END FUNCTION
END CLASS
```

### 4. Indentation Processor (`indentation-processor.ts`)

```
CLASS IndentationDetector
	FUNCTION detectIndentation(document)
		// Scan document to determine indentation patterns
		spaceIndentationLevels = {}
		tabIndentationPresent = false
		mixedIndentationLines = []
		
		// Process each line
		FOR lineIndex = 0 TO document.lineCount - 1
			line = document.lineAt(lineIndex).text
			
			// Skip empty lines
			IF line.trim() === ""
				CONTINUE
			END IF
			
			// Extract leading whitespace
			leadingWhitespace = this.extractLeadingWhitespace(line)
			
			// Analyze the whitespace
			IF leadingWhitespace.includes("\t")
				tabIndentationPresent = true
				
				IF leadingWhitespace.match(/^ +|\t+ +/)
					// Mixed tabs and spaces
					mixedIndentationLines.push(lineIndex)
				END IF
			ELSE IF leadingWhitespace.length > 0
				// Count spaces
				spaceCount = leadingWhitespace.length
				
				// Track frequency of this space count
				spaceIndentationLevels[spaceCount] = (spaceIndentationLevels[spaceCount] || 0) + 1
			END IF
		END FOR
		
		// Find most common space indentation level
		dominantSpaceLevel = this.findMostFrequentLevel(spaceIndentationLevels)
		
		RETURN {
			hasTabs: tabIndentationPresent,
			dominantSpaceLevel: dominantSpaceLevel,
			mixedIndentationLines: mixedIndentationLines,
			spaceFrequencyMap: spaceIndentationLevels
		}
	END FUNCTION
	
	FUNCTION extractLeadingWhitespace(line)
		match = line.match(/^[ \t]*/)
		RETURN match ? match[0] : ""
	END FUNCTION
	
	FUNCTION findMostFrequentLevel(levels)
		maxFrequency = 0
		dominantLevel = 4  // Default fallback
		
		FOR EACH level, frequency IN levels
			IF frequency > maxFrequency
				maxFrequency = frequency
				dominantLevel = parseInt(level)
			END IF
		END FOR
		
		RETURN dominantLevel
	END FUNCTION
END CLASS

CLASS SpaceToTabConverter
	CONSTRUCTOR(tabSize)
		this.tabSize = tabSize || 4
	END CONSTRUCTOR
	
	FUNCTION convert(document)
		edits = []
		linesConverted = 0
		spacesReplaced = 0
		
		// Process each line
		FOR lineIndex = 0 TO document.lineCount - 1
			lineText = document.lineAt(lineIndex).text
			
			// Extract leading whitespace
			leadingWhitespace = this.extractLeadingWhitespace(lineText)
			
			// Only process if there are spaces to convert
			IF leadingWhitespace.includes(" ")
				// Create new indentation with tabs
				newIndentation = this.createTabIndentation(leadingWhitespace)
				
				// Only create an edit if the indentation changed
				IF newIndentation !== leadingWhitespace
					// Create edit to replace the indentation
					range = new Range(
						new Position(lineIndex, 0),
						new Position(lineIndex, leadingWhitespace.length)
					)
					
					edits.push(TextEdit.replace(range, newIndentation))
					linesConverted++
					spacesReplaced += this.countSpacesReplaced(leadingWhitespace, newIndentation)
				END IF
			END IF
		END FOR
		
		RETURN {
			edits: edits,
			linesConverted: linesConverted,
			spacesReplaced: spacesReplaced
		}
	END FUNCTION
	
	FUNCTION createTabIndentation(leadingWhitespace)
		// Handle different types of indentation
		IF !leadingWhitespace.includes("\t")
			// Pure space indentation - convert to tabs
			spaceCount = leadingWhitespace.length
			tabCount = Math.floor(spaceCount / this.tabSize)
			remainingSpaces = spaceCount % this.tabSize
			
			RETURN "\t".repeat(tabCount) + " ".repeat(remainingSpaces)
		ELSE
			// Mixed indentation - more complex handling
			// ...complex mixed indentation handling...
			// Convert spaces at the beginning and between tabs
			
			// This is a simplified version - actual implementation would be more complex
			normalizedIndentation = this.normalizeMixedIndentation(leadingWhitespace)
			RETURN normalizedIndentation
		END IF
	END FUNCTION
	
	FUNCTION normalizeMixedIndentation(indentation)
		// Convert tabs to spaces then spaces to tabs to normalize
		allSpaces = indentation.replace(/\t/g, " ".repeat(this.tabSize))
		spaceCount = allSpaces.length
		
		tabCount = Math.floor(spaceCount / this.tabSize)
		remainingSpaces = spaceCount % this.tabSize
		
		RETURN "\t".repeat(tabCount) + " ".repeat(remainingSpaces)
	END FUNCTION
	
	FUNCTION countSpacesReplaced(oldIndentation, newIndentation)
		oldSpaceCount = (oldIndentation.match(/ /g) || []).length
		newSpaceCount = (newIndentation.match(/ /g) || []).length
		
		RETURN oldSpaceCount - newSpaceCount
	END FUNCTION
	
	FUNCTION extractLeadingWhitespace(line)
		match = line.match(/^[ \t]*/)
		RETURN match ? match[0] : ""
	END FUNCTION
END CLASS
```

### 5. Content Preserver (`content-preserver.ts`)

```
CLASS ContentPreserver
	FUNCTION preserveContent(document, processor)
		// Identify sensitive ranges that should be preserved
		sensitiveRanges = this.identifySensitiveRanges(document)
		
		// Replace sensitive content with placeholders
		documentWithPlaceholders = this.replaceSensitiveContent(document, sensitiveRanges)
		
		// Process the document with the provided processor function
		processingResult = processor(documentWithPlaceholders)
		
		// Restore original sensitive content
		resultDocument = this.restoreSensitiveContent(processingResult, sensitiveRanges)
		
		RETURN resultDocument
	END FUNCTION
	
	FUNCTION identifySensitiveRanges(document)
		ranges = []
		
		// Find string literals
		stringRanges = this.findStringLiterals(document)
		ranges.push(...stringRanges)
		
		// Find comments
		commentRanges = this.findComments(document)
		ranges.push(...commentRanges)
		
		// Find regex literals
		regexRanges = this.findRegexLiterals(document)
		ranges.push(...regexRanges)
		
		// Other language-specific sensitive content
		languageSpecificRanges = this.findLanguageSpecificRanges(document)
		ranges.push(...languageSpecificRanges)
		
		RETURN ranges
	END FUNCTION
	
	FUNCTION findStringLiterals(document)
		// Language-specific string literal detection
		// ...
	END FUNCTION
	
	FUNCTION findComments(document)
		// Language-specific comment detection
		// ...
	END FUNCTION
	
	FUNCTION findRegexLiterals(document)
		// Detect regex literals in appropriate languages
		// ...
	END FUNCTION
	
	FUNCTION findLanguageSpecificRanges(document)
		// Handle special cases by language
		// ...
	END FUNCTION
	
	FUNCTION replaceSensitiveContent(document, ranges)
		// Replace sensitive ranges with placeholders
		// ...
	END FUNCTION
	
	FUNCTION restoreSensitiveContent(processingResult, originalRanges)
		// Restore original content from placeholders
		// ...
	END FUNCTION
END CLASS
```

### 6. Commands Module (`commands.ts`)

```
FUNCTION registerCommands(context, configService, statusBarService, formatterService)
	// Register all extension commands
	
	// Convert spaces to tabs command
	context.subscriptions.push(
		commands.registerCommand("tabber.convertSpacesToTabs", () => {
			editor = window.activeTextEditor
			IF !editor
				window.showErrorMessage("Tabber: No active text editor found")
				RETURN
			END IF
			
			// Show progress indicator
			window.withProgress(
				{
					location: ProgressLocation.Notification,
					title: "Converting spaces to tabs...",
					cancellable: true
				},
				(progress, token) => {
					document = editor.document
					result = formatterService.convertSpacesToTabs(document)
					
					IF result.linesConverted > 0
						window.showInformationMessage(
							`Tabber: Converted ${result.linesConverted} lines, ` +
							`replaced ${result.spacesReplaced} spaces with tabs`
						)
					ELSE
						window.showInformationMessage(
							"Tabber: No changes needed - document already uses tabs for indentation"
						)
					END IF
					
					// Update progress
					progress.report({ increment: 100 })
					
					// Return promise that resolves when done
					RETURN Promise.resolve()
				}
			)
		})
	)
	
	// Format and convert command
	context.subscriptions.push(
		commands.registerCommand("tabber.formatAndConvert", () => {
			// Format document and convert indentation
			// ...similar to above with formatting step
		})
	)
	
	// Analyze indentation command
	context.subscriptions.push(
		commands.registerCommand("tabber.analyzeIndentation", () => {
			// Analyze document indentation and show report
			// ...
		})
	)
	
	// Configure settings command
	context.subscriptions.push(
		commands.registerCommand("tabber.configureSettings", () => {
			// Open settings UI
			commands.executeCommand("workbench.action.openSettings", "tabber")
		})
	)
END FUNCTION
```

### 7. Event Handlers (`event-handlers.ts`)

```
FUNCTION registerEventHandlers(context, configService, formatterService)
	// Register document save handler for format-on-save feature
	IF configService.formatOnSave
		context.subscriptions.push(
			workspace.onDidSaveTextDocument((document) => {
				// Only process if format on save is enabled
				IF configService.formatOnSave && configService.shouldProcessFile(document)
					// Convert spaces to tabs after save
					formatterService.convertSpacesToTabs(document)
				END IF
			})
		)
	END IF
	
	// Register document open handler
	context.subscriptions.push(
		workspace.onDidOpenTextDocument((document) => {
			// Check if we should analyze on open
			IF configService.analyzeOnOpen && configService.shouldProcessFile(document)
				// Analyze indentation and show notification if mixed
				indentationInfo = formatterService.analyzeIndentation(document)
				
				IF indentationInfo.mixedIndentationLines.length > 0
					// Show mixed indentation warning
					window.showWarningMessage(
						"Tabber: This document contains mixed indentation. " +
						"Run 'Convert Spaces to Tabs' to fix."
					)
				END IF
			END IF
		})
	)
END FUNCTION
```

### 8. Status Bar Service (`status-bar-service.ts`)

```
CLASS StatusBarService
	CONSTRUCTOR(context)
		// Create status bar item
		this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100)
		this.statusBarItem.command = "tabber.analyzeIndentation"
		this.statusBarItem.tooltip = "Analyze document indentation"
		
		// Register with context for disposal
		context.subscriptions.push(this.statusBarItem)
		
		// Set up editor change listener
		context.subscriptions.push(
			window.onDidChangeActiveTextEditor(this.updateStatusBar.bind(this))
		)
		
		// Set up document change listener
		context.subscriptions.push(
			workspace.onDidChangeTextDocument(this.handleDocumentChange.bind(this))
		)
		
		// Initial update
		this.updateStatusBar(window.activeTextEditor)
	END CONSTRUCTOR
	
	FUNCTION updateStatusBar(editor)
		IF !editor
			this.statusBarItem.hide()
			RETURN
		END IF
		
		// Get document
		document = editor.document
		
		// Only show for text documents
		IF document.uri.scheme !== "file" || document.uri.scheme !== "untitled"
			this.statusBarItem.hide()
			RETURN
		END IF
		
		// Analyze indentation
		indentationInfo = formatterService.analyzeIndentation(document)
		
		// Update status bar text based on indentation
		IF indentationInfo.hasTabs
			IF indentationInfo.mixedIndentationLines.length > 0
				this.statusBarItem.text = "$(warning) Mixed Indentation"
				this.statusBarItem.backgroundColor = new ThemeColor("statusBarItem.warningBackground")
			ELSE
				this.statusBarItem.text = "$(list-ordered) Tabs"
				this.statusBarItem.backgroundColor = undefined
			END IF
		ELSE
			this.statusBarItem.text = "$(list-ordered) Spaces"
			this.statusBarItem.backgroundColor = undefined
		END IF
		
		this.statusBarItem.show()
	END FUNCTION
	
	FUNCTION handleDocumentChange(event)
		// Only update if active editor's document changed
		editor = window.activeTextEditor
		
		IF editor && event.document === editor.document
			this.updateStatusBar(editor)
		END IF
	END FUNCTION
	
	FUNCTION dispose()
		IF this.statusBarItem
			this.statusBarItem.dispose()
		END IF
	END FUNCTION
END CLASS
```

## Data Flow

The following diagram illustrates the data flow during the space-to-tab conversion process:

```
┌─────────────┐       ┌───────────────────┐       ┌────────────────────┐
│  Document   │───┬──▶│ Indentation       │───────▶ Content            │
│  from       │   │   │ Detection         │       │ Preservation       │
│  VS Code    │   │   └───────────────────┘       └────────────────────┘
└─────────────┘   │                                        │
                  │                                        ▼
┌─────────────┐   │   ┌───────────────────┐       ┌────────────────────┐
│ User        │   └──▶│ Configuration     │───────▶ Space-to-Tab       │
│ Settings    │       │ Resolution        │       │ Conversion         │
└─────────────┘       └───────────────────┘       └────────────────────┘
                                                           │
┌─────────────┐                                            ▼
│ VS Code     │                            ┌────────────────────┐
│ Formatting  │───────────────────────────▶│ Document           │
│ Providers   │                            │ Update             │
└─────────────┘                            └────────────────────┘
                                                    │
                                                    ▼
                                           ┌────────────────────┐
                                           │ Status Bar         │
                                           │ Update             │
                                           └────────────────────┘
```

## Implementation Roadmap

The recommended implementation sequence is:

1. **Phase 1: Core Functionality**
   - Basic extension setup and command registration
   - Indentation detection algorithm
   - Simple space-to-tab conversion
   - Initial configuration options

2. **Phase 2: Enhanced Features**
   - Content preservation for strings, comments, etc.
   - VS Code formatter integration
   - Status bar integration
   - Language-specific handling

3. **Phase 3: Refinement**
   - Performance optimization for large files
   - Additional edge case handling
   - User interface improvements
   - Comprehensive testing

## Testing Strategy

The testing approach should include:

1. **Unit Tests**
   - Test individual algorithms and functions
   - Mock VS Code API for isolation
   - Test various indentation patterns
   - Test content preservation

2. **Integration Tests**
   - Test interaction between components
   - Test configuration handling
   - Test VS Code API integration

3. **End-to-End Tests**
   - Test full functionality with real documents
   - Test across different file types
   - Test performance with large files

4. **Manual Testing Checklist**
   - Verify keyboard shortcuts
   - Verify status bar updates
   - Test with various VS Code themes
   - Test with other extensions enabled/disabled

## TDD Anchors

### Component Tests
- Verify component initialization and cleanup
- Test component interaction and data flow
- Verify event handling between components

### Integration Tests
- Test VS Code command registration and execution
- Test configuration loading and application
- Test status bar updates and interactions

### End-to-End Tests
- Test full conversion workflow with different file types
- Verify formatting integration with VS Code
- Test performance with progressively larger files