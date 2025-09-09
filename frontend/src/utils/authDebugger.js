// Debug authentication state
console.log('=== AUTHENTICATION DEBUG ===');

// Check localStorage
console.log('localStorage tokens:');
console.log('- access_token:', localStorage.getItem('access_token'));
console.log('- refresh_token:', localStorage.getItem('refresh_token'));
console.log('- expires_at:', localStorage.getItem('expires_at'));
console.log('- remember_me:', localStorage.getItem('remember_me'));

// Check sessionStorage
console.log('sessionStorage tokens:');
console.log('- access_token:', sessionStorage.getItem('access_token'));
console.log('- refresh_token:', sessionStorage.getItem('refresh_token'));
console.log('- expires_at:', sessionStorage.getItem('expires_at'));

// Check expiration
const expiresAt = localStorage.getItem('expires_at') || sessionStorage.getItem('expires_at');
if (expiresAt) {
    const expiry = new Date(parseInt(expiresAt));
    const now = new Date();
    console.log('Token expires at:', expiry);
    console.log('Current time:', now);
    console.log('Is expired:', now > expiry);
    console.log('Time until expiry:', expiry.getTime() - now.getTime(), 'ms');
}

// Test API call
const testApiCall = async () => {
    try {
        const response = await fetch('http://localhost:8002/api/v1/documents/3/preview?preview_type=auto&max_size=1024', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Test API response status:', response.status);
        const data = await response.text();
        console.log('Test API response:', data);
    } catch (error) {
        console.error('Test API error:', error);
    }
};

testApiCall();