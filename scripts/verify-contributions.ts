
// using global fetch


async function main() {
    const loginUrl = 'http://127.0.0.1:4000/auth/login';
    const contributionsUrl = 'http://127.0.0.1:4000/contributions';

    console.log('1. Logging in...');
    try {
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user@example.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json() as any;
        console.log('Login response:', JSON.stringify(loginData, null, 2));
        const token = loginData.accessToken || loginData.access_token; // Check both camel and snake case
        console.log('Login successful. Token obtained.');

        console.log('1.5. Syncing contributions...');
        const syncRes = await fetch('http://127.0.0.1:4000/contributions/sync', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (syncRes.ok) {
            console.log('Sync successful:', await syncRes.json());
        } else {
            console.error('Sync failed:', await syncRes.text());
        }

        console.log('2. Fetching contributions...');
        const contribRes = await fetch(contributionsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!contribRes.ok) {
            console.error('Contributions fetch failed:', await contribRes.text());
            return;
        }

        const contributions = await contribRes.json();
        console.log('Contributions data:', JSON.stringify(contributions, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
