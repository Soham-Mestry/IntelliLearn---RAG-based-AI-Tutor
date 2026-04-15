import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../auth';
import Navbar from '../components/Navbar';

function Home() {
    const navigate = useNavigate();

    // If already logged in, they can go to dashboard
    useEffect(() => {
        const user = getUser();
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : '/student');
        }
    }, [navigate]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', overflowX: 'hidden' }}>
            {/* Custom Navbar for Landing Page */}
            <nav style={{
                position: 'fixed', width: '100%', top: 0, zIndex: 50,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
                padding: '16px 32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '38px', height: '38px', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                        AI<span style={{ color: 'var(--primary)', fontWeight: '800' }}>Tutor</span>
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ borderRadius: '24px' }}>Log In</button>
                    <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ borderRadius: '24px' }}>Get Started</button>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{
                padding: '160px 24px 100px',
                textAlign: 'center',
                background: 'linear-gradient(180deg, var(--primary-light) 0%, var(--background) 100%)',
                animation: 'fadeIn 1s ease-out'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'inline-block', padding: '8px 16px', background: 'white', borderRadius: '30px', color: 'var(--primary)', fontWeight: '600', fontSize: '14px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
                        ✨ The Future of Learning is Here
                    </div>
                    <h1 style={{ fontSize: '56px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-0.03em' }}>
                        Your Smart, Personalized <br /><span style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Learning Companion</span>
                    </h1>
                    <p style={{ fontSize: '20px', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 40px' }}>
                        Transform the way you study. Upload university materials, ask complex questions, and get precise, mathematically accurate answers perfectly tailored to your syllabus.
                    </p>
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '18px', borderRadius: '30px', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                            Start Learning for Free
                        </button>
                        <button onClick={() => {
                            document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
                        }} className="btn btn-outline" style={{ padding: '16px 32px', fontSize: '18px', borderRadius: '30px', background: 'white' }}>
                            Explore Features
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Section */}
            <section id="features" style={{ padding: '100px 24px', background: 'white' }}>
                <div className="container" style={{ maxWidth: '1200px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                            Everything you need to ace your exams
                        </h2>
                        <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                            Powered by cutting edge AI embeddings and Retrieval-Augmented Generation.
                        </p>
                    </div>

                    <div className="grid grid-3" style={{ gap: '32px' }}>
                        {/* Feature 1 */}
                        <div className="card" style={{ padding: '40px 32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.3s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ width: '60px', height: '60px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '24px' }}>
                                📚
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Syllabus Specific</h3>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                The AI strictly restricts its knowledge to the context of the supplied university notes. No hallucinations, no generic internet answers.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="card" style={{ padding: '40px 32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.3s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ width: '60px', height: '60px', background: 'var(--secondary-light)', color: 'var(--secondary-hover)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '24px' }}>
                                ➗
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Complex Math Support</h3>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                Fully integrated LaTeX rendering. The AI naturally outputs complex equations step-by-step for engineering subjects like Cryptography.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="card" style={{ padding: '40px 32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.3s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ width: '60px', height: '60px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '24px' }}>
                                💬
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Interactive Notebook</h3>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                Ask questions in a beautifully designed notebook interface. Share queries with peers and upload snapshot images of problems.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ padding: '100px 24px', background: 'var(--surface-alt)', textAlign: 'center' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '24px' }}>
                        Ready to join the smart era of learning?
                    </h2>
                    <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '18px', borderRadius: '30px', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                        Create an Account Today
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '32px 24px', background: 'white', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px' }}>
                © {new Date().getFullYear()} AI Tutor Platform. All rights reserved.
            </footer>
        </div>
    );
}

export default Home;
