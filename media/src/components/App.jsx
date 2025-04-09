import React, { useState, useEffect } from 'react';
import FileItem from './FileItem';
import ConfirmationDialog from './ConfirmationDialog';
import IndentationStats from './IndentationStats';

// Get VS Code API
const vscode = acquireVsCodeApi();

const App = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [results, setResults] = useState(null);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [stats, setStats] = useState(null);
	
	useEffect(() => {
		// Listen for messages from the extension
		const messageListener = (event) => {
			const message = event.data;
			
			switch (message.command) {
				case 'updateAnalysisResults':
					setResults(message.results);
					setStats(message.stats);
					setIsLoading(false);
					break;
				default:
					console.log('Unknown command:', message.command);
			}
		};
		
		window.addEventListener('message', messageListener);
		
		// Clean up event listener
		return () => {
			window.removeEventListener('message', messageListener);
		};
	}, []);
	
	// Handle analyze workspace button click
	const handleAnalyzeClick = () => {
		setIsLoading(true);
		vscode.postMessage({
			command: 'analyzeWorkspace'
		});
	};
	
	// Handle fix all button click
	const handleFixAllClick = () => {
		if (results && results.files.length > 0) {
			setShowConfirmation(true);
		}
	};
	
	// Handle fix confirmation
	const handleFixConfirm = () => {
		setShowConfirmation(false);
		
		// Get all file paths
		const filePaths = results.files.map(file => file.path);
		
		// Send fix all command
		vscode.postMessage({
			command: 'fixAll',
			filePaths
		});
	};
	
	// Handle fix confirmation dialog cancel
	const handleFixCancel = () => {
		setShowConfirmation(false);
	};
	
	// Handle fix single file
	const handleFixFile = (filePath) => {
		vscode.postMessage({
			command: 'fixFile',
			filePath
		});
	};
	
	// Handle opening a file
	const handleOpenFile = (filePath, lineNumber) => {
		vscode.postMessage({
			command: 'openFile',
			filePath,
			lineNumber
		});
	};
	
	return (
		<div className="container">
			<div className="header">
				<h1>Tabber: Indentation Analysis</h1>
				<div className="actions">
					<button onClick={handleAnalyzeClick} disabled={isLoading}>
						{isLoading ? 'Analyzing...' : 'Analyze Workspace'}
					</button>
					{results && results.files.length > 0 && (
						<button onClick={handleFixAllClick}>Fix All Issues</button>
					)}
				</div>
			</div>
			
			{isLoading ? (
				<div className="loader">
					<div className="loader-spinner"></div>
					<p>Analyzing workspace files...</p>
				</div>
			) : (
				<div className="content">
					{stats && <IndentationStats stats={stats} />}
					{results ? (
						results.files.length > 0 ? (
							<div className="file-list">
								{results.files.map(file => (
									<FileItem
										key={file.path}
										file={file}
										onFixFile={handleFixFile}
										onOpenFile={handleOpenFile}
									/>
								))}
							</div>
						) : (
							<div className="empty-state">
								<p>No indentation issues found in the workspace.</p>
							</div>
						)
					) : (
						<div className="empty-state">
							<p>Click "Analyze Workspace" to scan for files with space indentation.</p>
						</div>
					)}
				</div>
			)}
			
			<ConfirmationDialog
				isOpen={showConfirmation}
				title="Fix All Indentation Issues"
				message={`Are you sure you want to convert spaces to tabs in ${results?.files.length || 0} files? This action cannot be undone.`}
				onConfirm={handleFixConfirm}
				onCancel={handleFixCancel}
			/>
		</div>
	);
};

export default App;