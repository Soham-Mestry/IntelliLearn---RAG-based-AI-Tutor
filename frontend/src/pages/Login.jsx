import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { saveAuth } from '../auth';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            const data = await login(formData.email, formData.password);
            saveAuth(data.access_token, data.user);

            // Redirect based on role
            if (data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/student');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your AI Tutor account</p>

                {error && (
                    <div className="alert alert-error">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="flex-col gap-2">
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="name@example.com"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '14px' }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center mt-3 text-muted">
                    Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
