import { useState, useRef } from 'react';
import { createStudentQuery } from '../api';

function CreateQueryModal({ onClose, onQueryCreated }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim() || !description.trim()) {
            setError('Title and description are required.');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (file) {
            formData.append('image', file);
        }

        try {
            await createStudentQuery(formData);
            onQueryCreated();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create query');
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content query-modal">
                <div className="modal-header">
                    <h2>Ask a New Query</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="query-form">
                    {error && <div className="alert alert-error">{error}</div>}
                    
                    <div className="form-group">
                        <label>Title <span className="required">*</span></label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Briefly summarize your question"
                            className="input-field"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Description <span className="required">*</span></label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide details about your query..."
                            className="input-field textarea-field"
                            rows="5"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Image Attachment (Optional)</label>
                        <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => setFile(e.target.files[0])}
                            accept=".jpg,.jpeg,.png,.gif,.webp"
                            className="input-field"
                        />
                        <small className="file-help">Supported formats: JPG, PNG, GIF, WEBP</small>
                    </div>
                    
                    <div className="modal-actions">
                        <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Posting...' : 'Post Query'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateQueryModal;
