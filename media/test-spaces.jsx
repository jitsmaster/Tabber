import React from 'react';

function TestComponent() {
	// This line uses spaces for indentation
	const [state, setState] = React.useState(null);
	
	// This function also uses spaces
	function handleClick() {
		setState(!state);
		console.log('State changed');
	}
	
	return (
		<div>
			<h1>Test Component</h1>
			<button onClick={handleClick}>
				Click me
			</button>
		</div>
	);
}

export default TestComponent;