const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables at startup
const requiredEnvVars = ['VERIFY_TOKEN', 'ACCESS_TOKEN', 'PHONE_NUMBER_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

console.log('\n========================================');
console.log('🚀 WhatsApp Bot Server Starting');
console.log('========================================');

if (missingEnvVars.length > 0) {
    console.error('❌ CRITICAL ERROR: Missing required environment variables:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n🔧 Please set these in Koyeb dashboard');
    process.exit(1); // Exit immediately if env vars are missing
}

console.log('✅ All required environment variables are set');
console.log('🔑 VERIFY_TOKEN:', process.env.VERIFY_TOKEN?.substring(0, 10) + '...');
console.log('🔑 PHONE_NUMBER_ID:', process.env.PHONE_NUMBER_ID);
console.log('🔑 ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? '[SET]' : '[MISSING]');

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Import menu flows
const { handleMessage, getMainMenu } = require('./flow');

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'WhatsApp Business Bot',
        message: 'Service is running',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'WhatsApp Bot is running',
        timestamp: new Date().toISOString()
    });
});

// Webhook verification
app.get('/webhook', (req, res) => {
    console.log('\n🔐 Webhook verification request');
    console.log('Query params:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Expected token:', process.env.VERIFY_TOKEN);
    console.log('Received token:', token);
    console.log('Match:', token === process.env.VERIFY_TOKEN);
    
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Verification failed');
        res.sendStatus(403);
    }
});

// Webhook handler
app.post('/webhook', async (req, res) => {
    console.log('\n📨 Incoming webhook POST');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const body = req.body;
        
        // Return 200 immediately
        res.status(200).send('EVENT_RECEIVED');

        if (body.object === 'whatsapp_business_account' && body.entry) {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages' && change.value) {
                        const message = change.value.messages?.[0];
                        
                        if (message && message.type === 'text' && message.text?.body) {
                            console.log('� Processing message from:', message.from);
                            await handleIncomingMessage(message);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('💥 Webhook error:', error);
    }
});

async function handleIncomingMessage(message) {
    const userPhone = message.from;
    const userMessage = message.text.body.toLowerCase().trim();
    
    console.log(`🤖 Handling: "${userMessage}" from ${userPhone}`);
    
    try {
        const response = await handleMessage(userMessage, userPhone);
        await sendWhatsAppMessage(userPhone, response);
        console.log('✅ Response sent');
    } catch (error) {
        console.error('💥 Error:', error);
        await sendWhatsAppMessage(userPhone, 
            "⚠️ Lo siento, ha ocurrido un error. Por favor, intenta nuevamente."
        );
    }
}

async function sendWhatsAppMessage(to, message) {
    try {
        const url = `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`;
        
        const response = await axios.post(
            url,
            {
                messaging_product: "whatsapp",
                to: to,
                text: { body: message }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Message sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('💥 Send error:', error.response?.data || error.message);
        throw error;
    }
}

app.listen(PORT, () => {
    console.log(`\n🎧 Server listening on port ${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Webhook: http://localhost:${PORT}/webhook\n`);
});
