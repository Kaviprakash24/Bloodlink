const testLogin = async () => {
    try {
        const res = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'hlo@gmail.com',
                password: 'password123'
            })
        });
        
        console.log('Login response status:', res.status);
        const data = await res.json();
        console.log('Response body:', data);
    } catch (error) {
        console.error('Network Error:', error.message);
    }
};

testLogin();
