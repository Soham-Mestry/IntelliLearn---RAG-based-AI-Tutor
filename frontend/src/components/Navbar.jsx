import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../auth';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Do not show full navbar on auth pages if we want a clean look, but the instruction is to improve the existing. 
    // They are currently shown on Admin and Student.

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Brand Logo */}
                <div className="navbar-brand" onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/student')}>
                    <div className="logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="logo-text">
                        AI<span className="logo-highlight">Tutor</span>
                    </span>
                </div>

                {/* Right Side: Profile & Logout */}
                {user && (
                    <div className="navbar-right">
                        <div className="user-profile">
                            <div className="avatar">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className="user-role">{user.role}</span>
                            </div>
                        </div>
                        
                        <div className="divider"></div>

                        <button onClick={handleLogout} className="btn-logout" title="Logout">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            <span className="logout-text">Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
