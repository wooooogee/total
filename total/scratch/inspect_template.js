const EFORMSIGN_API_SERVER = process.env.EFORMSIGN_API_SERVER || 'https://api.eformsign.com';
const EFORMSIGN_SECRET_KEY = process.env.EFORMSIGN_SECRET_KEY || 'test';
const EFORMSIGN_API_KEY = process.env.EFORMSIGN_API_KEY || '3eb1cb36-3d57-4683-9b9b-5993feeb7817';
const EFORMSIGN_MEMBER_ID = process.env.EFORMSIGN_MEMBER_ID || 'bugoon@joeunlife.com';
const TEMPLATE_ID = '4e2f0d0f49a24b7caa89fc9c5baf8506';

async function inspectTemplate() {
    try {
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
        console.log('Auth Response:', authText);
        const authResult = JSON.parse(authText);
        const token = authResult.oauth_token.access_token;
        
        // 특정 템플릿(Form) 상세 정보 조회 (v2.0 정석 경로: /forms/)
        const templateId = '4e2f0d0f49a24b7caa89fc9c5baf8506';
        const response = await fetch(`https://kr-api.eformsign.com/v2.0/api/forms/${templateId}?is_include_config=true`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });


        const result = await response.json();
        const fs = require('fs');
        if (result.config && result.config.step_settings) {
            fs.writeFileSync('scratch/workflow_info.json', JSON.stringify(result.config.step_settings, null, 2));
            console.log('Workflow info saved to scratch/workflow_info.json');
        } else {
            console.log('No step_settings found.');
        }

if (result.templates) {
            result.templates.forEach(t => {
                console.log(`ID: ${t.id}, Name: ${t.name}`);
            });
        } else {
            console.log('No templates found:', JSON.stringify(result, null, 2));
        }



    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectTemplate();
