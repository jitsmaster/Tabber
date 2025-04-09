import React from 'react';

const IndentationStats = ({ stats }) => {
	if (!stats) return null;
	
	const { 
		totalFiles, 
		filesWithSpaces, 
		filesWithTabs, 
		filesWithMixed,
		totalLinesAnalyzed,
		spaceIndentedLines,
		tabIndentedLines,
		mixedIndentationLines
	} = stats;
	
	// Calculate percentages for visualization
	const spacePercentage = Math.round((spaceIndentedLines / totalLinesAnalyzed) * 100) || 0;
	const tabPercentage = Math.round((tabIndentedLines / totalLinesAnalyzed) * 100) || 0;
	const mixedPercentage = Math.round((mixedIndentationLines / totalLinesAnalyzed) * 100) || 0;
	
	return (
		<div className="stats-container">
			<h2>Workspace Indentation Statistics</h2>
			
			<div className="stats-summary">
				<div className="stat-item">
					<span className="stat-value">{totalFiles}</span>
					<span className="stat-label">Total Files</span>
				</div>
				<div className="stat-item">
					<span className="stat-value">{filesWithSpaces}</span>
					<span className="stat-label">Files with Spaces</span>
				</div>
				<div className="stat-item">
					<span className="stat-value">{filesWithMixed}</span>
					<span className="stat-label">Files with Mixed Indentation</span>
				</div>
			</div>
			
			<div className="indentation-bars">
				<h3>Indentation Distribution</h3>
				<div className="bar-container">
					<div className="bar-label">Tabs:</div>
					<div className="bar-wrapper">
						<div 
							className="bar tab-bar" 
							style={{ width: `${tabPercentage}%` }} 
						/>
						<span className="bar-percentage">
							{tabIndentedLines} lines ({tabPercentage}%)
						</span>
					</div>
				</div>
				<div className="bar-container">
					<div className="bar-label">Spaces:</div>
					<div className="bar-wrapper">
						<div 
							className="bar space-bar" 
							style={{ width: `${spacePercentage}%` }} 
						/>
						<span className="bar-percentage">
							{spaceIndentedLines} lines ({spacePercentage}%)
						</span>
					</div>
				</div>
				<div className="bar-container">
					<div className="bar-label">Mixed:</div>
					<div className="bar-wrapper">
						<div 
							className="bar mixed-bar" 
							style={{ width: `${mixedPercentage}%` }} 
						/>
						<span className="bar-percentage">
							{mixedIndentationLines} lines ({mixedPercentage}%)
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default IndentationStats;