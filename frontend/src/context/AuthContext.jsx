import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const checkUserLoggedIn = async () => {
            try {
                const { data } = await api.get('/auth/me');
                setUser(data);
            } catch (error) {
                // If 401, they just aren't logged in, which is fine
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkUserLoggedIn();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        setUser(data);
    };

    const register = async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        setUser(data);
    };

    const logout = async () => {
        await api.post('/auth/logout');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
