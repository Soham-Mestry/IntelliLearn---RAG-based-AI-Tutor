import { useState, useEffect, useMemo } from 'react';
import { getStudentQueries, deleteQuery } from '../api';
import { getUser } from '../auth';
import CreateQueryModal from './CreateQueryModal';
import QueryThread from './QueryThread';
import './AskQuery.css';

function AskQueryDashboard() {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedQueryId, setSelectedQueryId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(null); // null = all, 'open', 'closed'

    // Delete confirmation state
    const [deleteModal, setDeleteModal] = useState({ show: false, queryId: '', title: '' });
    const [deleting, setDeleting] = useState(false);

    const currentUser = getUser();

    const fetchQueries = async () => {
        setLoading(true);
        try {
            const data = await getStudentQueries(statusFilter);
            setQueries(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueries();
    }, [statusFilter]);

    const handleQueryCreated = () => {
        fetchQueries();
    };

    const handleDeleteClick = (e, queryId, title) => {
        e.stopPropagation(); // Prevent navigating into the query
        setDeleteModal({ show: true, queryId, title });
    };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteQuery(deleteModal.queryId);
            setDeleteModal({ show: false, queryId: '', title: '' });
            fetchQueries();
        } catch (err) {
            setError(err.message || 'Failed to delete query');
            setDeleteModal({ show: false, queryId: '', title: '' });
        } finally {
            setDeleting(false);
        }
    };

    const closeDeleteModal = () => {
        setDeleteModal({ show: false, queryId: '', title: '' });
    };

    // Filter queries based on search term (matches title and description)
    const filteredQueries = useMemo(() => {
        if (!searchTerm.trim()) return queries;
        const term = searchTerm.toLowerCase().trim();
        return queries.filter(q =>
            q.title.toLowerCase().includes(term) ||
            q.description.toLowerCase().includes(term)
        );
    }, [queries, searchTerm]);

    if (selectedQueryId) {
        return (
            <QueryThread 
                queryId={selectedQueryId} 
                onBack={() => {
                    setSelectedQueryId(null);
                    fetchQueries();
                }} 
            />
        );
    }

    return (
        <div className="ask-query-dashboard">
            <div className="aq-header">
                <h2>Ask Query Threads</h2>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    New Query
                </button>
            </div>

            {/* Search Bar + Status Filter */}
            <div className="aq-search-wrapper">
                <div className="aq-search-bar">
                    <svg className="aq-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        id="query-search-input"
                        type="text"
                        className="aq-search-input"
                        placeholder="Search queries by title or description…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="aq-search-clear"
                            onClick={() => setSearchTerm('')}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
                {searchTerm && !loading && (
                    <span className="aq-search-count">
                        {filteredQueries.length} result{filteredQueries.length !== 1 ? 's' : ''} found
                    </span>
                )}
            </div>

            {/* Status Filter Chips */}
            <div className="aq-status-filter-bar">
                <span className="aq-filter-label">Filter:</span>
                <button
                    className={`aq-filter-chip ${statusFilter === null ? 'active' : ''}`}
                    onClick={() => setStatusFilter(null)}
                >
                    All
                </button>
                <button
                    className={`aq-filter-chip aq-filter-open ${statusFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('open')}
                >
                    <span className="aq-filter-dot aq-dot-open"></span>
                    Open
                </button>
                <button
                    className={`aq-filter-chip aq-filter-closed ${statusFilter === 'closed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('closed')}
                >
                    <span className="aq-filter-dot aq-dot-closed"></span>
                    Closed
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
                <div className="loading-spinner">Loading threads...</div>
            ) : queries.length === 0 ? (
                <div className="no-queries">
                    {statusFilter ? `No ${statusFilter} queries found.` : 'No queries yet. Be the first to ask!'}
                </div>
            ) : filteredQueries.length === 0 ? (
                <div className="no-queries aq-no-results">
                    <span className="aq-no-results-icon">🔍</span>
                    <p>No queries match "<strong>{searchTerm}</strong>"</p>
                    <button className="btn btn-outline btn-sm" onClick={() => setSearchTerm('')}>Clear Search</button>
                </div>
            ) : (
                <div className="query-list">
                    {filteredQueries.map(q => {
                        const isOwner = currentUser && currentUser.id === q.user_id;
                        return (
                            <div key={q.id} className={`query-card ${q.status === 'closed' ? 'query-card-closed' : ''}`} onClick={() => setSelectedQueryId(q.id)}>
                                <div className="query-card-header">
                                    <div className="query-card-title-row">
                                        <h3>{q.title}</h3>
                                        <span className={`query-status-badge ${q.status === 'open' ? 'status-open' : 'status-closed'}`}>
                                            <span className={`status-dot ${q.status === 'open' ? 'dot-open' : 'dot-closed'}`}></span>
                                            {q.status === 'open' ? 'Open' : 'Closed'}
                                        </span>
                                    </div>
                                    <div className="query-card-header-right">
                                        <span className="query-author">by {q.user_name}</span>
                                        {isOwner && (
                                            <button
                                                className="delete-card-btn"
                                                onClick={(e) => handleDeleteClick(e, q.id, q.title)}
                                                title="Delete this query"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="query-preview">{q.description.substring(0, 150)}{q.description.length > 150 ? '...' : ''}</p>
                                <div className="query-meta">
                                    <span>{new Date(q.created_at).toLocaleString()}</span>
                                    <span className="answer-count">💬 {q.answer_count} answers</span>
                                    {q.image_path && <span className="has-image">🖼️ Has Image</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateQueryModal 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onQueryCreated={handleQueryCreated} 
                />
            )}

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
                        <h3>Delete this Query?</h3>
                        <p className="delete-modal-title">"{deleteModal.title}"</p>
                        <p className="delete-modal-desc">
                            This will permanently delete the query and all its answers. This action cannot be undone.
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
        </div>
    );
}

export default AskQueryDashboard;
