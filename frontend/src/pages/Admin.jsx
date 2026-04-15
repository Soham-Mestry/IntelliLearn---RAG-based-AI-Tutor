import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { createSubject, uploadNote, getAllSubjects, getAllNotes, deleteNote, deleteSubject, getAdminQueries, adminDeleteQuery, adminDeleteAnswer, getAdminReports, updateReportStatus } from '../api';

// Trash bin icon — defined outside Admin to avoid recreation on every render
const TrashIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

function Admin() {
    const [subjects, setSubjects] = useState([]);
    const [notes, setNotes] = useState([]);
    const [newSubject, setNewSubject] = useState({ name: '', semester: 1 });
    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjectSortOrder, setSubjectSortOrder] = useState('asc'); // 'asc' | 'desc' | 'none'
    const [notesSortOrder, setNotesSortOrder] = useState('asc'); // 'asc' | 'desc' | 'none'
    const [uploadData, setUploadData] = useState({ file: null, subjectId: '' });
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ isUploading: false, message: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Query management state
    const [queries, setQueries] = useState([]);
    const [expandedQueryId, setExpandedQueryId] = useState(null);
    const [querySearch, setQuerySearch] = useState('');
    const [queryStatusFilter, setQueryStatusFilter] = useState(null); // null = all, 'open', 'closed'

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        itemName: '',
        onConfirm: null,
    });

    // Report management state
    const [reports, setReports] = useState([]);
    const [reportFilter, setReportFilter] = useState('pending');
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        fetchAllSubjects();
        fetchAllNotes();
        fetchAllQueries();
        fetchAllReports();
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

    const fetchAllQueries = async () => {
        try {
            const data = await getAdminQueries(queryStatusFilter);
            setQueries(data);
        } catch (err) {
            // Silently fail — section will show empty
        }
    };

    // Refetch when status filter changes
    useEffect(() => {
        fetchAllQueries();
    }, [queryStatusFilter]);

    const fetchAllReports = async () => {
        setReportLoading(true);
        try {
            const data = await getAdminReports(reportFilter !== 'all' ? reportFilter : null);
            setReports(data);
        } catch (err) {
            // Silently fail
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        fetchAllReports();
    }, [reportFilter]);

    const handleReportAction = async (reportId, newStatus) => {
        try {
            await updateReportStatus(reportId, newStatus);
            setSuccess(`Report marked as ${newStatus}`);
            fetchAllReports();
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
            fetchAllNotes();
            document.getElementById('file-input').value = '';
        } catch (err) {
            setUploadProgress({ isUploading: false, message: '' });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Delete Handlers (using confirmation modal) ---

    const openDeleteModal = (title, message, itemName, onConfirm) => {
        setDeleteModal({ isOpen: true, title, message, itemName, onConfirm });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, title: '', message: '', itemName: '', onConfirm: null });
    };

    const handleDeleteNote = (noteId, filename) => {
        openDeleteModal(
            'Delete Material',
            'This will permanently remove this material and all its generated embeddings. This action cannot be undone.',
            filename,
            async () => {
                closeDeleteModal();
                setError('');
                setSuccess('');
                setLoading(true);
                try {
                    await deleteNote(noteId);
                    setSuccess('Note deleted successfully!');
                    fetchAllNotes();
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleDeleteSubject = (subjectId, subjectName) => {
        const relatedNotes = notes.filter(n => n.subject_name === subjectName);
        const noteCount = relatedNotes.length;

        openDeleteModal(
            'Delete Subject',
            `This will permanently delete this subject${noteCount > 0 ? `, its ${noteCount} uploaded material${noteCount > 1 ? 's' : ''}` : ''}, all associated embeddings, and chat history references. This action cannot be undone.`,
            subjectName,
            async () => {
                closeDeleteModal();
                setError('');
                setSuccess('');
                setLoading(true);
                try {
                    await deleteSubject(subjectId);
                    setSuccess(`Subject "${subjectName}" and all associated data deleted successfully!`);
                    fetchAllSubjects();
                    fetchAllNotes();
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    // --- Admin Query Delete Handlers ---

    const handleAdminDeleteQuery = (queryId, title) => {
        openDeleteModal(
            'Delete Query',
            'This will permanently delete this query and all its replies. This action cannot be undone.',
            title,
            async () => {
                closeDeleteModal();
                setError('');
                setSuccess('');
                setLoading(true);
                try {
                    await adminDeleteQuery(queryId);
                    setSuccess('Query deleted successfully!');
                    fetchAllQueries();
                    if (expandedQueryId === queryId) setExpandedQueryId(null);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleAdminDeleteAnswer = (queryId, answerId, previewText) => {
        openDeleteModal(
            'Delete Reply',
            'This will permanently delete this reply. This action cannot be undone.',
            previewText.length > 60 ? previewText.substring(0, 60) + '…' : previewText,
            async () => {
                closeDeleteModal();
                setError('');
                setSuccess('');
                setLoading(true);
                try {
                    await adminDeleteAnswer(queryId, answerId);
                    setSuccess('Reply deleted successfully!');
                    fetchAllQueries();
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const filteredQueries = queries.filter(q => {
        const search = querySearch.toLowerCase();
        return (
            q.title.toLowerCase().includes(search) ||
            q.user_name.toLowerCase().includes(search) ||
            q.description.toLowerCase().includes(search) ||
            (q.answers && q.answers.some(a =>
                a.answer_text.toLowerCase().includes(search) ||
                a.user_name.toLowerCase().includes(search)
            ))
        );
    });

    // Filtered + sorted subjects
    const filteredSortedSubjects = subjects
        .filter(s => {
            const search = subjectSearch.toLowerCase();
            if (!search) return true;
            return (
                s.name.toLowerCase().includes(search) ||
                String(s.semester).includes(search)
            );
        })
        .sort((a, b) => {
            if (subjectSortOrder === 'asc') return a.semester - b.semester;
            if (subjectSortOrder === 'desc') return b.semester - a.semester;
            return 0;
        });

    // Helper: get semester for a note by its subject_name
    const getNoteSemester = (note) => {
        const subj = subjects.find(s => s.name === note.subject_name);
        return subj ? subj.semester : 999;
    };

    // Sorted notes
    const sortedNotes = [...notes].sort((a, b) => {
        if (notesSortOrder === 'asc') return getNoteSemester(a) - getNoteSemester(b);
        if (notesSortOrder === 'desc') return getNoteSemester(b) - getNoteSemester(a);
        return 0;
    });

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--surface-alt)' }}>
            <Navbar />
            
            {/* ========== DELETE CONFIRMATION MODAL ========== */}
            {deleteModal.isOpen && (
                <div
                    id="delete-confirm-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(6px)',
                        animation: 'fadeIn 0.2s ease',
                    }}
                    onClick={(e) => { if (e.target.id === 'delete-confirm-overlay') closeDeleteModal(); }}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '0',
                        width: '100%',
                        maxWidth: '420px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                        animation: 'slideUp 0.25s ease',
                        overflow: 'hidden',
                    }}>
                        {/* Red danger header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            padding: '24px 28px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                        }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '22px',
                                flexShrink: 0,
                            }}>
                                ⚠️
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 700 }}>
                                    {deleteModal.title}
                                </h3>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>
                                    Permanent action
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px 28px' }}>
                            <div style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}>
                                <span style={{ fontSize: '20px' }}>📄</span>
                                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '14px', wordBreak: 'break-word' }}>
                                    {deleteModal.itemName}
                                </span>
                            </div>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
                                {deleteModal.message}
                            </p>
                        </div>

                        {/* Footer actions */}
                        <div style={{
                            padding: '16px 28px 24px',
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end',
                        }}>
                            <button
                                onClick={closeDeleteModal}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'white',
                                    color: 'var(--text-main)',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.target.style.background = 'var(--surface-alt)'; }}
                                onMouseLeave={(e) => { e.target.style.background = 'white'; }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteModal.onConfirm}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(239,68,68,0.45)'; }}
                                onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)'; }}
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODAL ANIMATIONS ========== */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .subject-card-admin:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: var(--shadow-md) !important;
                }
                .subject-card-admin .subject-delete-btn {
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .subject-card-admin:hover .subject-delete-btn {
                    opacity: 1;
                }
                .query-card-admin {
                    transition: all 0.2s ease;
                    border: 1px solid var(--border);
                }
                .query-card-admin:hover {
                    border-color: rgba(99, 102, 241, 0.3);
                    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.08);
                }
                .reply-card-admin {
                    transition: all 0.15s ease;
                }
                .reply-card-admin:hover {
                    background: #f8fafc !important;
                }
                .query-delete-btn-hover:hover {
                    background: #fee2e2 !important;
                    border-color: #fca5a5 !important;
                }
                /* Styled scrollbars for admin sections */
                .admin-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .admin-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 10px;
                }
                .admin-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                    transition: background 0.2s;
                }
                .admin-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .admin-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }
                /* Sort button active state */
                .sort-btn-active {
                    background: linear-gradient(135deg, var(--secondary), var(--secondary-hover)) !important;
                    color: white !important;
                    border-color: transparent !important;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25) !important;
                }
            `}</style>

            <div className="container animate-fade-in" style={{ padding: '0 24px 40px', maxWidth: '800px' }}>
                
                {/* Admin Header Section */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--surface) 0%, var(--primary-light) 100%)',
                    borderRadius: '20px',
                    padding: '32px 40px',
                    marginBottom: '24px',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary-hover)', margin: 0, letterSpacing: '-0.02em' }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0, maxWidth: '600px', lineHeight: 1.5 }}>
                        Manage your platform's subjects, upload new learning material, and oversee educational resources seamlessly.
                    </p>
                </div>

                {/* Sticky Sub-navigation */}
                <div style={{
                    position: 'sticky',
                    top: '70px',
                    zIndex: 40,
                    background: 'var(--surface)',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    marginBottom: '32px',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}>
                    <button onClick={() => scrollToSection('create-subject')} className="btn btn-outline btn-small" style={{ borderRadius: '20px', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '12px' }}>Create Subject</button>
                    <button onClick={() => scrollToSection('upload-material')} className="btn btn-outline btn-small" style={{ borderRadius: '20px', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '12px' }}>Upload Material</button>
                    <button onClick={() => scrollToSection('active-subjects')} className="btn btn-outline btn-small" style={{ borderRadius: '20px', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '12px' }}>Subjects</button>
                    <button onClick={() => scrollToSection('recent-materials')} className="btn btn-outline btn-small" style={{ borderRadius: '20px', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '12px' }}>Materials</button>
                    <button onClick={() => scrollToSection('query-management')} className="btn btn-outline btn-small" style={{ borderRadius: '20px', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '12px', background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#b45309' }}>Queries</button>
                    <button onClick={() => scrollToSection('reports-management')} className="btn btn-outline btn-small" style={{ borderRadius: '20px', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#dc2626' }}>Reports</button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="flex-col" style={{ gap: '32px' }}>
                    
                    {/* Create Subject Card */}
                    <div id="create-subject" className="card" style={{ marginBottom: 0, padding: '32px', position: 'relative', overflow: 'hidden', scrollMarginTop: '160px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--secondary)' }}></div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: 'var(--secondary-light)', color: 'var(--secondary-hover)', padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>1</span>
                            Create Subject
                        </h2>
                        <form onSubmit={handleCreateSubject} className="flex-col gap-2">
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
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', background: 'var(--secondary)', color: 'white', border: 'none' }}>
                                {loading ? 'Creating...' : 'Create Subject'}
                            </button>
                        </form>
                    </div>

                    {/* Upload Notes Card */}
                    <div id="upload-material" className="card" style={{ marginBottom: 0, padding: '32px', position: 'relative', overflow: 'hidden', scrollMarginTop: '160px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }}></div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-hover)', padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>2</span>
                            Upload Material
                        </h2>

                        {uploadProgress.isUploading && (
                            <div className="alert alert-info" style={{ background: 'var(--primary-light)', border: 'none' }}>
                                <div className="spinner" style={{ margin: 0, marginRight: '16px' }}></div>
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--primary-hover)' }}>{uploadProgress.message}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--primary)' }}>Please wait while we process...</div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleUpload} className="flex-col gap-2">
                            <div className="form-group">
                                <label className="form-label">Select Subject</label>
                                <select
                                    className="form-select"
                                    value={uploadData.subjectId}
                                    onChange={(e) => setUploadData({ ...uploadData, subjectId: e.target.value })}
                                    disabled={loading}
                                >
                                    <option value="">-- Choose explicitly --</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name} (Sem {subject.semester})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Upload File (PDF/DOCX/PPT)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="file-input"
                                        type="file"
                                        className="form-input"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                                        onChange={handleFileChange}
                                        disabled={loading}
                                        style={{ padding: '12px', background: 'white' }}
                                    />
                                </div>
                                {uploadData.file && (
                                    <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ background: 'var(--success-light)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                                        {uploadData.file.name}
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
                                {loading ? 'Processing...' : 'Upload Note'}
                            </button>
                        </form>
                    </div>

                    {/* Subjects Overview */}
                    <div id="active-subjects" className="card" style={{ marginBottom: 0, padding: '32px', scrollMarginTop: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Active Subjects</h2>
                            <span style={{ background: 'var(--background)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Total: {subjects.length}</span>
                        </div>

                        {/* Search & Sort Controls */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search subjects..."
                                    value={subjectSearch}
                                    onChange={(e) => setSubjectSearch(e.target.value)}
                                    style={{ background: 'white', borderRadius: '12px', fontSize: '14px', paddingLeft: '40px', height: '42px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort:</span>
                                <button
                                    className={subjectSortOrder === 'asc' ? 'sort-btn-active' : ''}
                                    onClick={() => setSubjectSortOrder(subjectSortOrder === 'asc' ? 'none' : 'asc')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        border: '1.5px solid var(--border)',
                                        background: 'white',
                                        color: 'var(--text-muted)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Sem ↑
                                </button>
                                <button
                                    className={subjectSortOrder === 'desc' ? 'sort-btn-active' : ''}
                                    onClick={() => setSubjectSortOrder(subjectSortOrder === 'desc' ? 'none' : 'desc')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        border: '1.5px solid var(--border)',
                                        background: 'white',
                                        color: 'var(--text-muted)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Sem ↓
                                </button>
                            </div>
                        </div>
                        
                        <div className="admin-scroll" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                            {filteredSortedSubjects.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--background)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                        {subjects.length === 0 ? 'No subjects available' : 'No subjects match your search'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-2" style={{ gap: '16px' }}>
                                    {filteredSortedSubjects.map((subject) => (
                                        <div key={subject.id} className="subject-card-admin" style={{ 
                                            padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--border)',
                                            display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'var(--shadow-sm)',
                                            transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default', position: 'relative'
                                        }}>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary-hover)', fontWeight: 700 }}>Sem {subject.semester}</span>
                                            <h3 style={{ fontSize: '15px', color: 'var(--text-main)', margin: 0, fontWeight: 600, paddingRight: '32px' }}>{subject.name}</h3>
                                            
                                            {/* Delete button for subject — trash icon */}
                                            <button
                                                className="subject-delete-btn"
                                                onClick={() => handleDeleteSubject(subject.id, subject.name)}
                                                disabled={loading}
                                                title={`Delete ${subject.name}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: '10px',
                                                    right: '10px',
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #fecaca',
                                                    background: '#fef2f2',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s',
                                                    padding: 0,
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                                            >
                                                <TrashIcon size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Uploaded Notes Overview */}
                    <div id="recent-materials" className="card" style={{ marginBottom: 0, padding: '32px', scrollMarginTop: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Recent Materials</h2>
                            <span style={{ background: 'var(--background)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Total: {notes.length}</span>
                        </div>

                        {/* Sort Controls for Notes */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by semester:</span>
                            <button
                                className={notesSortOrder === 'asc' ? 'sort-btn-active' : ''}
                                onClick={() => setNotesSortOrder(notesSortOrder === 'asc' ? 'none' : 'asc')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: '1.5px solid var(--border)',
                                    background: 'white',
                                    color: 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Sem ↑
                            </button>
                            <button
                                className={notesSortOrder === 'desc' ? 'sort-btn-active' : ''}
                                onClick={() => setNotesSortOrder(notesSortOrder === 'desc' ? 'none' : 'desc')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: '1.5px solid var(--border)',
                                    background: 'white',
                                    color: 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Sem ↓
                            </button>
                        </div>

                        <div className="admin-scroll" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                            {notes.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--background)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No materials uploaded yet</p>
                                </div>
                            ) : (
                                <div style={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'white' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                                            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document File</th>
                                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject (Sem)</th>
                                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedNotes.map((note) => {
                                                const noteSem = getNoteSemester(note);
                                                return (
                                                <tr key={note.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>{note.filename}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(note.uploaded_at).toLocaleDateString()} at {new Date(note.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <span style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '13px', color: 'var(--text-main)', fontWeight: 500 }}>
                                                            {note.subject_name}
                                                        </span>
                                                        {noteSem !== 999 && (
                                                            <span style={{ display: 'inline-block', marginLeft: '6px', padding: '3px 8px', background: 'var(--secondary-light)', borderRadius: '10px', fontSize: '11px', color: 'var(--secondary-hover)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                Sem {noteSem}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-outline btn-small"
                                                            style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)', background: 'transparent' }}
                                                            onMouseEnter={(e) => { e.target.style.background = 'var(--danger-light)' }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent' }}
                                                            onClick={() => { handleDeleteNote(note.id, note.filename); }}
                                                            disabled={loading}
                                                            title="Delete"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ========== QUERY MANAGEMENT SECTION ========== */}
                    <div id="query-management" className="card" style={{ marginBottom: 0, padding: '32px', position: 'relative', overflow: 'hidden', scrollMarginTop: '160px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #f59e0b, #f97316)' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>5</span>
                                    Query Management
                                </h2>
                            </div>
                            <span style={{ background: 'var(--background)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Total: {queries.length}</span>
                        </div>

                        {/* Search bar + Status Filter */}
                        <div style={{ marginBottom: '20px' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search queries by title, author, or description..."
                                value={querySearch}
                                onChange={(e) => setQuerySearch(e.target.value)}
                                style={{ background: 'white', borderRadius: '12px', fontSize: '14px' }}
                            />
                        </div>

                        {/* Status Filter Chips */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Status:</span>
                            {[{ label: 'All', value: null }, { label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' }].map((f) => (
                                <button
                                    key={f.label}
                                    onClick={() => setQueryStatusFilter(f.value)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        border: queryStatusFilter === f.value ? 'none' : '1.5px solid var(--border)',
                                        background: queryStatusFilter === f.value
                                            ? f.value === 'open' ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : f.value === 'closed' ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                                            : 'linear-gradient(135deg, #f59e0b, #d97706)'
                                            : 'white',
                                        color: queryStatusFilter === f.value ? 'white' : 'var(--text-muted)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: queryStatusFilter === f.value ? '0 3px 10px rgba(0,0,0,0.12)' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    {f.value === 'open' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: queryStatusFilter === 'open' ? 'white' : '#10b981' }}></span>}
                                    {f.value === 'closed' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: queryStatusFilter === 'closed' ? 'white' : '#9ca3af' }}></span>}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="admin-scroll" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                            {filteredQueries.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--background)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>
                                        {queries.length === 0 ? 'No student queries yet' : 'No queries match your search'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {filteredQueries.map((q) => (
                                        <div key={q.id} className="query-card-admin" style={{ background: 'white', borderRadius: '14px', overflow: 'hidden' }}>
                                            {/* Query Header - clickable to expand */}
                                            <div
                                                onClick={() => setExpandedQueryId(expandedQueryId === q.id ? null : q.id)}
                                                style={{
                                                    padding: '16px 20px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '14px',
                                                    background: expandedQueryId === q.id ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                                                    transition: 'background 0.2s',
                                                }}
                                            >
                                                {/* Expand arrow */}
                                                <span style={{
                                                    fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '4px',
                                                    transition: 'transform 0.2s',
                                                    transform: expandedQueryId === q.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    flexShrink: 0,
                                                }}>▶</span>

                                                {/* Query Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{q.title}</h4>
                                                        {/* Status badge */}
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '2px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            background: q.status === 'open' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                            color: q.status === 'open' ? '#059669' : '#6b7280',
                                                            border: `1px solid ${q.status === 'open' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(107, 114, 128, 0.25)'}`,
                                                        }}>
                                                            <span style={{
                                                                width: '6px',
                                                                height: '6px',
                                                                borderRadius: '50%',
                                                                background: q.status === 'open' ? '#10b981' : '#9ca3af',
                                                            }}></span>
                                                            {q.status}
                                                        </span>
                                                        {q.image_path && (
                                                            <span style={{ fontSize: '11px', padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '6px', fontWeight: 600 }}>📷 Image</span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: 600 }}>👤 {q.user_name}</span>
                                                        <span>•</span>
                                                        <span>{new Date(q.created_at).toLocaleDateString()} at {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span>•</span>
                                                        <span style={{ background: q.answer_count > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)', color: q.answer_count > 0 ? '#059669' : '#dc2626', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                                            {q.answer_count} {q.answer_count === 1 ? 'reply' : 'replies'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Delete button */}
                                                <button
                                                    className="query-delete-btn-hover"
                                                    onClick={(e) => { e.stopPropagation(); handleAdminDeleteQuery(q.id, q.title); }}
                                                    disabled={loading}
                                                    title="Delete this query"
                                                    style={{
                                                        flexShrink: 0,
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #fecaca',
                                                        background: '#fef2f2',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '14px',
                                                        fontWeight: 700,
                                                        padding: 0,
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    <TrashIcon size={14} />
                                                </button>
                                            </div>

                                            {/* Expanded content */}
                                            {expandedQueryId === q.id && (
                                                <div style={{ borderTop: '1px solid var(--border)', padding: '20px', background: '#fafbfc' }}>
                                                    {/* Description */}
                                                    <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'white', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6 }}>{q.description}</p>
                                                    </div>

                                                    {q.image_path && (
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <img
                                                                src={`http://localhost:8000/${q.image_path.replace(/\\/g, '/')}`}
                                                                alt="Query attachment"
                                                                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '10px', border: '1px solid var(--border)', objectFit: 'contain' }}
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Replies section */}
                                                    <div style={{ marginTop: '8px' }}>
                                                        <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Replies ({q.answer_count})
                                                        </h5>
                                                        {q.answers && q.answers.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {q.answers.map((a) => (
                                                                    <div key={a.id} className="reply-card-admin" style={{
                                                                        background: 'white',
                                                                        borderRadius: '10px',
                                                                        border: '1px solid var(--border)',
                                                                        padding: '14px 16px',
                                                                        display: 'flex',
                                                                        gap: '12px',
                                                                        alignItems: 'flex-start',
                                                                    }}>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>💬 {a.user_name}</span>
                                                                                <span>•</span>
                                                                                <span>{new Date(a.created_at).toLocaleDateString()} at {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                {a.image_path && <span style={{ fontSize: '11px', padding: '1px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', fontWeight: 600 }}>📷</span>}
                                                                            </div>
                                                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>{a.answer_text}</p>
                                                                            {a.image_path && (
                                                                                <img
                                                                                    src={`http://localhost:8000/${a.image_path.replace(/\\/g, '/')}`}
                                                                                    alt="Reply attachment"
                                                                                    style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', marginTop: '8px', border: '1px solid var(--border)', objectFit: 'contain' }}
                                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            className="query-delete-btn-hover"
                                                                            onClick={() => handleAdminDeleteAnswer(q.id, a.id, a.answer_text)}
                                                                            disabled={loading}
                                                                            title="Delete this reply"
                                                                            style={{
                                                                                flexShrink: 0,
                                                                                width: '28px',
                                                                                height: '28px',
                                                                                borderRadius: '6px',
                                                                                border: '1px solid #fecaca',
                                                                                background: '#fef2f2',
                                                                                color: '#ef4444',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '12px',
                                                                                fontWeight: 700,
                                                                                padding: 0,
                                                                                transition: 'all 0.2s',
                                                                            }}
                                                                        >
                                                                            <TrashIcon size={12} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No replies yet</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ========== REPORTS MANAGEMENT SECTION ========== */}
                    <div id="reports-management" className="card" style={{ marginBottom: 0, padding: '32px', position: 'relative', overflow: 'hidden', scrollMarginTop: '160px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #ef4444, #f97316)' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>6</span>
                                    Reports
                                </h2>
                            </div>
                            <span style={{ background: 'var(--background)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Total: {reports.length}</span>
                        </div>

                        {/* Report Status Filters */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {['pending', 'reviewed', 'dismissed', 'all'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setReportFilter(f)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '20px',
                                        border: reportFilter === f ? 'none' : '1.5px solid var(--border)',
                                        background: reportFilter === f
                                            ? f === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                            : f === 'reviewed' ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : f === 'dismissed' ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                                            : 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                            : 'white',
                                        color: reportFilter === f ? 'white' : 'var(--text-muted)',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textTransform: 'capitalize',
                                        boxShadow: reportFilter === f ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                    }}
                                >
                                    {f === 'pending' && '🔴 '}
                                    {f === 'reviewed' && '✅ '}
                                    {f === 'dismissed' && '⊘ '}
                                    {f === 'all' && '📋 '}
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="admin-scroll" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                            {reportLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>Loading reports...</div>
                            ) : reports.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--background)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>
                                        {reportFilter === 'all' ? 'No reports yet' : `No ${reportFilter} reports`}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {reports.map((r) => (
                                        <div key={r.id} className="report-card-admin" style={{
                                            background: 'white',
                                            borderRadius: '14px',
                                            border: `1.5px solid ${r.status === 'pending' ? '#fcd34d' : r.status === 'reviewed' ? '#86efac' : '#d1d5db'}`,
                                            overflow: 'hidden',
                                            transition: 'all 0.2s',
                                        }}>
                                            {/* Report Header */}
                                            <div style={{
                                                padding: '16px 20px',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '14px',
                                                background: r.status === 'pending' ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                                            }}>
                                                {/* Status indicator */}
                                                <div style={{
                                                    marginTop: '2px',
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: r.status === 'pending' ? '#fef3c7'
                                                        : r.status === 'reviewed' ? '#d1fae5'
                                                        : '#f3f4f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '16px',
                                                    flexShrink: 0,
                                                }}>
                                                    {r.status === 'pending' ? '🚩' : r.status === 'reviewed' ? '✅' : '⊘'}
                                                </div>

                                                {/* Report Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            padding: '3px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            background: r.content_type === 'query' ? '#dbeafe' : '#ede9fe',
                                                            color: r.content_type === 'query' ? '#1d4ed8' : '#7c3aed',
                                                        }}>
                                                            {r.content_type}
                                                        </span>
                                                        <span style={{
                                                            padding: '3px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            background: r.status === 'pending' ? '#fef3c7' : r.status === 'reviewed' ? '#d1fae5' : '#f3f4f6',
                                                            color: r.status === 'pending' ? '#92400e' : r.status === 'reviewed' ? '#065f46' : '#4b5563',
                                                        }}>
                                                            {r.status}
                                                        </span>
                                                    </div>

                                                    {/* Reason */}
                                                    <div style={{
                                                        background: '#fef2f2',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '8px',
                                                        padding: '10px 14px',
                                                        marginBottom: '10px',
                                                    }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</span>
                                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>{r.reason}</p>
                                                    </div>

                                                    {/* Content Preview */}
                                                    <div style={{
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        padding: '10px 14px',
                                                        marginBottom: '10px',
                                                    }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reported Content</span>
                                                        {r.content_title && (
                                                            <p style={{ margin: '4px 0 2px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{r.content_title}</p>
                                                        )}
                                                        {r.content_text && (
                                                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                                                                {r.content_text}{r.content_text.length >= 200 ? '…' : ''}
                                                            </p>
                                                        )}
                                                        {r.content_author && (
                                                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>by {r.content_author}</p>
                                                        )}
                                                        {!r.content_title && !r.content_text && (
                                                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Content may have been deleted</p>
                                                        )}
                                                    </div>

                                                    {/* Meta */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                        <span>🚩 Reported by <strong style={{ color: 'var(--text-main)' }}>{r.reporter_name}</strong></span>
                                                        <span>•</span>
                                                        <span>{new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {r.resolved_at && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Resolved: {new Date(r.resolved_at).toLocaleDateString()}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons (only for pending) */}
                                                {r.status === 'pending' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                                                        <button
                                                            onClick={() => handleReportAction(r.id, 'reviewed')}
                                                            title="Mark as reviewed"
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: 'white',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                                            }}
                                                            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; }}
                                                            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; }}
                                                        >
                                                            ✓ Review
                                                        </button>
                                                        <button
                                                            onClick={() => handleReportAction(r.id, 'dismissed')}
                                                            title="Dismiss report"
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #d1d5db',
                                                                background: 'white',
                                                                color: '#6b7280',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'white'; }}
                                                        >
                                                            ✕ Dismiss
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Admin;
