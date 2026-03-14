import { useState, useEffect } from 'react';
import { getQueryDetails, postQueryAnswer } from '../api';

function QueryThread({ queryId, onBack }) {
    const [query, setQuery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [answerText, setAnswerText] = useState('');
    const [postingAnswer, setPostingAnswer] = useState(false);
    const [answerError, setAnswerError] = useState('');

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
            await postQueryAnswer(queryId, answerText);
            setAnswerText('');
            fetchDetail(); // Refresh to get the new answer
        } catch (err) {
            setAnswerError(err.message || 'Failed to post answer');
        } finally {
            setPostingAnswer(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading thread...</div>;
    if (error) return <div className="alert alert-error">{error}</div>;
    if (!query) return null;

    return (
        <div className="query-thread-view">
            <button className="btn btn-outline back-btn" onClick={onBack}>
                ← Back to Threads
            </button>
            
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
                                src={`http://localhost:8000/${query.image_path.replace(/\\/g, '/')}`} 
                                alt="Query attachment" 
                                className="oq-image"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="answers-section">
                <h3>Answers ({query.answers.length})</h3>
                
                <div className="answers-list">
                    {query.answers.map(ans => (
                        <div key={ans.id} className="answer-card">
                            <div className="ans-header">
                                <strong>{ans.user_name}</strong>
                                <span>{new Date(ans.created_at).toLocaleString()}</span>
                            </div>
                            <div className="ans-body">
                                <p>{ans.answer_text}</p>
                            </div>
                        </div>
                    ))}
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
                    <button type="submit" className="btn btn-primary" disabled={postingAnswer || !answerText.trim()}>
                        {postingAnswer ? 'Posting...' : 'Post Answer'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default QueryThread;
