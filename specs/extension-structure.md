# Tabber Extension Structure Specification

## Command Structure

The Tabber extension will provide the following commands accessible through the command palette and keyboard shortcuts:

```
COMMANDS = [
	{
		id: "tabber.convertSpacesToTabs",
		title: "Tabber: Convert Spaces to Tabs",
		description: "Convert all space indentation in the current document to tabs",
		keybinding: {
			win: "ctrl+alt+t",
			mac: "cmd+alt+t",
			linux: "ctrl+alt+t",
			when: "editorTextFocus"
		}
	},
	{
		id: "tabber.formatAndConvert",
		title: "Tabber: Format Document and Convert to Tabs",
		description: "Format the document according to standard rules and convert indentation to tabs",
		keybinding: {
			win: "ctrl+alt+shift+t",
			mac: "cmd+alt+shift+t",
			linux: "ctrl+alt+shift+t",
			when: "editorTextFocus"
		}
	},
	{
		id: "tabber.analyzeIndentation",
		title: "Tabber: Analyze Document Indentation",
		description: "Analyze and display information about the document's current indentation",
		keybinding: null  // No default keybinding
	},
	{
		id: "tabber.configureSettings",
		title: "Tabber: Configure Extension Settings",
		description: "Open the settings UI for Tabber configuration",
		keybinding: null  // No default keybinding
	}
]
```

## Extension Activation

```
FUNCTION activate(context)
	// Register commands
	FOR EACH command IN COMMANDS
		registerCommand(command.id, createCommandHandler(command))
		
		// Register keybinding if specified
		IF command.keybinding
			registerKeybinding(command.id, command.keybinding)
		END IF
	END FOR
	
	// Register formatter
	registerDocumentFormattingEditProvider()
	
	// Register configuration change listener
	registerConfigurationChangeListener()
	
	// Setup status bar item
	createStatusBarItem()
	
	// Log activation
	log("Tabber extension activated")
END FUNCTION
```

## Command Handlers

```
FUNCTION handleConvertSpacesToTabs()
	// Get active editor
	editor = getActiveTextEditor()
	IF !editor
		showErrorMessage("No active editor found")
		RETURN
	END IF
	
	// Get document and configuration
	document = editor.document
	config = getConfiguration("tabber", document.uri)
	
	// Show progress notification
	showProgress("Converting spaces to tabs...", FUNCTION(progress)
		// Get tab size from configuration or editor settings
		tabSize = config.get("tabSize") || editor.options.tabSize || 4
		
		// Execute conversion
		result = convertSpacesToTabs(document, tabSize, editor.options)
		
		// Apply edits and update status
		IF result.linesConverted > 0
			showInformationMessage(`Converted ${result.linesConverted} lines, replaced ${result.spacesReplaced} spaces with tabs`)
		ELSE
			showInformationMessage("No changes needed - document already uses tabs for indentation")
		END IF
		
		// Update progress
		progress.report({ increment: 100 })
	END)
END FUNCTION

FUNCTION handleFormatAndConvert()
	// Get active editor
	editor = getActiveTextEditor()
	IF !editor
		showErrorMessage("No active editor found")
		RETURN
	END IF
	
	// Get document and configuration
	document = editor.document
	config = getConfiguration("tabber", document.uri)
	
	// Show progress notification
	showProgress("Formatting and converting to tabs...", FUNCTION(progress)
		// First format the document
		progress.report({ increment: 50, message: "Formatting document..." })
		formattingResult = formatDocument(document, {
			tabSize: config.get("tabSize") || editor.options.tabSize || 4,
			insertSpaces: false
		})
		
		// Then convert any remaining spaces to tabs
		progress.report({ increment: 50, message: "Converting to tabs..." })
		conversionResult = convertSpacesToTabs(document, tabSize, editor.options)
		
		// Show results
		showInformationMessage(`Document formatted and ${conversionResult.linesConverted} lines converted to tabs`)
	END)
END FUNCTION

FUNCTION handleAnalyzeIndentation()
	// Get active editor
	editor = getActiveTextEditor()
	IF !editor
		showErrorMessage("No active editor found")
		RETURN
	END IF
	
	// Get document
	document = editor.document
	
	// Analyze indentation
	indentationInfo = detectIndentation(document)
	
	// Display analysis in information message or notification
	showAnalysisReport(indentationInfo)
END FUNCTION

FUNCTION handleConfigureSettings()
	// Open settings UI with Tabber settings
	commands.executeCommand("workbench.action.openSettings", "tabber")
END FUNCTION
```

## VS Code API Requirements

The extension will utilize the following VS Code APIs:

### Core APIs

```
// Extension activation
vscode.ExtensionContext
vscode.commands.registerCommand()
vscode.window.registerTreeDataProvider()

// Editor access
vscode.window.activeTextEditor
vscode.TextEditor
vscode.TextDocument
vscode.Position
vscode.Range
vscode.Selection

// Document modification
vscode.TextEdit
vscode.WorkspaceEdit
vscode.TextEditor.edit()

// Document formatting
vscode.languages.registerDocumentFormattingEditProvider()
vscode.DocumentFormattingEditProvider
vscode.CancellationToken

// Configuration
vscode.workspace.getConfiguration()
vscode.ConfigurationChangeEvent
vscode.workspace.onDidChangeConfiguration()

// UI and notifications
vscode.window.showInformationMessage()
vscode.window.showErrorMessage()
vscode.window.showWarningMessage()
vscode.window.withProgress()
vscode.ProgressLocation
vscode.window.createStatusBarItem()
vscode.StatusBarItem
```

### Workspace Interaction

```
// File system access
vscode.workspace.fs
vscode.Uri
vscode.FileType

// Workspace settings
vscode.workspace.getConfiguration()
vscode.workspace.onDidChangeConfiguration()

// Editor settings
vscode.workspace.onDidChangeTextDocument()
vscode.workspace.onDidOpenTextDocument()
```

## Configuration Schema

The extension will provide the following configuration options:

```json
{
	"tabber.tabSize": {
		"type": "number",
		"default": 4,
		"description": "Number of spaces that equal one tab"
	},
	"tabber.formatOnSave": {
		"type": "boolean",
		"default": false,
		"description": "Automatically convert spaces to tabs when saving a document"
	},
	"tabber.excludedLanguages": {
		"type": "array",
		"default": ["markdown", "plaintext"],
		"description": "Languages that should be excluded from automatic conversion"
	},
	"tabber.includeLanguagesOnly": {
		"type": "array",
		"default": [],
		"description": "If set, only these languages will be processed (overrides excludedLanguages)"
	},
	"tabber.respectVSCodeSettings": {
		"type": "boolean",
		"default": true,
		"description": "Respect VS Code's language-specific tab/space settings"
	},
	"tabber.preserveIndentationInEmptyLines": {
		"type": "boolean",
		"default": true,
		"description": "Preserve whitespace in empty lines"
	}
}
```

## Extension Lifecycle

```
FUNCTION activate(context)
	// Register all commands, providers, and listeners
	// ...
	
	// Subscribe to text document events
	context.subscriptions.push(
		workspace.onDidSaveTextDocument(handleDocumentSave),
		workspace.onDidOpenTextDocument(handleDocumentOpen)
	)
	
	// Initialize status bar
	initializeStatusBar(context)
	
	RETURN {
		// Public API that can be used by other extensions
		convertSpacesToTabs: convertSpacesToTabs,
		analyzeIndentation: detectIndentation
	}
END FUNCTION

FUNCTION deactivate()
	// Clean up resources
	disposeStatusBar()
	
	// Log deactivation
	log("Tabber extension deactivated")
END FUNCTION
```

## TDD Anchors

### Command Registration Tests
- Verify all commands are registered correctly
- Verify keybindings are set up properly
- Test command availability in different contexts

### Command Execution Tests
- Test each command with various document types
- Verify proper error handling when no editor is active
- Test progress reporting functionality

### Configuration Tests
- Verify default configuration values
- Test configuration change handling
- Verify language-specific configuration overrides