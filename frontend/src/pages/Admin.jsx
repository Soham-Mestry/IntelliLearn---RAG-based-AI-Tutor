import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { createSubject, uploadNote, getAllSubjects } from '../api';

function Admin() {
    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState({ name: '', semester: 1 });
    const [uploadData, setUploadData] = useState({ file: null, subjectId: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchAllSubjects();
    }, []);

    const fetchAllSubjects = async () => {
        try {
            const data = await getAllSubjects();
            setSubjects(data);
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
        try {
            const result = await uploadNote(uploadData.file, uploadData.subjectId);
            setSuccess(`Note uploaded successfully! ${result.chunks_created} chunks created.`);
            setUploadData({ file: null, subjectId: '' });
            // Reset file input
            document.getElementById('file-input').value = '';
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
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Uploading...' : 'Upload Note'}
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
            </div>
        </div>
    );
}

export default Admin;
