import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { createSubject, uploadNote, getAllSubjects, getAllNotes, deleteNote } from '../api';

function Admin() {
    const [subjects, setSubjects] = useState([]);
    const [notes, setNotes] = useState([]);
    const [newSubject, setNewSubject] = useState({ name: '', semester: 1 });
    const [uploadData, setUploadData] = useState({ file: null, subjectId: '' });
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ isUploading: false, message: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchAllSubjects();
        fetchAllNotes();
    }, []);

    const fetchAllSubjects = async () => {
        try {
            const data = await getAllSubjects();
            setSubjects(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchAllNotes = async () => {
        try {
            const data = await getAllNotes();
            setNotes(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newSubject.name) {
            setError('Please enter subject name');
            return;
        }

        setLoading(true);
        try {
            await createSubject(newSubject.name, parseInt(newSubject.semester));
            setSuccess('Subject created successfully!');
            setNewSubject({ name: '', semester: 1 });
            fetchAllSubjects();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];

            if (!allowedTypes.includes(file.type)) {
                setError('Only PDF, DOCX, and PPT files are allowed');
                e.target.value = '';
                return;
            }

            setUploadData({ ...uploadData, file });
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!uploadData.file || !uploadData.subjectId) {
            setError('Please select a file and subject');
            return;
        }

        setLoading(true);
        setUploadProgress({ isUploading: true, message: 'Uploading file...' });

        try {
            // Simulate progress stages
            setTimeout(() => {
                if (uploadProgress.isUploading) {
                    setUploadProgress({ isUploading: true, message: 'Processing document...' });
                }
            }, 1000);

            setTimeout(() => {
                if (uploadProgress.isUploading) {
                    setUploadProgress({ isUploading: true, message: 'Generating embeddings...' });
                }
            }, 2000);

            const result = await uploadNote(uploadData.file, uploadData.subjectId);

            setUploadProgress({ isUploading: false, message: '' });
            setSuccess(`Note uploaded successfully! ${result.chunks_created} chunks created.`);
            setUploadData({ file: null, subjectId: '' });
            fetchAllNotes(); // Refresh notes list
            // Reset file input
            document.getElementById('file-input').value = '';
        } catch (err) {
            setUploadProgress({ isUploading: false, message: '' });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteNote = async (noteId, filename) => {
        if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await deleteNote(noteId);
            setSuccess('Note deleted successfully!');
            fetchAllNotes(); // Refresh notes list
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Navbar />
            <div className="container">
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Create Subject */}
                <div className="card">
                    <h2>Create Subject</h2>
                    <form onSubmit={handleCreateSubject}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Subject Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newSubject.name}
                                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                    placeholder="e.g., Data Structures"
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select
                                    className="form-select"
                                    value={newSubject.semester}
                                    onChange={(e) => setNewSubject({ ...newSubject, semester: e.target.value })}
                                    disabled={loading}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                        <option key={sem} value={sem}>
                                            Semester {sem}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Subject'}
                        </button>
                    </form>
                </div>

                {/* Upload Notes */}
                <div className="card">
                    <h2>Upload Note</h2>

                    {/* Upload Progress Indicator */}
                    {uploadProgress.isUploading && (
                        <div style={{
                            padding: '16px',
                            background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div className="spinner" style={{ margin: 0 }}></div>
                            <div>
                                <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                                    {uploadProgress.message}
                                </div>
                                <div style={{ fontSize: '13px', color: '#3b82f6' }}>
                                    Please wait while we process your document...
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleUpload}>
                        <div className="form-group">
                            <label className="form-label">Select Subject</label>
                            <select
                                className="form-select"
                                value={uploadData.subjectId}
                                onChange={(e) => setUploadData({ ...uploadData, subjectId: e.target.value })}
                                disabled={loading}
                            >
                                <option value="">-- Select Subject --</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name} (Semester {subject.semester})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Upload File (PDF/DOCX/PPT)</label>
                            <input
                                id="file-input"
                                type="file"
                                className="form-input"
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                            {uploadData.file && (
                                <div style={{ marginTop: '8px', fontSize: '14px', color: '#059669' }}>
                                    ✓ Selected: {uploadData.file.name}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Processing...' : 'Upload Note'}
                        </button>
                    </form>
                </div>

                {/* Subjects List */}
                <div className="card">
                    <h2>All Subjects</h2>
                    {subjects.length === 0 ? (
                        <p style={{ color: '#6b7280', marginTop: '12px' }}>
                            No subjects created yet
                        </p>
                    ) : (
                        <div className="grid grid-2 mt-2">
                            {subjects.map((subject) => (
                                <div key={subject.id} className="card" style={{ margin: 0 }}>
                                    <h3>{subject.name}</h3>
                                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                        Semester {subject.semester}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Uploaded Notes */}
                <div className="card">
                    <h2>Uploaded Notes</h2>
                    {notes.length === 0 ? (
                        <p style={{ color: '#6b7280', marginTop: '12px' }}>
                            No notes uploaded yet
                        </p>
                    ) : (
                        <div style={{ marginTop: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 8px', fontWeight: '600' }}>Filename</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '600' }}>Subject</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '600' }}>Uploaded At</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '600' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notes.map((note) => (
                                        <tr key={note.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '12px 8px' }}>{note.filename}</td>
                                            <td style={{ padding: '12px 8px' }}>{note.subject_name}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                {new Date(note.uploaded_at).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <button
                                                    className="btn"
                                                    style={{
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        padding: '6px 12px',
                                                        fontSize: '14px'
                                                    }}
                                                    onClick={() => handleDeleteNote(note.id, note.filename)}
                                                    disabled={loading}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Admin;
