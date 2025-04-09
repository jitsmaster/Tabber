#!/bin/bash
#
# Tabber VS Code Extension Deployment Script (Unix)
# 
# This is a Unix shell wrapper around the Node.js deployment script.
# It provides an executable alternative for developers who prefer shell scripts.
#
# Usage: ./deploy.sh [options]
# Run ./deploy.sh --help for more information.
#

# Move to the project root directory
cd "$(dirname "$0")/.." || exit 1

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
	echo "Error: Node.js is not installed or not in PATH"
	echo "Please install Node.js from https://nodejs.org/"
	exit 1
fi

# Run the deployment script with all provided arguments
node ./scripts/deploy.js "$@"