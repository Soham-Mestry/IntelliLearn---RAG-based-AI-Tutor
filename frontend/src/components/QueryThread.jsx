import { useState, useEffect, useRef } from 'react';
import { getQueryDetails, postQueryAnswer, deleteQuery, deleteAnswer, submitReport } from '../api';
import { getUser } from '../auth';

function QueryThread({ queryId, onBack }) {
    const [query, setQuery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [answerText, setAnswerText] = useState('');
    const [answerImage, setAnswerImage] = useState(null);
    const [postingAnswer, setPostingAnswer] = useState(false);
    const [answerError, setAnswerError] = useState('');

    // Delete confirmation state
    const [deleteModal, setDeleteModal] = useState({ show: false, type: '', id: '' });
    const [deleting, setDeleting] = useState(false);

    // Report modal state
    const [reportModal, setReportModal] = useState({ show: false, type: '', id: '' });
    const [reportReason, setReportReason] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportSuccess, setReportSuccess] = useState('');

    const fileInputRef = useRef(null);
    const currentUser = getUser();

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await getQueryDetails(queryId);
            setQuery(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [queryId]);

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        if (!answerText.trim()) return;

        setPostingAnswer(true);
        setAnswerError('');
        try {
            const formData = new FormData();
            formData.append('answer_text', answerText);
            if (answerImage) {
                formData.append('image', answerImage);
            }
            await postQueryAnswer(queryId, formData);
            setAnswerText('');
            setAnswerImage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchDetail();
        } catch (err) {
            setAnswerError(err.message || 'Failed to post answer');
        } finally {
            setPostingAnswer(false);
        }
    };

    const openDeleteModal = (type, id) => {
        setDeleteModal({ show: true, type, id });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ show: false, type: '', id: '' });
    };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            if (deleteModal.type === 'query') {
                await deleteQuery(queryId);
                onBack(); // Go back to list after deleting query
            } else if (deleteModal.type === 'answer') {
                await deleteAnswer(queryId, deleteModal.id);
                closeDeleteModal();
                fetchDetail(); // Refresh thread
            }
        } catch (err) {
            setAnswerError(err.message || 'Failed to delete');
            closeDeleteModal();
        } finally {
            setDeleting(false);
        }
    };

    // Report handlers
    const openReportModal = (type, id) => {
        setReportModal({ show: true, type, id });
        setReportReason('');
        setReportSuccess('');
    };

    const closeReportModal = () => {
        setReportModal({ show: false, type: '', id: '' });
        setReportReason('');
    };

    const handleSubmitReport = async () => {
        if (!reportReason.trim()) return;
        setSubmittingReport(true);
        try {
            await submitReport(reportModal.type, reportModal.id, reportReason.trim());
            setReportSuccess('Report submitted successfully!');
            setTimeout(() => {
                closeReportModal();
                setReportSuccess('');
            }, 1500);
        } catch (err) {
            setAnswerError(err.message || 'Failed to submit report');
            closeReportModal();
        } finally {
            setSubmittingReport(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading thread...</div>;
    if (error) return <div className="alert alert-error">{error}</div>;
    if (!query) return null;

    const isQueryOwner = currentUser && currentUser.id === query.user_id;

    return (
        <div className="query-thread-view">
            <div className="thread-top-bar">
                <button className="btn btn-outline back-btn" onClick={onBack}>
                    ← Back to Threads
                </button>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Report query button (visible to non-owners) */}
                    {!isQueryOwner && (
                        <button
                            className="report-btn"
                            onClick={() => openReportModal('query', queryId)}
                            title="Report this query"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                <line x1="4" y1="22" x2="4" y2="15" />
                            </svg>
                            Report
                        </button>
                    )}
                    {isQueryOwner && (
                        <button
                            className="btn btn-danger-outline delete-query-btn"
                            onClick={() => openDeleteModal('query', queryId)}
                            title="Delete this query"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                            Delete Query
                        </button>
                    )}
                </div>
            </div>

            <div className="original-query-card">
                <div className="oq-header">
                    <h2>{query.title}</h2>
                    <div className="oq-meta">
                        <span className="author">Asked by: <strong>{query.user_name}</strong></span>
                        <span className="date">{new Date(query.created_at).toLocaleString()}</span>
                    </div>
                </div>

                <div className="oq-body">
                    <p>{query.description}</p>
                    {query.image_path && (
                        <div className="oq-image-container">
                            <img
                                src={`http://localhost:8000/${query.image_path.replace(/\\/g, '/').replace(/^\//, '')}`}
                                alt="Query attachment"
                                className="oq-image"
                                style={{ borderRadius: '8px', border: '1px solid var(--border)', maxWidth: '100%' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="answers-section">
                <h3>Answers ({query.answers.length})</h3>

                <div className="answers-list">
                    {query.answers.map(ans => {
                        const isAnswerOwner = currentUser && currentUser.id === ans.user_id;
                        return (
                            <div key={ans.id} className="answer-card">
                                <div className="ans-header">
                                    <strong>{ans.user_name}</strong>
                                    <div className="ans-header-right">
                                        <span>{new Date(ans.created_at).toLocaleString()}</span>
                                        {/* Report answer button */}
                                        {!isAnswerOwner && (
                                            <button
                                                className="report-answer-btn"
                                                onClick={() => openReportModal('answer', ans.id)}
                                                title="Report this answer"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                                    <line x1="4" y1="22" x2="4" y2="15" />
                                                </svg>
                                            </button>
                                        )}
                                        {isAnswerOwner && (
                                            <button
                                                className="delete-answer-btn"
                                                onClick={() => openDeleteModal('answer', ans.id)}
                                                title="Delete this answer"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="ans-body">
                                    <p>{ans.answer_text}</p>
                                    {ans.image_path && (
                                        <div className="ans-image-container">
                                            <img
                                                src={`http://localhost:8000/${ans.image_path.replace(/\\/g, '/').replace(/^\//, '')}`}
                                                alt="Answer attachment"
                                                className="ans-image"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {query.answers.length === 0 && (
                        <div className="no-answers">No answers yet. Can you help?</div>
                    )}
                </div>

                <form className="answer-form" onSubmit={handleAnswerSubmit}>
                    <h4>Your Answer</h4>
                    {answerError && <div className="alert alert-error">{answerError}</div>}
                    <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer here..."
                        className="input-field textarea-field"
                        rows="4"
                        required
                    />
                    <div className="answer-form-extras">
                        <div className="answer-image-upload">
                            <label className="image-upload-label" htmlFor="answer-image-input">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                {answerImage ? answerImage.name : 'Attach Image'}
                            </label>
                            <input
                                id="answer-image-input"
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => setAnswerImage(e.target.files[0] || null)}
                                accept=".jpg,.jpeg,.png,.gif,.webp"
                                style={{ display: 'none' }}
                            />
                            {answerImage && (
                                <button
                                    type="button"
                                    className="remove-image-btn"
                                    onClick={() => {
                                        setAnswerImage(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    title="Remove image"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={postingAnswer || !answerText.trim()}>
                            {postingAnswer ? 'Posting...' : 'Post Answer'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h3>
                            {deleteModal.type === 'query' ? 'Delete this Query?' : 'Delete this Answer?'}
                        </h3>
                        <p className="delete-modal-desc">
                            {deleteModal.type === 'query'
                                ? 'This will permanently delete the query and all its answers. This action cannot be undone.'
                                : 'This will permanently delete your answer. This action cannot be undone.'}
                        </p>
                        <div className="delete-modal-actions">
                            <button className="btn btn-outline" onClick={closeDeleteModal} disabled={deleting}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportModal.show && (
                <div className="modal-overlay" onClick={closeReportModal}>
                    <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
                        {reportSuccess ? (
                            <div className="report-success-view">
                                <div className="report-success-icon">
                                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                </div>
                                <h3>Report Submitted</h3>
                                <p>Thank you. Our admin team will review this report.</p>
                            </div>
                        ) : (
                            <>
                                <div className="report-modal-header">
                                    <div className="report-modal-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                            <line x1="4" y1="22" x2="4" y2="15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3>Report {reportModal.type === 'query' ? 'Query' : 'Answer'}</h3>
                                        <p className="report-modal-subtitle">Help us keep the community safe</p>
                                    </div>
                                </div>
                                <div className="report-modal-body">
                                    <label className="report-label">Why are you reporting this?</label>
                                    <div className="report-quick-reasons">
                                        {['Spam', 'Inappropriate content', 'Harassment', 'Misleading information', 'Other'].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                className={`report-reason-chip ${reportReason === r ? 'active' : ''}`}
                                                onClick={() => setReportReason(r)}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="report-textarea"
                                        placeholder="Provide additional details (optional if a reason is selected above)..."
                                        value={['Spam', 'Inappropriate content', 'Harassment', 'Misleading information', 'Other'].includes(reportReason) ? reportReason : reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        rows="3"
                                    />
                                </div>
                                <div className="report-modal-actions">
                                    <button className="btn btn-outline" onClick={closeReportModal} disabled={submittingReport}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn report-submit-btn"
                                        onClick={handleSubmitReport}
                                        disabled={submittingReport || !reportReason.trim()}
                                    >
                                        {submittingReport ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default QueryThread;
