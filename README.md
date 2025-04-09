# Tabber

A VS Code extension that converts space indentation to 4-space tabs and formats documents according to standard formatting rules.

![Tabber Logo](images/tabber-logo.png)

## Features

- **Space to Tab Conversion**: Convert all indentation from spaces to tabs with configurable tab size
- **Smart Document Formatting**: Format documents according to standard formatting rules
- **Content Preservation**: Intelligently preserve content in strings, comments, and regular expressions
- **Status Bar Integration**: Shows indentation type and issues in the status bar for quick visibility
- **Format on Save Option**: Automatically convert spaces to tabs when saving documents
- **Indentation Analysis**: Analyze document indentation patterns to identify inconsistencies
- **Customizable Configuration**: Adjust tab size, language settings, and other behaviors

![Tabber in Action](images/tabber-demo.gif)

## Installation

There are multiple ways to install the Tabber extension:

### From VS Code Marketplace

1. Open VS Code
2. Click on the Extensions view icon on the Sidebar or press `Ctrl+Shift+X`
3. Search for "Tabber"
4. Click **Install**

### From VSIX File

If you have a `.vsix` file:

1. Open VS Code
2. Open the Command Palette (`Ctrl+Shift+P` or `F1`)
3. Type "Install from VSIX" and select the command
4. Navigate to the `.vsix` file and select it

### Using Command Line

```bash
code --install-extension tabber-0.1.0.vsix
```

## Usage

### Commands

Tabber provides several commands that you can access through the Command Palette (`Ctrl+Shift+P` or `F1`):

- **Tabber: Convert Spaces to Tabs** - Convert all indentation in the current document from spaces to tabs
- **Tabber: Format Document and Convert to Tabs** - Format the document and convert indentation to tabs
- **Tabber: Analyze Document Indentation** - Analyze and display information about the current document's indentation
- **Tabber: Configure Extension Settings** - Open extension settings

### Keyboard Shortcuts

For quick access, Tabber provides the following keyboard shortcuts:

- `Ctrl+Alt+T` (`Cmd+Alt+T` on Mac) - Convert spaces to tabs
- `Ctrl+Alt+Shift+T` (`Cmd+Alt+Shift+T` on Mac) - Format document and convert to tabs

### Status Bar Indicator

Tabber adds an indicator to the status bar that shows the current document's indentation style:

- **Tabs** - Document uses tabs for indentation
- **Spaces** - Document uses spaces for indentation
- **Mixed Indentation** - Document uses a mix of tabs and spaces (with warning icon)

Click on the status bar item to analyze the document's indentation in detail.

![Status Bar Examples](images/status-bar-examples.png)

## Extension Settings

Tabber can be customized through the following settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `tabber.tabSize` | Number | `4` | Number of spaces that equal one tab |
| `tabber.formatOnSave` | Boolean | `false` | Automatically convert spaces to tabs when saving a document |
| `tabber.excludedLanguages` | Array | `["markdown", "plaintext"]` | Languages that should be excluded from automatic conversion |
| `tabber.includeLanguagesOnly` | Array | `[]` | If set, only these languages will be processed (overrides excludedLanguages) |
| `tabber.respectVSCodeSettings` | Boolean | `true` | Respect VS Code's language-specific tab/space settings |
| `tabber.preserveIndentationInEmptyLines` | Boolean | `true` | Preserve whitespace in empty lines |
| `tabber.analyzeOnOpen` | Boolean | `false` | Analyze document indentation when opening a file |

You can modify these settings in one of the following ways:

1. Open the Command Palette (`Ctrl+Shift+P`) and search for "Preferences: Open Settings (UI)"
2. Navigate to File > Preferences > Settings
3. Use the "Tabber: Configure Extension Settings" command

Example `settings.json` configuration:

```json
{
    "tabber.tabSize": 2,
    "tabber.formatOnSave": true,
    "tabber.excludedLanguages": [
        "markdown",
        "plaintext",
        "yaml"
    ],
    "tabber.analyzeOnOpen": true
}
```

## How It Works

Tabber uses a sophisticated algorithm to analyze and convert space-based indentation to tabs:

1. **Analysis Phase**: When processing a document, Tabber first analyzes the existing indentation pattern
2. **Content Preservation**: Special content like strings, comments, and regular expressions are preserved
3. **Conversion Phase**: Spaces are converted to tabs based on your tab size configuration
4. **Formatting**: Optional formatting is applied using VS Code's native formatting capabilities

This process ensures that your code maintains its structure while achieving consistent tab-based indentation.

## Troubleshooting

### Common Issues

**Issue**: Indentation isn't being converted in certain files.  
**Solution**: Check if the file's language is in the excluded languages list or if you have the `includeLanguagesOnly` setting configured.

**Issue**: Mixed indentation warning persists after conversion.  
**Solution**: There might be spaces used for alignment within lines. Run "Analyze Document Indentation" to see detailed information.

**Issue**: Format on save isn't working.  
**Solution**: Verify that `tabber.formatOnSave` is set to `true` and the file language isn't excluded.

### Reporting Problems

If you encounter any issues not covered here, please report them on our [GitHub Issues page](https://github.com/yourusername/tabber/issues).

## Building from Source

To build and run the extension from source:

```bash
git clone https://github.com/yourusername/tabber.git
cd tabber
npm install
npm run compile
```

To start debugging the extension, press `F5` in VS Code with the project open.

## Deployment

Tabber includes cross-platform deployment scripts to help package and publish the extension.

### Packaging the Extension

To create a VSIX package:

```bash
# Using npm script
npm run package

# Using direct script execution
node ./scripts/deploy.js --package

# Or using platform-specific wrapper scripts
./scripts/deploy.sh --package    # Unix
scripts\deploy.cmd --package     # Windows
```

### Installing Locally

To package and install the extension to your local VS Code:

```bash
npm run install:local
```

### Publishing to Marketplace

To publish to the VS Code Marketplace:

```bash
# You'll need a Personal Access Token (PAT)
npm run publish -- --token YOUR_PAT

# Bump version and publish
npm run publish -- --bump patch --token YOUR_PAT
```

### Validation Checks

To run validation checks before deployment:

```bash
npm run validate
```

### Command Line Options

The deployment script provides several options:

```
--help, -h          Show help
--package, -p       Package the extension only
--install, -i       Package and install locally
--publish, -P       Publish to VS Code Marketplace
--bump TYPE         Bump version (patch|minor|major)
--skip-tests        Skip running tests
--skip-validation   Skip validation checks
--token TOKEN       Marketplace PAT (Personal Access Token)
```

## License

This extension is released under the MIT License. See the [LICENSE](LICENSE) file for details.