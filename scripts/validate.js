/**
 * Tabber VS Code Extension Validation Script
 * 
 * This script performs validation checks on the extension
 * before packaging or publishing it to the marketplace.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./deploy.config');

/**
 * Validate package.json for required fields
 * @returns {Object} - Validation results
 */
function validatePackageJson() {
	console.log('🔍 Validating package.json...');
	const results = { success: true, errors: [], warnings: [] };
	
	try {
		// Read package.json
		const packageJsonPath = path.resolve(process.cwd(), 'package.json');
		if (!fs.existsSync(packageJsonPath)) {
			results.errors.push('package.json not found');
			results.success = false;
			return results;
		}
		
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		
		// Required fields
		const requiredFields = [
			'name',
			'displayName',
			'description',
			'version',
			'publisher',
			'engines',
			'categories',
			'activationEvents',
			'main',
			'contributes'
		];
		
		// Check each required field
		for (const field of requiredFields) {
			if (!packageJson[field]) {
				results.errors.push(`Missing required field: ${field}`);
				results.success = false;
			}
		}
		
		// Check VS Code version compatibility
		if (packageJson.engines && packageJson.engines.vscode) {
			const vscodeVersion = packageJson.engines.vscode;
			// Simple version compatibility check
			if (!vscodeVersion.startsWith('^') && !vscodeVersion.startsWith('>=')) {
				results.warnings.push(`VS Code version "${vscodeVersion}" might be too restrictive. Consider using "^" or ">=" prefix.`);
			}
		}
		
		// Check for repository field
		if (!packageJson.repository) {
			results.warnings.push('Missing repository field in package.json');
		}
		
		// Check for license field
		if (!packageJson.license) {
			results.warnings.push('Missing license field in package.json');
		}
		
		// Check for keywords
		if (!packageJson.keywords || packageJson.keywords.length === 0) {
			results.warnings.push('Missing or empty keywords in package.json');
		}
		
		console.log('✅ package.json validation completed.');
		return results;
	} catch (error) {
		results.errors.push(`Error validating package.json: ${error.message}`);
		results.success = false;
		return results;
	}
}

/**
 * Check for required files
 * @returns {Object} - Validation results
 */
function checkRequiredFiles() {
	console.log('🔍 Checking required files...');
	const results = { success: true, errors: [], warnings: [] };
	
	try {
		const requiredFiles = config.validation.requiredFiles || [];
		
		for (const file of requiredFiles) {
			const filePath = path.resolve(process.cwd(), file);
			if (!fs.existsSync(filePath)) {
				results.errors.push(`Required file not found: ${file}`);
				results.success = false;
			}
		}
		
		// Check for README.md
		const readmePath = path.resolve(process.cwd(), 'README.md');
		if (!fs.existsSync(readmePath)) {
			results.errors.push('README.md not found');
			results.success = false;
		} else {
			// Check README.md content length
			const readmeContent = fs.readFileSync(readmePath, 'utf8');
			if (readmeContent.length < 500) {
				results.warnings.push('README.md seems too short. Consider adding more information.');
			}
		}
		
		// Check for CHANGELOG.md
		const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
		if (!fs.existsSync(changelogPath)) {
			results.warnings.push('CHANGELOG.md not found');
		}
		
		// Check for LICENSE file
		const licensePath = path.resolve(process.cwd(), 'LICENSE');
		if (!fs.existsSync(licensePath)) {
			results.warnings.push('LICENSE file not found');
		}
		
		console.log('✅ Required files check completed.');
		return results;
	} catch (error) {
		results.errors.push(`Error checking required files: ${error.message}`);
		results.success = false;
		return results;
	}
}

/**
 * Run linting
 * @returns {Object} - Validation results
 */
function runLint() {
	console.log('🔍 Running linter...');
	const results = { success: true, errors: [], warnings: [] };
	
	try {
		const lintCommand = config.validation.commands.lint || 'npm run lint';
		execSync(lintCommand, { stdio: 'inherit' });
		console.log('✅ Linting completed.');
		return results;
	} catch (error) {
		results.errors.push(`Linting failed: ${error.message}`);
		results.success = false;
		return results;
	}
}

/**
 * Run tests
 * @param {boolean} skipTests - Whether to skip tests
 * @returns {Object} - Validation results
 */
function runTests(skipTests) {
	if (skipTests) {
		console.log('⏩ Skipping tests...');
		return { success: true, errors: [], warnings: ['Tests skipped'] };
	}
	
	console.log('🔍 Running tests...');
	const results = { success: true, errors: [], warnings: [] };
	
	try {
		const testCommand = config.validation.commands.test || 'npm test';
		execSync(testCommand, { stdio: 'inherit' });
		console.log('✅ Tests completed.');
		return results;
	} catch (error) {
		results.errors.push(`Tests failed: ${error.message}`);
		results.success = false;
		return results;
	}
}

/**
 * Compile the extension
 * @returns {Object} - Validation results
 */
function compile() {
	console.log('🔍 Compiling extension...');
	const results = { success: true, errors: [], warnings: [] };
	
	try {
		const compileCommand = config.validation.commands.compile || 'npm run compile';
		execSync(compileCommand, { stdio: 'inherit' });
		console.log('✅ Compilation completed.');
		return results;
	} catch (error) {
		results.errors.push(`Compilation failed: ${error.message}`);
		results.success = false;
		return results;
	}
}

/**
 * Run all validation checks
 * @param {Object} options - Validation options
 * @returns {Object} - Validation results
 */
function validateAll(options = {}) {
	const skipTests = options.skipTests || false;
	const results = {
		success: true,
		errors: [],
		warnings: []
	};
	
	console.log('🔍 Running all validation checks...');
	
	// Validate package.json
	const packageJsonResults = validatePackageJson();
	results.errors = [...results.errors, ...packageJsonResults.errors];
	results.warnings = [...results.warnings, ...packageJsonResults.warnings];
	results.success = results.success && packageJsonResults.success;
	
	// Check required files
	const requiredFilesResults = checkRequiredFiles();
	results.errors = [...results.errors, ...requiredFilesResults.errors];
	results.warnings = [...results.warnings, ...requiredFilesResults.warnings];
	results.success = results.success && requiredFilesResults.success;
	
	// Run linting
	const lintResults = runLint();
	results.errors = [...results.errors, ...lintResults.errors];
	results.warnings = [...results.warnings, ...lintResults.warnings];
	results.success = results.success && lintResults.success;
	
	// Run tests
	const testResults = runTests(skipTests);
	results.errors = [...results.errors, ...testResults.errors];
	results.warnings = [...results.warnings, ...testResults.warnings];
	results.success = results.success && testResults.success;
	
	// Compile
	const compileResults = compile();
	results.errors = [...results.errors, ...compileResults.errors];
	results.warnings = [...results.warnings, ...compileResults.warnings];
	results.success = results.success && compileResults.success;
	
	// Print validation summary
	console.log('\n📋 Validation Summary:');
	if (results.success) {
		console.log('✅ All critical validation checks passed.');
	} else {
		console.log('❌ Some validation checks failed.');
	}
	
	if (results.errors.length > 0) {
		console.log('\n❌ Errors:');
		results.errors.forEach(error => console.log(` - ${error}`));
	}
	
	if (results.warnings.length > 0) {
		console.log('\n⚠️ Warnings:');
		results.warnings.forEach(warning => console.log(` - ${warning}`));
	}
	
	return results;
}

// Export functions for use in deploy.js
module.exports = {
	validatePackageJson,
	checkRequiredFiles,
	runLint,
	runTests,
	compile,
	validateAll
};

// If this script is run directly
if (require.main === module) {
	const results = validateAll();
	process.exit(results.success ? 0 : 1);
}