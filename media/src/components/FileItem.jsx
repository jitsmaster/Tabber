import React from 'react';

const FileItem = ({ file, onFixFile, onOpenFile }) => {
	return (
		<div className="file-item">
			<div className="file-item-header">
				<h3 className="file-path" onClick={() => onOpenFile(file.path, file.issues[0].lineNumber)}>
					{file.path}
				</h3>
				<button 
					className="fix-button"
					onClick={() => onFixFile(file.path)}
					title="Convert spaces to tabs in this file"
				>
					Fix
				</button>
			</div>
			<div className="issues-list">
				<ul>
					{file.issues.map((issue, index) => (
						<li 
							key={`${file.path}-${issue.lineNumber}-${index}`}
							onClick={() => onOpenFile(file.path, issue.lineNumber)}
							className="issue-item"
						>
							Line {issue.lineNumber}: {issue.message}
						</li>
					))}
				</ul>
				<div className="issue-summary">
					{file.issues.length} {file.issues.length === 1 ? 'issue' : 'issues'} found
				</div>
			</div>
		</div>
	);
};

export default FileItem;