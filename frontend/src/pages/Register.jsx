import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
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

        if (!formData.name || !formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await register(formData.name, formData.email, formData.password);
            // Redirect to login after successful registration
            navigate('/login', { state: { message: 'Registration successful! Please login.' } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Create Account</h1>

                {error && (
                    <div className="alert alert-error">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your name"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password (min 6 characters)"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <p className="text-center mt-3">
                    Already have an account? <Link to="/login" className="auth-link">Login</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
