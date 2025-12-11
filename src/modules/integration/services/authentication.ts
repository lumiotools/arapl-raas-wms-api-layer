

const AuthRequest = {
    'username': 'admin',
    'password': 'admin',
}



export async function authenticate() {
    try {
        const AUTH_URL = process.env.FMS_BASE_URL+'/operator/v1/auth/login';
        console.log(`Auth url:`, AUTH_URL);
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