import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, getRole } from './auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Student from './pages/Student';
import Admin from './pages/Admin';

// Protected Route component
function ProtectedRoute({ children, requireRole }) {
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    if (requireRole && getRole() !== requireRole) {
        // Redirect to appropriate dashboard based on role
        const role = getRole();
        return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />;
    }

    return children;
}

function App() {
    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes */}
                <Route
                    path="/student"
                    element={
                        <ProtectedRoute requireRole="student">
                            <Student />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute requireRole="admin">
                            <Admin />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all - redirect to login */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
