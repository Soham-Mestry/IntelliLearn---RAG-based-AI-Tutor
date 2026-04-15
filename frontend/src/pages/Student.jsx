import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import AskQueryDashboard from '../components/AskQueryDashboard';
import { getSubjects } from '../api';
import './Student.css';

function Student() {
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'query'
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(null); // { id, name }

    useEffect(() => {
        fetchSubjects();
    }, [selectedSemester]);

    const fetchSubjects = async () => {
        setLoading(true);
        setError('');
        setSelectedSubject(null); // Reset subject when semester changes
        try {
            const data = await getSubjects(selectedSemester);
            setSubjects(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectClick = (subject) => {
        setSelectedSubject(subject);
    };

    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div>
            <Navbar />
            <div className="student-layout">
                {/* Left Sidebar */}
                <div className="sidebar">
                    {/* Semesters Section */}
                    <div className="card sidebar-section">
                        <h2>Semesters</h2>
                        <div className="semester-grid">
                            {semesters.map((sem) => (
                                <button
                                    key={sem}
                                    className={`btn ${selectedSemester === sem ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedSemester(sem)}
                                >
                                    {sem}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subjects Section */}
                    <div className="card sidebar-section">
                        <h2>Subjects</h2>
                        {error && <div className="alert alert-error">{error}</div>}

                        {loading ? (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                            </div>
                        ) : subjects.length > 0 ? (
                            <div className="subject-list">
                                {subjects.map((subject) => (
                                    <div
                                        key={subject.id}
                                        className={`subject-item ${selectedSubject?.id === subject.id ? 'subject-item-active' : ''}`}
                                        onClick={() => handleSubjectClick(subject)}
                                    >
                                        <span>{subject.name}</span>
                                        {selectedSubject?.id === subject.id && (
                                            <span className="subject-active-indicator">●</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted" style={{ fontSize: '14px' }}>No subjects available</p>
                        )}
                    </div>
                </div>

                {/* Main Content - Dynamic Area */}
                <div className="main-content">
                    <div className="student-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ai')}
                        >
                            <span className="tab-icon">🤖</span> AI Tutor
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
                            onClick={() => setActiveTab('query')}
                        >
                            <span className="tab-icon">❓</span> Ask Query
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'ai' ? (
                            <ChatBox
                                subjectId={selectedSubject?.id || null}
                                subjectName={selectedSubject?.name || null}
                            />
                        ) : (
                            <AskQueryDashboard />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Student;

