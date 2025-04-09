const ConfirmationDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
	if (!isOpen) {
		return null;
	}
	
	return (
		<div className="modal-overlay">
			<div className="modal">
				<div className="modal-header">
					<h2>{title}</h2>
				</div>
				<div className="modal-body">
					<p>{message}</p>
				</div>
				<div className="modal-footer">
					<button className="secondary" onClick={onCancel}>Cancel</button>
					<button onClick={onConfirm}>Confirm</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationDialog;