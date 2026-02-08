import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../auth';

function Navbar() {
    const navigate = useNavigate();
    const user = getUser();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav style={styles.nav}>
            <div className="container" style={styles.container}>
                <h1 style={styles.title}>🎓 AI Tutor</h1>
                <div style={styles.right}>
                    <span style={styles.userName}>{user?.name}</span>
                    <span style={styles.role}>({user?.role})</span>
                    <button onClick={handleLogout} className="btn btn-secondary btn-small">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

const styles = {
    nav: {
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '16px 0',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '20px',
        fontWeight: '600',
        margin: 0,
    },
    right: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    userName: {
        fontSize: '14px',
        fontWeight: '500',
    },
    role: {
        fontSize: '13px',
        opacity: 0.8,
    },
};

export default Navbar;
