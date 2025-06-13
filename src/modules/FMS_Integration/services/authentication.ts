
import fetch from 'node-fetch';

const AuthRequest = {
    'username': 'admin',
    'password': 'admin',
}

const AUTH_URL = 'https://api.araplraas.com/operator/v1/auth/login';

export async function authenticate() {
    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(AuthRequest),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
}