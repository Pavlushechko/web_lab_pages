import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { login_slice } from './redux/userSlice';
import axios from 'axios';

export function Hook() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        setIsLoggedIn(!!token);
    }, [location.pathname]);

    const handleNavigation = (pathname: string) => {
        if (pathname === "-1") {
            navigate(-1);
            return;
        }
        navigate(pathname);
    };

    const handleLogout = async () => {
        try {
            const token = await getAccessToken();
            const refreshToken = localStorage.getItem('refresh_token');

            if (token && refreshToken) {
                await axios.post('/api/logout/', 
                    { refresh_token: refreshToken },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
            }

            clearAuthData();
            navigate('/login');

        } catch (error) {
            console.error('Logout failed:', error);
            clearAuthData();
            navigate('/login');
        }
    };

    const clearAuthData = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        dispatch(login_slice({ username: "" }));
        setIsLoggedIn(false);
    };

    const getAccessToken = async () => {
        let token = localStorage.getItem('access_token');
        if (token && isTokenExpired(token)) {
            token = await refreshAccessToken();
        }
        return token;
    };

    const isTokenExpired = (token: string) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return Date.now() > payload.exp * 1000;
        } catch (e) {
            return true;
        }
    };

    const refreshAccessToken = async () => {
        try {
            const refresh = localStorage.getItem("refresh_token");
            const response = await axios.post(
                "http://127.0.0.1:8000/api/token/refresh/", 
                { refresh }
            );

            const newAccessToken = response.data.access;
            localStorage.setItem("access_token", newAccessToken);
            return newAccessToken;

        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                clearAuthData();
                navigate('/login');
            }
            console.error("Ошибка при обновлении токена", error);
            throw error;
        }
    };

    return {
        navigate: handleNavigation,
        location,
        isLoggedIn,
        handleLogout,
        getAccessToken
    };
}