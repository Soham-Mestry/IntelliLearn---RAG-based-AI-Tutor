import { useState, useEffect } from 'react';
import { getStudentQueries } from '../api';
import CreateQueryModal from './CreateQueryModal';
import QueryThread from './QueryThread';
import './AskQuery.css';

function AskQueryDashboard() {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedQueryId, setSelectedQueryId] = useState(null);

    const fetchQueries = async () => {
        setLoading(true);
        try {
            const data = await getStudentQueries();
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
    }, []);

    const handleQueryCreated = () => {
        fetchQueries();
    };

    if (selectedQueryId) {
        return (
            <QueryThread 
                queryId={selectedQueryId} 
                onBack={() => {
                    setSelectedQueryId(null);
                    fetchQueries(); // refresh list in case answer count changed
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

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
                <div className="loading-spinner">Loading threads...</div>
            ) : queries.length === 0 ? (
                <div className="no-queries">No queries yet. Be the first to ask!</div>
            ) : (
                <div className="query-list">
                    {queries.map(q => (
                        <div key={q.id} className="query-card" onClick={() => setSelectedQueryId(q.id)}>
                            <div className="query-card-header">
                                <h3>{q.title}</h3>
                                <span className="query-author">by {q.user_name}</span>
                            </div>
                            <p className="query-preview">{q.description.substring(0, 150)}{q.description.length > 150 ? '...' : ''}</p>
                            <div className="query-meta">
                                <span>{new Date(q.created_at).toLocaleString()}</span>
                                <span className="answer-count">💬 {q.answer_count} answers</span>
                                {q.image_path && <span className="has-image">🖼️ Has Image</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateQueryModal 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onQueryCreated={handleQueryCreated} 
                />
            )}
        </div>
    );
}

export default AskQueryDashboard;
