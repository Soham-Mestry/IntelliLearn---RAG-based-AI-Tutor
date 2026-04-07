/**
 * API client with Axios
 * Centralized API calls with JWT token interceptor
 */
import axios from 'axios';
import { getToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create Axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error
            const message = error.response.data?.detail || error.response.data?.message || 'An error occurred';
            return Promise.reject(new Error(message));
        } else if (error.request) {
            // Request made but no response
            return Promise.reject(new Error('Network error. Please check your connection.'));
        } else {
            // Something else happened
            return Promise.reject(new Error(error.message));
        }
    }
);

// ============= Auth API =============

export const register = async (name, email, password) => {
    const response = await api.post('/register', { name, email, password });
    return response.data;
};

export const login = async (email, password) => {
    const response = await api.post('/login', { email, password });
    return response.data;
};

// ============= Student API =============

export const getSubjects = async (semester) => {
    const response = await api.get(`/subjects/${semester}`);
    return response.data;
};

export const askQuestion = async (question, subjectId = null) => {
    const payload = { question };
    if (subjectId) payload.subject_id = subjectId;
    const response = await api.post('/ask', payload);
    return response.data;
};

export const getHistory = async (subjectId = null) => {
    const params = subjectId ? { subject_id: subjectId } : {};
    const response = await api.get('/history', { params });
    return response.data;
};

// ============= Student Queries API =============

export const createStudentQuery = async (formData) => {
    const response = await api.post('/student/queries', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getStudentQueries = async () => {
    const response = await api.get('/student/queries');
    return response.data;
};

export const getQueryDetails = async (queryId) => {
    const response = await api.get(`/student/queries/${queryId}`);
    return response.data;
};

export const postQueryAnswer = async (queryId, formData) => {
    const response = await api.post(`/student/queries/${queryId}/answers`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const deleteQuery = async (queryId) => {
    const response = await api.delete(`/student/queries/${queryId}`);
    return response.data;
};

export const deleteAnswer = async (queryId, answerId) => {
    const response = await api.delete(`/student/queries/${queryId}/answers/${answerId}`);
    return response.data;
};

// ============= Admin API =============

export const createSubject = async (name, semester) => {
    const response = await api.post('/admin/subject', { name, semester });
    return response.data;
};

export const uploadNote = async (file, subjectId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', subjectId);

    const response = await api.post('/admin/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getAllNotes = async () => {
    const response = await api.get('/admin/notes');
    return response.data;
};

export const deleteNote = async (noteId) => {
    const response = await api.delete(`/admin/note/${noteId}`);
    return response.data;
};

export const deleteSubject = async (subjectId) => {
    const response = await api.delete(`/admin/subject/${subjectId}`);
    return response.data;
};

// ============= Admin Query Management API =============

export const getAdminQueries = async () => {
    const response = await api.get('/admin/queries');
    return response.data;
};

export const adminDeleteQuery = async (queryId) => {
    const response = await api.delete(`/admin/queries/${queryId}`);
    return response.data;
};

export const adminDeleteAnswer = async (queryId, answerId) => {
    const response = await api.delete(`/admin/queries/${queryId}/answers/${answerId}`);
    return response.data;
};

// ============= Report API =============

export const submitReport = async (contentType, contentId, reason) => {
    const formData = new FormData();
    formData.append('content_type', contentType);
    formData.append('content_id', contentId);
    formData.append('reason', reason);
    const response = await api.post('/student/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

// ============= Admin Report API =============

export const getAdminReports = async (statusFilter = null) => {
    const params = statusFilter ? { status_filter: statusFilter } : {};
    const response = await api.get('/admin/reports', { params });
    return response.data;
};

export const updateReportStatus = async (reportId, newStatus) => {
    const formData = new FormData();
    formData.append('new_status', newStatus);
    const response = await api.put(`/admin/reports/${reportId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getAllSubjects = async () => {
    // Get all subjects across all semesters for admin
    const allSubjects = [];
    for (let sem = 1; sem <= 8; sem++) {
        try {
            const subjects = await getSubjects(sem);
            allSubjects.push(...subjects);
        } catch (error) {
            // Continue if a semester has no subjects
        }
    }
    return allSubjects;
};

export default api;
