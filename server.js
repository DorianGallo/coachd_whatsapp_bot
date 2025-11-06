const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

// Load .env file if it exists (for local development)
// In production (Koyeb), environment variables are set at system level
require('dotenv').config({ silent: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables at startup
const requiredEnvVars = ['VERIFY_TOKEN', 'ACCESS_TOKEN', 'PHONE_NUMBER_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ CRITICAL ERROR: Missing required environment variables:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n🔧 Please set these environment variables in Koyeb dashboard or .env file');
    console.error('⚠️  Server will start but webhook functionality will fail!\n');
} else {
    console.log('✅ All required environment variables are set');
    console.log('🔑 VERIFY_TOKEN:', process.env.VERIFY_TOKEN?.substring(0, 10) + '...');
    console.log('🔑 PHONE_NUMBER_ID:', process.env.PHONE_NUMBER_ID);
    console.log('🔑 ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? '[SET]' : '[MISSING]');
}

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
    console.log('\n🔐 === WEBHOOK VERIFICATION REQUEST ===');
    console.log('🔐 Query params:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔐 Expected VERIFY_TOKEN:', process.env.VERIFY_TOKEN);
    console.log('🔐 Received token:', token);
    console.log('🔐 Tokens match:', token === process.env.VERIFY_TOKEN);
    console.log('🔐 Mode:', mode);
    
    if (!process.env.VERIFY_TOKEN) {
        console.error('❌ VERIFY_TOKEN not set in environment variables!');
        return res.sendStatus(500);
    }
    
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED - Sending challenge:', challenge);
        res.status(200).send(challenge);
    } else {
        console.log('❌ Verification failed');
        console.log('   - Mode is "subscribe":', mode === 'subscribe');
        console.log('   - Token matches:', token === process.env.VERIFY_TOKEN);
        res.sendStatus(403);
    }
    console.log('🔐 === END VERIFICATION ===\n');
});

// Webhook handler
app.post('/webhook', async (req, res) => {
    console.log('\n📨 === INCOMING WEBHOOK POST ===');
    console.log('📨 Timestamp:', new Date().toISOString());
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const body = req.body;
        
        // Return 200 immediately to acknowledge receipt
        res.status(200).send('EVENT_RECEIVED');
        console.log('✅ Acknowledged webhook with 200 OK');

        console.log('🔍 Webhook object:', body.object);
        console.log('🔍 Webhook entries count:', body.entry?.length);

        if (body.object === 'whatsapp_business_account' && body.entry) {
            for (const entry of body.entry) {
                console.log('🔍 Entry ID:', entry.id);
                console.log('🔍 Entry changes count:', entry.changes?.length);
                
                for (const change of entry.changes) {
                    console.log('🔍 Change field:', change.field);
                    console.log('🔍 Change value type:', typeof change.value);
                    
                    if (change.field === 'messages' && change.value) {
                        console.log('🔍 Messages array:', change.value.messages);
                        const message = change.value.messages?.[0];
                        
                        if (message) {
                            console.log('📱 Message details:', {
                                from: message.from,
                                type: message.type,
                                timestamp: message.timestamp,
                                text: message.text?.body
                            });
                            
                            if (message.type === 'text' && message.text?.body) {
                                console.log('🚀 Processing text message from:', message.from, 'text:', message.text.body);
                                await handleIncomingMessage(message);
                            } else {
                                console.log('⚠️ Ignoring non-text message type:', message.type);
                            }
                        } else {
                            console.log('⚠️ No message found in messages array');
                        }
                    } else {
                        console.log('⚠️ Ignoring non-message change field:', change.field);
                    }
                }
            }
        } else {
            console.log('❌ Invalid webhook object or no entries:', body.object);
        }
    } catch (error) {
        console.error('💥 Error in webhook:', error);
        console.error('💥 Error stack:', error.stack);
    }
});

async function handleIncomingMessage(message) {
    const userPhone = message.from;
    const userMessage = message.text.body.toLowerCase().trim();
    
    console.log(`🤖 Handling message from ${userPhone}: "${userMessage}"`);
    
    try {
        console.log('🔄 Calling handleMessage function...');
        const response = await handleMessage(userMessage, userPhone);
        console.log('✅ handleMessage returned:', response);
        
        console.log('🔄 Sending WhatsApp response...');
        await sendWhatsAppMessage(userPhone, response);
        console.log('✅ Response sent successfully');
        
    } catch (error) {
        console.error('💥 Error handling message:', error);
        console.error('💥 Error stack:', error.stack);
        
        await sendWhatsAppMessage(userPhone, 
            "⚠️ Lo siento, ha ocurrido un error. Por favor, intenta nuevamente."
        );
    }
}

async function sendWhatsAppMessage(to, message) {
    try {
        console.log('\n📤 === SENDING WHATSAPP MESSAGE ===');
        console.log('📤 To:', to);
        console.log('📤 Message content:', message);
        console.log('📤 PHONE_NUMBER_ID:', process.env.PHONE_NUMBER_ID);
        console.log('📤 ACCESS_TOKEN present:', !!process.env.ACCESS_TOKEN);
        
        if (!process.env.PHONE_NUMBER_ID || !process.env.ACCESS_TOKEN) {
            throw new Error('Missing PHONE_NUMBER_ID or ACCESS_TOKEN in environment variables');
        }
        
        const url = `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`;
        console.log('📤 API URL:', url);
        
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
        console.log('✅ Message sent successfully:', response.data);
        console.log('📤 === END SEND MESSAGE ===\n');
        return response.data;
    } catch (error) {
        console.error('\n💥 === ERROR SENDING MESSAGE ===');
        console.error('💥 Status:', error.response?.status);
        console.error('💥 Status Text:', error.response?.statusText);
        console.error('💥 Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('💥 Error Message:', error.message);
        console.error('💥 === END ERROR ===\n');
        throw error;
    }
}

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 WhatsApp Bot Server Started');
    console.log('========================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🏠 Root endpoint: http://localhost:${PORT}/`);
    console.log(`🔗 Webhook: http://localhost:${PORT}/webhook`);
    console.log('========================================\n');
    
    // Log environment status
    console.log('🔍 Environment Status:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   VERIFY_TOKEN:', process.env.VERIFY_TOKEN ? '✅ SET' : '❌ MISSING');
    console.log('   ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? '✅ SET' : '❌ MISSING');
    console.log('   PHONE_NUMBER_ID:', process.env.PHONE_NUMBER_ID ? '✅ SET' : '❌ MISSING');
    console.log('\n🎧 Waiting for webhooks...\n');
});
