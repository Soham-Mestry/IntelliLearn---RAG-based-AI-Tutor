import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import { getSubjects } from '../api';
import './Student.css';

function Student() {
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSubjects();
    }, [selectedSemester]);

    const fetchSubjects = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getSubjects(selectedSemester);
            setSubjects(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                                    <div key={subject.id} className="subject-item">
                                        <span>{subject.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#6b7280', fontSize: '14px' }}>No subjects available</p>
                        )}
                    </div>
                </div>

                {/* Main Content - Chat Area */}
                <div className="main-content">
                    <ChatBox />
                </div>
            </div>
        </div>
    );
}

export default Student;
