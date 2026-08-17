import assert from 'assert';

const API_URL = 'http://localhost:5001/api';

const runSecurityTests = async () => {
    let passed = 0;
    let failed = 0;
    
    console.log('🛡️ Starting BloodLink Security Tests...\n');

    const test = async (name, testFn) => {
        try {
            await testFn();
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } catch (error) {
            console.error(`❌ [FAIL] ${name}`);
            console.error(`   Error: ${error.message}`);
            failed++;
        }
    };

    // 1. CORS Unauthorized Origin Test
    await test('CORS rejects unauthorized origin', async () => {
        const res = await fetch(`${API_URL}/health`, {
            headers: { 'Origin': 'http://evil-domain.com' }
        });
        assert(res.headers.get('access-control-allow-origin') !== 'http://evil-domain.com', 'CORS allowed evil domain!');
    });

    // 2. CORS Allowed Origin Test
    await test('CORS allows authorized FRONTEND_URL', async () => {
        const res = await fetch(`${API_URL}/health`, {
            headers: { 'Origin': 'http://localhost:5173' }
        });
        assert(res.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS did not allow valid origin!');
    });

    // 3. Rate Limiting Test
    await test('Rate limiting blocks brute force on /api/auth/login', async () => {
        // The limit is 20 requests per 15 min. We send 21 requests.
        for (let i = 0; i < 22; i++) {
            await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' })
            });
        }
        
        // The 22nd request should return 429
        const finalRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' })
        });
        
        assert(finalRes.status === 429, `Expected 429, got ${finalRes.status}`);
    });

    // 4. Invalid JWT rejected
    await test('Invalid JWT is rejected (401)', async () => {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Cookie: 'token=invalid_garbage_token' }
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    console.log(`\n📊 Security Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
};

runSecurityTests();
