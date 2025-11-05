const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Import menu flows
const { handleMessage, getMainMenu } = require('./flows/menuFlows');

// Webhook verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Webhook handler
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages') {
                        const message = change.value.messages?.[0];
                        if (message && message.type === 'text') {
                            await handleIncomingMessage(message);
                        }
                    }
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error in webhook:', error);
        res.sendStatus(500);
    }
});

async function handleIncomingMessage(message) {
    const userPhone = message.from;
    const userMessage = message.text.body.toLowerCase().trim();
    
    console.log(`Received message from ${userPhone}: ${userMessage}`);
    
    try {
        const response = await handleMessage(userMessage, userPhone);
        await sendWhatsAppMessage(userPhone, response);
    } catch (error) {
        console.error('Error handling message:', error);
        await sendWhatsAppMessage(userPhone, 
            "⚠️ Lo siento, ha ocurrido un error. Por favor, intenta nuevamente."
        );
    }
}

async function sendWhatsAppMessage(to, message) {
    try {
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
        console.log('Message sent successfully:', response.data);
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
