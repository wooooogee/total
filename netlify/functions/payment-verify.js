const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imp_uid, merchant_uid, amount } = JSON.parse(event.body);

    // 1. Get PortOne Access Token
    const getToken = await axios.post('https://api.iamport.kr/users/getToken', {
      imp_key: process.env.PORTONE_API_KEY,
      imp_secret: process.env.PORTONE_API_SECRET
    });
    const accessToken = getToken.data.response.access_token;

    // 2. Fetch Payment Info from PortOne
    const getPaymentData = await axios.get(`https://api.iamport.kr/payments/${imp_uid}`, {
      headers: { Authorization: accessToken }
    });
    const paymentData = getPaymentData.data.response;

    // 3. Verify Amount
    if (paymentData.amount === amount) {
      // In a real app, update DB here
      // await updateDatabase(merchant_uid, 'completed');
      
      // 4. Trigger Alimtalk (Mock call)
      // await triggerSolapi(paymentData);

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Payment verified and recorded successfully.',
          data: paymentData
        })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Amount mismatch! Possible forgery.' })
      };
    }

  } catch (error) {
    console.error('Payment Verification Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
