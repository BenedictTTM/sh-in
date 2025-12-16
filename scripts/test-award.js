async function testAward() {
    const API_URL = 'http://localhost:4000';
    const email = 'user@example.com';
    const password = 'password123';

    try {
        console.log('1. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', loginRes.status, await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData.token || loginData.access_token;
        if (!token) {
            console.error('Login failed: No token received', loginData);
            return;
        }
        console.log('Login successful.');

        console.log('2. Checking initial energy...');
        const initialStatsRes = await fetch(`${API_URL}/energy`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const initialStats = await initialStatsRes.json();
        console.log('Initial Energy:', initialStats.energy);

        console.log('3. Awarding 6 Energy Bars...');
        const awardRes = await fetch(`${API_URL}/energy/award`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: 6,
                reason: 'Test Script Award'
            })
        });

        const awardData = await awardRes.json();
        console.log('Award Response:', awardData);

        if (awardRes.ok && awardData.success && awardData.currentEnergy >= 6) {
            console.log('SUCCESS: Energy awarded successfully!');
        } else {
            console.error('FAILURE: Energy award response unexpected.');
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

testAward();
