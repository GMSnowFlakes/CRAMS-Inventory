import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('crams_token');
        if (token) {
            client.get('/auth/me')
                .then(({ data }) => setUser(data))
                .catch(() => localStorage.removeItem('crams_token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const { data } = await client.post('/auth/login', { email, password });
        localStorage.setItem('crams_token', data.token);
        setUser(data.user);
    };

    const logout = async () => {
        await client.post('/auth/logout').catch(() => {});
        localStorage.removeItem('crams_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
