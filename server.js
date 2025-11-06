const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Import menu flows
const menuFlows = require('./flow');

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
    console.log('🔐 Webhook verification called with:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔐 Expected VERIFY_TOKEN:', process.env.VERIFY_TOKEN);
    console.log('🔐 Received token:', token);
    
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Verification failed - mode:', mode, 'token match:', token === process.env.VERIFY_TOKEN);
        res.sendStatus(403);
    }
});

// Webhook handler
app.post('/webhook', async (req, res) => {
    console.log('📨 WEBHOOK RECEIVED - FULL BODY:', JSON.stringify(req.body, null, 2));
    
    try {
        const body = req.body;
        
        // Return 200 immediately to acknowledge receipt
        res.status(200).send('EVENT_RECEIVED');

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

// 🔽 TEMPORARY TEST ROUTE RIGHT HERE 🔽
app.get('/test-meta', (req, res) => {
    console.log('✅ Meta connectivity test successful - Server is reachable');
    res.json({ 
        status: 'reachable', 
        message: 'Meta can reach this server',
        timestamp: new Date().toISOString(),
        webhook_url: 'https://promising-pattie-supportmenu-c14577cc.koyeb.app/webhook'
    });
});
// 🔼 END OF TEMPORARY TEST ROUTE 🔼

async function handleIncomingMessage(message) {
    const userPhone = message.from;
    const userMessage = message.text.body.toLowerCase().trim();
    
    console.log(`🤖 Handling message from ${userPhone}: "${userMessage}"`);
    
    try {
        console.log('🔄 Calling handleMessage function...');
        const response = await menuFlows.handleMessage(userMessage, userPhone);
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
        console.log('📤 Sending message to:', to);
        console.log('📤 Message content:', message);
        
        const response = await axios.post(
            `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
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
        return response.data;
    } catch (error) {
        console.error('💥 Error sending message:');
        console.error('💥 Status:', error.response?.status);
        console.error('💥 Data:', error.response?.data);
        console.error('💥 Message:', error.message);
        throw error;
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🏠 Root endpoint: http://localhost:${PORT}/`);
    console.log(`🔗 Webhook: http://localhost:${PORT}/webhook`);
});
