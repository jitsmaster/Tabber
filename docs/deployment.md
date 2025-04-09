# Tabber Deployment Guide

This document provides detailed information about deploying the Tabber VS Code extension to various environments.

## Prerequisites

Before deploying Tabber, ensure you have the following installed:

- **Node.js** (version 14 or higher)
- **npm** (usually comes with Node.js)
- **VS Code Extension Manager (vsce)**: Install using `npm install -g @vscode/vsce`
- **Git** (optional, but recommended for version management)

## Deployment Options

Tabber provides several deployment options through its deployment scripts:

### 1. Package Only

This option packages the extension into a VSIX file without installing or publishing it.

```bash
# Using npm script
npm run package

# Using direct script execution
node ./scripts/deploy.js --package

# Using platform-specific scripts
./scripts/deploy.sh --package    # Unix
scripts\deploy.cmd --package     # Windows
```

The packaged VSIX file will be created in the project root directory, named `tabber-[version].vsix`.

### 2. Local Installation

This option packages the extension and installs it to your local VS Code installation.

```bash
# Using npm script
npm run install:local

# Using direct script execution
node ./scripts/deploy.js --install

# Using platform-specific scripts
./scripts/deploy.sh --install    # Unix
scripts\deploy.cmd --install     # Windows
```

If a previous version is installed, it will be automatically uninstalled first.

### 3. Marketplace Publishing

This option publishes the extension to the VS Code Marketplace.

```bash
# Using npm script with Personal Access Token
npm run publish -- --token YOUR_PAT

# Bump version and publish
npm run publish -- --bump patch --token YOUR_PAT
```

#### Personal Access Token (PAT)

To publish to the VS Code Marketplace, you need a Personal Access Token:

1. Sign in to [Azure DevOps](https://dev.azure.com/)
2. Create a new organization or use an existing one
3. Go to User settings > Personal access tokens
4. Click "New Token"
5. Give it a name and set the organization to "All accessible organizations"
6. Set the expiration as desired
7. For scopes, select "Marketplace > Manage"
8. Click "Create" and copy the token

**Security Note:** Never commit your PAT to source control. Use environment variables or pass it via command line only when needed.

## Validation Checks

Before deployment, it's recommended to run validation checks:

```bash
npm run validate
```

This performs the following checks:
- Validates package.json content
- Ensures all required files exist
- Runs linting
- Runs tests
- Verifies the extension compiles successfully

To skip tests during validation:

```bash
node ./scripts/deploy.js --skip-tests
```

## Version Bumping

The deployment script can automatically bump the extension version:

```bash
# Bump patch version (0.1.0 -> 0.1.1)
npm run deploy -- --bump patch

# Bump minor version (0.1.0 -> 0.2.0)
npm run deploy -- --bump minor

# Bump major version (0.1.0 -> 1.0.0)
npm run deploy -- --bump major
```

Version bumping updates the version in package.json.

## Configuration

The deployment configuration is stored in `scripts/deploy.config.js`. This file contains settings for:

- Output directory for packaged extensions
- Required VS Code version
- Categories for marketplace
- Required files for validation
- Commands to run during validation
- Marketplace configuration

Modify this file to customize the deployment process.

## Complete Command Line Reference

```
Options:
  --help, -h          Show help
  --package, -p       Package the extension only
  --install, -i       Package and install locally
  --publish, -P       Publish to VS Code Marketplace
  --bump TYPE         Bump version (patch|minor|major)
  --skip-tests        Skip running tests
  --skip-validation   Skip validation checks
  --token TOKEN       Marketplace PAT (Personal Access Token)
```

## Marketplace Publishing Checklist

Before publishing to the Marketplace, ensure:

1. **README.md** is up-to-date and provides clear documentation
2. **CHANGELOG.md** documents all significant changes in the new version
3. **package.json** has:
   - Accurate metadata (name, displayName, description, version)
   - Valid extension categories
   - Proper activation events
   - Correct publisher ID
4. All extension functionality has been tested
5. The extension icon and other visual assets are present
6. License information is correct and up-to-date

## Troubleshooting

### Common Deployment Issues

**Issue:** VSCE command not found  
**Solution:** Install vsce using `npm install -g @vscode/vsce`

**Issue:** Authentication failed during publishing  
**Solution:** Verify your Personal Access Token (PAT) has the correct scopes (Marketplace > Manage)

**Issue:** Version conflict during publishing  
**Solution:** Ensure you're publishing a new version. Use `--bump` to increment the version

**Issue:** Packaging fails due to untracked files  
**Solution:** Use `.vscodeignore` to exclude files that shouldn't be included in the package

**Issue:** Local installation fails  
**Solution:** Ensure VS Code is closed or try running VS Code with administrator privileges

## Continuous Integration

For CI/CD pipelines, you can use the deployment script with environment variables:

```bash
# Example GitHub Actions step
- name: Publish Extension
  run: node ./scripts/deploy.js --publish --token ${{ secrets.VSCE_PAT }}
```

This allows you to automate the deployment process in your CI/CD workflow.