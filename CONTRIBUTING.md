# Contributing to Tabber

Thank you for your interest in contributing to Tabber! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or later)
- [Visual Studio Code](https://code.visualstudio.com/) (v1.60.0 or later)
- [Git](https://git-scm.com/)

### Setting Up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tabber.git
   cd tabber
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Open the project in VS Code:
   ```bash
   code .
   ```

5. Build the extension:
   ```bash
   npm run compile
   ```

6. Press `F5` to launch a new VS Code window with the extension loaded

### Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them
3. Use the watch mode during development to automatically compile changes:
   ```bash
   npm run watch
   ```

## Project Structure

The Tabber extension follows a modular architecture with these main components:

```
tabber/
├── .vscode/          - VS Code settings for the project
├── src/              - Source code
│   ├── extension.ts  - Extension entry point
│   ├── processors/   - Core indentation processing algorithms
│   ├── services/     - Supporting services
│   ├── utils/        - Utility functions
│   └── test/         - Test files
├── specs/            - Specifications and design documents
└── package.json      - Extension manifest
```

### Core Components

The extension is organized into several core components:

1. **Extension Entry Point** (`extension.ts`): Handles activation and registration of commands and services
2. **Configuration Service** (`services/configuration-service.ts`): Manages user settings and preferences
3. **Tabber Service** (`services/tabber-service.ts`): Orchestrates the conversion and formatting operations
4. **Indentation Processors**:
   - `processors/indentation-analyzer.ts`: Analyzes document indentation patterns
   - `processors/space-to-tab-converter.ts`: Converts spaces to tabs
   - `processors/content-preserver.ts`: Preserves special content like strings and comments
5. **Utility Functions** (`utils/indentation-utils.ts`): Helper functions for indentation operations

## Coding Guidelines

### General Principles

- **Readability First**: Write clear, readable code with meaningful variable and function names
- **Modularity**: Keep classes and functions small and focused on a single responsibility
- **Error Handling**: Provide useful error messages and handle edge cases gracefully
- **Performance**: Be mindful of performance, especially when processing large files

### TypeScript Guidelines

- Use TypeScript's type system to ensure type safety
- Define interfaces for all complex objects
- Use async/await for asynchronous operations
- Prefer `const` over `let` when variables won't be reassigned
- Use meaningful variable names that describe the purpose

### Style Guidelines

- Use tabs for indentation (4-space equivalent)
- Follow the existing code style for consistency
- Use camelCase for variables and functions, PascalCase for classes and interfaces
- Add JSDoc comments for public APIs

Example:

```typescript
/**
 * Converts spaces to tabs in the provided document
 * @param document The document to process
 * @param options Optional conversion options
 * @returns Statistics about the conversion
 */
function convertSpacesToTabs(document: TextDocument, options?: ConversionOptions): ConversionResult {
	// Implementation
}
```

## Testing

### Running Tests

Run all tests with:

```bash
npm test
```

### Writing Tests

- Create tests in the `src/test/suite` directory
- Name test files with `.test.ts` suffix
- Use descriptive test names that explain the expected behavior
- Create separate test files for each module
- Test both success and failure scenarios

Example test structure:

```typescript
describe('IndentationUtils', () => {
	describe('convertIndentation', () => {
		it('should convert 4 spaces to 1 tab', () => {
			// Test implementation
		});

		it('should handle mixed indentation correctly', () => {
			// Test implementation
		});

		it('should preserve non-indentation spaces', () => {
			// Test implementation
		});
	});
});
```

### Test Coverage

Aim for high test coverage, especially for the core conversion algorithms and utilities. At minimum, ensure:

- All public APIs have basic functionality tests
- Edge cases are tested
- Complex algorithms have comprehensive tests

## Submitting Changes

### Pull Request Process

1. Update your fork with the latest changes from the main repository
2. Make your changes on a feature branch
3. Run tests and ensure they pass: `npm test`
4. Run the linter to check for style issues: `npm run lint`
5. Commit your changes with a descriptive commit message
6. Push your changes to your fork
7. Create a pull request against the main repository

### Pull Request Guidelines

- Provide a clear description of the changes in your PR
- Reference any related issues using the GitHub issue reference (e.g., "Fixes #123")
- Include screenshots or animated GIFs for UI changes
- Make sure all checks pass (tests, linting, etc.)
- Keep PRs focused on a single issue or feature

### Code Review Process

Once you submit a PR:

1. Maintainers will review your code
2. They may request changes or clarification
3. Address all comments and requested changes
4. Once approved, a maintainer will merge your PR

## Release Process

### Version Numbering

Tabber follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Release Checklist

Before each release:

1. Update the version in `package.json`
2. Update the CHANGELOG.md file
3. Verify all tests pass
4. Test the extension in a clean VS Code environment
5. Create a GitHub release with release notes
6. Publish to the VS Code Marketplace

## Additional Resources

- [VS Code Extension API Documentation](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Mocha Testing Framework](https://mochajs.org/)

## Questions?

If you have any questions or need help, please:

- Open an issue on GitHub
- Reach out to the maintainers

Thank you for contributing to Tabber!