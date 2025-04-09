# Tabber Webview UI

This directory contains the React-based UI for the Tabber VS Code extension.

## Structure

- `src/` - React source code
  - `components/` - React components
	- `App.jsx` - Main application component
	- `ConfirmationDialog.jsx` - Dialog for confirming actions
	- `FileItem.jsx` - Individual file item with indentation issues
  - `index.jsx` - React entry point
- `index.html` - HTML template
- `styles.css` - CSS styles
- `webpack.config.js` - Webpack configuration
- `package.json` - NPM dependencies

## Development

1. Install dependencies: `npm install`
2. Build the UI: `npm run build`
3. Watch for changes: `npm run watch`

## Communication Protocol

The webview communicates with the extension via the VS Code API:

### From Webview to Extension
- `analyzeWorkspace` - Triggers workspace analysis
- `fixAll` - Fixes all indentation issues
- `fixFile` - Fixes indentation in a specific file
- `openFile` - Opens a file at a specific line

### From Extension to Webview
- `updateAnalysisResults` - Updates analysis results