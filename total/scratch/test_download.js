const EFORMSIGN_API_SERVER = 'https://api.eformsign.com';
const EFORMSIGN_KR_SERVER = 'https://kr-api.eformsign.com';
const EFORMSIGN_MEMBER_ID = 'bugoon@joeunlife.com';
const EFORMSIGN_SECRET_KEY = 'test';
const EFORMSIGN_API_KEY = '3eb1cb36-3d57-4683-9b9b-5993feeb7817';

async function testDownload() {
    // 1. Get Token
    const apiKeyBase64 = Buffer.from(EFORMSIGN_API_KEY).toString('base64');
    const authResponse = await fetch(`${EFORMSIGN_API_SERVER}/v2.0/api_auth/access_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'eformsign_signature': `Bearer ${EFORMSIGN_SECRET_KEY}`,
            'Authorization': `Bearer ${apiKeyBase64}`
        },
        body: JSON.stringify({
            execution_time: Date.now().toString(),
            member_id: EFORMSIGN_MEMBER_ID
        })
    });
    const authText = await authResponse.text();
    const token = JSON.parse(authText).oauth_token.access_token;

    // 2. Try download options for an existing document id
    const testDocId = "fb8a9117f7de4104bd35a0dedf365bc9"; // A recent document if I can find one, I'll use the one from the success later. Let's just retrieve document list first
    
    const listRes = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listRes.json();
    if (!listData.documents || listData.documents.length === 0) {
        console.log('No documents found');
        return;
    }
    const docId = listData.documents[0].id;
    console.log('Testing with Document ID:', docId);

    // Try /download
    const dlRes1 = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${docId}/download_file`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('download_file status:', dlRes1.status);
    
    // Try /files
    const dlRes2 = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${docId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('files status:', dlRes2.status);
    if(dlRes2.ok) console.log(await dlRes2.json());
}

testDownload().catch(console.error);
