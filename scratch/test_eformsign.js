require('dotenv').config({ path: '.env.local' });

async function searchEformsignAPI() {
    const EFORMSIGN_API_KEY = '3eb1cb36-3d57-4683-9b9b-5993feeb7817';
    const EFORMSIGN_API_SERVER = 'https://api.eformsign.com';
    const EFORMSIGN_SECRET_KEY = 'test';
    const EFORMSIGN_MEMBER_ID = 'bugoon@joeunlife.com';

    // Get token
    const apiKeyBase64 = Buffer.from(EFORMSIGN_API_KEY).toString('base64');
    const authRes = await fetch(`${EFORMSIGN_API_SERVER}/v2.0/api_auth/access_token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${apiKeyBase64}`,
            'eformsign_signature': `Bearer ${EFORMSIGN_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_id: EFORMSIGN_MEMBER_ID })
    });
    
    if (!authRes.ok) {
        console.log('Auth failed', await authRes.text());
        return;
    }
    const { oauth_token } = await authRes.json();

    // Since we don't have a specific document right now, let's just log what we can do
    console.log('Authenticated successfully.');
}

searchEformsignAPI().catch(console.error);
