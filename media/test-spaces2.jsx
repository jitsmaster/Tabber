import React from 'react';

function AnotherTestComponent() {
	// This component uses spaces for indentation
	const [count, setCount] = React.useState(0);
    
	// This handler also uses spaces
	function handleIncrement() {
		setCount(prevCount => prevCount + 1);
		console.log('Count incremented');
	}
    
	// More space-indented code
	return (
		<div className="test-component">
			<h2>Counter: {count}</h2>
			<button onClick={handleIncrement}>
				Increment
			</button>
		</div>
	);
}

export default AnotherTestComponent;