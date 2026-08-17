import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    withCredentials: true, // IMPORTANT: Allows cookies to be sent with requests
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;
