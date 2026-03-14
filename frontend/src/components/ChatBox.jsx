import { useState, useEffect, useRef, memo } from 'react';
import { askQuestion, getHistory } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './ChatBox.css';

const MessageBubble = memo(({ message }) => {
    return (
        <div className="message-text markdown-body">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {message.text}
            </ReactMarkdown>
        </div>
    );
});

function ChatBox() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Load history on mount
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const history = await getHistory();
            // Convert history to message format (reverse to show oldest first)
            const historyMessages = history.reverse().flatMap((item) => [
                {
                    type: 'user',
                    text: item.question,
                    timestamp: new Date(item.created_at),
                },
                {
                    type: 'ai',
                    text: item.answer,
                    timestamp: new Date(item.created_at),
                },
            ]);
            setMessages(historyMessages);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = {
            type: 'user',
            text: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await askQuestion(userMessage.text);

            const aiMessage = {
                type: 'ai',
                text: response.answer,
                sources: response.sources,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            const errorMessage = {
                type: 'ai',
                text: `Error: ${err.message}`,
                timestamp: new Date(),
                isError: true,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chatbox-container">
            {/* Messages Area */}
            <div className="messages-area" ref={messagesContainerRef}>
                {loadingHistory ? (
                    <div className="loading-center">
                        <div className="spinner"></div>
                        <p>Loading conversation history...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="empty-chat">
                        <div className="empty-icon">💬</div>
                        <h3>Start a conversation</h3>
                        <p>Ask any question about your course materials!</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message ${msg.type === 'user' ? 'message-user' : 'message-ai'} ${msg.isError ? 'message-error' : ''}`}
                            >
                                <div className="message-avatar">
                                    {msg.type === 'user' ? '👤' : '🤖'}
                                </div> {/* Added missing closing div for message-avatar */}
                                <div className="message-content">
                                    <MessageBubble message={msg} />
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="message-sources">
                                            <small>
                                                <strong>📚 Sources:</strong> {msg.sources.join(', ')}
                                            </small>
                                        </div>
                                    )}
                                    <div className="message-time">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message message-ai">
                                <div className="message-avatar">🤖</div>
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="input-area">
                <textarea
                    className="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question here..."
                    disabled={loading}
                    rows={1}
                />
                <button
                    className="send-button"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default ChatBox;
