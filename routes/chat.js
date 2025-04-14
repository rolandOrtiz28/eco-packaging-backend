const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Chat = require('../models/Chat');
const logger = require('../config/logger');
const sendEmail = require('../utils/sendEmail');
const { sendChatRequestSmsToAdmins } = require('../utils/sendSms');

// Company data (unchanged)
const companyData = {
  "company": {
    "name": "Eco Packaging Products Inc. (BagStory USA)",
    "headquarters": "New York, USA",
    "productionBase": "China",
    "certification": "ISO 9001:2000",
    "website": "https://bagstoryusa.com",
    "businessPhilosophy": [
      "Customer-centricity",
      "Innovation",
      "Ethics and social responsibility",
      "Continuous improvement"
    ],
    "sustainability": {
      "circularEconomy": true,
      "recyclingProgram": true,
      "lowCarbonLogistics": true
    },
    "coreStrengths": [
      "Self-built vertical production ecosystem with circular economy model",
      "Comprehensive East Coast US distribution and warehouse system",
      "Flexible small-batch order consolidation services",
      "Strategic freight partnerships for global logistics advantages",
      "Expert customs clearance and transport management"
    ]
  },
  "products": [
    {
      "id": 1,
      "name": "Wine Vest Bag (1/2 Two Bottle Wine Bag)",
      "size": "19.5H × 8W × 4GW in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 1000,
      "price": {
        "1–5 Cases": 0.1,
        "6–50 Cases": 0.09,
        "50+ Cases": "Contact office"
      },
      "use": "Wine & Liquor Bags"
    },
    {
      "id": 2,
      "name": "Small Vest Bag (1/10 Small)",
      "size": "16H × 8W × 4GW in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 1000,
      "price": {
        "1–5 Cases": 0.1,
        "6–50 Cases": 0.09,
        "50+ Cases": "Contact office"
      },
      "use": "Beer, Snacks, Deli’s"
    },
    {
      "id": 3,
      "name": "Medium Vest Bag (1/8 Medium)",
      "size": "18H × 10W × 5GW in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 1000,
      "price": {
        "1–5 Cases": 0.11,
        "6–50 Cases": 0.09,
        "50+ Cases": "Contact office"
      },
      "use": "6-pack, Deli, Liquor store"
    },
    {
      "id": 4,
      "name": "Large Vest Bag (1/6 Medium Duty)",
      "size": "22H × 11.8W × 7GW in",
      "color": [
        "Black",
        "White",
        "Green",
        "Yellow"
      ],
      "material": "Premium Non-Woven",
      "caseQty": 600,
      "price": {
        "1–5 Cases": 0.12,
        "6–50 Cases": 0.1,
        "50+ Cases": "Contact office"
      },
      "use": "Deli & Supermarkets"
    },
    {
      "id": 5,
      "name": "Large+ Vest Bag (1/6 Plus, A Bit Larger)",
      "size": "22.5H × 13W × 7GW in",
      "color": [
        "Black",
        "White"
      ],
      "material": "Premium Non-Woven",
      "caseQty": 500,
      "price": {
        "1–5 Cases": 0.13,
        "6–50 Cases": 0.11,
        "50+ Cases": "Contact office"
      },
      "use": "Mini Mart, Supermarket"
    },
    {
      "id": 6,
      "name": "2X-Large Vest Bag (1/4 XX-Large)",
      "size": "23.5H × 18.7W × 7GW in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 400,
      "price": {
        "1–5 Cases": 0.2,
        "6–50 Cases": 0.18,
        "50+ Cases": "Contact office"
      },
      "use": "Supermarket, 99¢ stores"
    },
    {
      "id": 7,
      "name": "Jumbo Size (Supersized Jumbo)",
      "size": "29H × 18W × 7GW in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 1500,
      "price": {
        "1–5 Bundles": 0.21,
        "5+ Bundles": 0.19,
        "50+ Bundles": "Contact office"
      },
      "use": "99¢ Store, Wholesaler, Supermarket"
    },
    {
      "id": 8,
      "name": "Heavy Duty Large Vest Bag (1/6 Large)",
      "size": "22H × 11.8W × 7D in",
      "color": "White",
      "material": "Premium Non-Woven",
      "caseQty": 500,
      "price": {
        "1–5 Cases": 0.16,
        "6–50 Cases": 0.135,
        "50+ Cases": "Contact office"
      },
      "use": "Heavy duty, supports 50 lbs"
    },
    {
      "id": 9,
      "name": "Die Cut Handle",
      "size": "15H × 11W in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 1000,
      "price": {
        "1–5 Cases": 0.11,
        "6–50 Cases": 0.1,
        "50+ Cases": "Contact office"
      },
      "use": "Book store, Game shops"
    },
    {
      "id": 10,
      "name": "2 Bottle Wine Tote Bag",
      "size": "14H × 8W × 4D in",
      "color": "Grey",
      "material": "Premium Non-Woven",
      "caseQty": 400,
      "price": {
        "1–5 Cases": 0.18,
        "6–50 Cases": 0.17,
        "50+ Cases": "Contact office"
      },
      "use": "Liquor stores"
    },
    {
      "id": 11,
      "name": "Large 1/6 Tote Bag",
      "size": "14H × 11.5W × 7D in",
      "color": "Grey",
      "material": "Premium Non-Woven",
      "caseQty": 300,
      "price": {
        "1–5 Cases": 0.22,
        "6–50 Cases": 0.2,
        "50+ Cases": "Contact office"
      },
      "use": "Grocery/Deli"
    },
    {
      "id": 12,
      "name": "Jumbo Grocery Tote Bag",
      "size": "15H × 14W × 8GW in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 300,
      "price": {
        "1–5 Cases": 0.25,
        "6–50 Cases": 0.23,
        "50+ Cases": "Contact office"
      },
      "use": "Retail/Supermarket"
    },
    {
      "id": 13,
      "name": "Thermal Insulated Tote Bag",
      "size": "15H × 13W × 10D in",
      "color": [
        "Black",
        "White",
        "Green",
        "Yellow"
      ],
      "material": "Premium Non-Woven",
      "caseQty": 100,
      "note": "Patented smart fabric multi layered and coated thermal film bag",
      "price": {
        "1–5 Cases": 3.5,
        "6–50 Cases": 3.0
      },
      "use": "Lunch, Delivery, Groceries"
    },
    {
      "id": 14,
      "name": "Heavy Duty Grocery Tote Bag",
      "size": "15H × 13W × 10D in",
      "color": "Black",
      "material": "Premium Non-Woven",
      "caseQty": 100,
      "note": "PVC board on bottom, hand stitched",
      "price": {
        "1–5 Cases": 2.5,
        "6–50 Cases": 2.0,
        "50+ Cases": "Contact office"
      },
      "use": "Everyday shopping bag"
    },
    {
      "id": 15,
      "name": "6 Bottle Wine Bag",
      "size": "15H × 11W × 8.5GW in",
      "color": [
        "Black",
        "Red Burgundy"
      ],
      "material": "Premium Non-Woven",
      "caseQty": 100,
      "note": "6 bottle carrier with separator and PVC board, Hand Stitched",
      "price": {
        "1 Case": 200.0,
        "50+ Cases": "Contact office"
      },
      "use": "Liquor Store"
    },
    {
      "id": 16,
      "name": "Mylar Film Gift Bag",
      "size": "20H × 9.5W in",
      "color": "White Flash",
      "material": "PVC Film",
      "caseQty": 500,
      "note": "Ribbon not included",
      "price": {
        "1–5 Cases": 0.6,
        "6–50 Cases": 0.5,
        "50+ Cases": "Contact office"
      },
      "use": "Wine Gift Bag"
    }
  ]
};

router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('message').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in chat submission:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.debug('POST /api/chat: Processing chat submission', req.body);
    const { name, email, message } = req.body;

    // Find or create a chat session
    let chat = await Chat.findOne({ email });
    if (!chat) {
      chat = new Chat({
        userId: new Date().getTime().toString(),
        name,
        email,
        messages: [],
      });
    }

    // Add the message to the chat session
    chat.messages.push({
      text: message,
      sender: 'user',
      name: name,
      timestamp: new Date(),
    });

    // Check if an admin is connected to this chat session
    const activeChats = req.app.get('activeChats');
    const isAdminConnected = activeChats?.has(chat.userId);

    // Check if user wants to talk to an admin
    const wantsHuman = message.toLowerCase().includes('speak to admin');
    console.debug('POST /api/chat: Checking for admin request', { wantsHuman, message });
    if (wantsHuman) {
      console.debug('POST /api/chat: User requested to speak to an admin', { email, userId: chat.userId });
      const lead = await Lead.findOne({ email });
      if (!lead) {
        const newLead = new Lead({
          name,
          email,
          source: 'Chat Widget',
          date: new Date().toISOString().split('T')[0],
          message: 'Requested to speak to an admin',
        });
        await newLead.save();
        chat.userId = newLead._id.toString();
      } else {
        chat.userId = lead._id.toString();
      }

      if (!chat.messages.some(msg => msg.text.includes('Your request has been sent to an admin'))) {
        try {
          await sendEmail(
            process.env.ADMIN_EMAIL,
            'Chat Request: User Wants to Speak with an Admin',
            `User ${name} (${email}) has requested to speak with an admin. Message: ${message}`
          );
          console.debug('POST /api/chat: Email notification sent to admin', { email });
          
          // Send SMS notification
          if (!chat.smsNotified) {
            await sendChatRequestSmsToAdmins({
              name,
              email,
              message,
              userId: chat.userId,
              timestamp: new Date(),
            });
            chat.smsNotified = true;
            console.debug('POST /api/chat: SMS notification sent to admins', { userId: chat.userId });
          }
        } catch (emailErr) {
          console.error('POST /api/chat: Failed to send notifications', { error: emailErr.message });
        }
      }

      chat.messages.push({
        text: 'Your request has been sent to an admin. Please wait for a response.',
        sender: 'bot',
        name: 'EcoBuddy',
        timestamp: new Date(),
      });
      await chat.save();

      req.app.get('io').to(chat.userId).emit('message', {
        userId: chat.userId,
        text: 'Your request has been sent to an admin. Please wait for a response.',
        sender: 'bot',
        name: 'EcoBuddy',
        timestamp: new Date().toISOString(),
      });

      return res.json({
        message: 'Your request has been sent to an admin. Please wait for a response.',
        awaitingHuman: true,
        userId: chat.userId,
      });
    }

    // If an admin is connected, skip AI response and do not emit duplicate message
    if (isAdminConnected) {
      console.debug('POST /api/chat: Admin is connected, skipping AI response', { userId: chat.userId });
      await chat.save();
      return res.json({ message: 'Message received, admin is handling the chat.', awaitingHuman: false, userId: chat.userId });
    }

    // Save the chat as a lead if it's a new chat
    const lead = await Lead.findOne({ email });
    if (!lead) {
      const newLead = new Lead({
        name,
        email,
        source: 'Chat Widget',
        date: new Date().toISOString().split('T')[0],
        message,
      });
      await newLead.save();
      chat.userId = newLead._id.toString();
    } else {
      chat.userId = lead._id.toString();
    }

    // Integrate with OpenAI for basic inquiries
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in .env');
      return res.status(500).json({ error: 'OpenAI API key is not configured' });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let aiResponse;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are EcoBuddy, a helpful assistant for Eco Packaging Products Inc. (BagStory USA), an e-commerce packaging company. Use the following company and product information to answer user inquiries accurately:

${JSON.stringify(companyData, null, 2)}

Provide detailed and accurate responses based on this information. If the user asks about something not covered in the data, respond politely and suggest they contact the support team by typing "speak to admin".`
          },
          { role: 'user', content: message },
        ],
      });
      aiResponse = response.choices[0].message.content;
      console.debug('POST /api/chat: OpenAI response received', { aiResponse });
    } catch (openAiErr) {
      console.error('POST /api/chat: OpenAI API error', { error: openAiErr.message });
      aiResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again later or type 'speak to admin' to speak with an admin.";
    }

    chat.messages.push({
      text: aiResponse,
      sender: 'bot',
      name: 'EcoBuddy',
      timestamp: new Date(),
    });

    await chat.save();

    req.app.get('io').to(chat.userId).emit('message', {
      userId: chat.userId,
      text: aiResponse,
      sender: 'bot',
      name: 'EcoBuddy',
      timestamp: new Date().toISOString(),
    });

    req.app.get('io').to('admins').emit('message', {
      userId: chat.userId,
      text: aiResponse,
      sender: 'bot',
      name: 'EcoBuddy',
      timestamp: new Date().toISOString(),
    });

    req.app.get('io').to('admins').emit('new-chat', {
      userId: chat.userId,
      name: chat.name,
      email: chat.email,
      socketId: null,
    });

    res.json({ message: aiResponse, awaitingHuman: false, userId: chat.userId });
  } catch (err) {
    console.error('POST /api/chat: Error processing chat message', { error: err.message, stack: err.stack });
    logger.error('POST /api/chat: Error processing chat message', { error: err.message, stack: err.stack });
    await sendEmail(
      process.env.ADMIN_EMAIL,
      'Error: Chat Message Save Failed',
      `Failed to save chat message for user ${req.body.email}. Error: ${err.message}`
    );
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Endpoint to manage admins (mute, unmute, remove)
router.post('/manage-admin', async (req, res) => {
  try {
    console.debug('POST /api/chat/manage-admin: Received request', req.body);
    const { userId, adminSocketId, action } = req.body;

    if (!userId || !adminSocketId || !action) {
      console.warn('POST /api/chat/manage-admin: Missing required fields', { userId, adminSocketId, action });
      return res.status(400).json({ error: 'userId, adminSocketId, and action are required' });
    }

    if (!['mute', 'unmute', 'remove'].includes(action)) {
      console.warn('POST /api/chat/manage-admin: Invalid action', { action });
      return res.status(400).json({ error: 'Invalid action' });
    }

    const io = req.app.get('io');
    const chatAdmins = req.app.get('chatAdmins');

    if (!chatAdmins.has(userId)) {
      console.warn('POST /api/chat/manage-admin: No admins found for chat', { userId });
      return res.status(404).json({ error: 'No admins found for this chat' });
    }

    const admins = chatAdmins.get(userId);
    if (!admins.has(adminSocketId)) {
      console.warn('POST /api/chat/manage-admin: Target admin not in chat', { userId, adminSocketId });
      return res.status(404).json({ error: 'Target admin not found in chat' });
    }

    if (action === 'mute') {
      admins.set(adminSocketId, { ...admins.get(adminSocketId), muted: true });
      io.to(adminSocketId).emit('admin-muted', { userId });
      console.debug('POST /api/chat/manage-admin: Admin muted', { userId, adminSocketId });
    } else if (action === 'unmute') {
      admins.set(adminSocketId, { ...admins.get(adminSocketId), muted: false });
      io.to(adminSocketId).emit('admin-unmuted', { userId });
      console.debug('POST /api/chat/manage-admin: Admin unmuted', { userId, adminSocketId });
    } else if (action === 'remove') {
      io.sockets.sockets.get(adminSocketId)?.leave(userId);
      admins.delete(adminSocketId);
      io.to(adminSocketId).emit('admin-removed', { userId });
      console.debug('POST /api/chat/manage-admin: Admin removed', { userId, adminSocketId });
    }

    io.to('admins').emit('admin-status-updated', {
      userId,
      adminSocketId,
      action,
    });

    res.json({ message: `Admin ${action}d successfully` });
  } catch (err) {
    console.error('POST /api/chat/manage-admin: Error processing request', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Endpoint to retrieve chat history (used by admin)
router.get('/history', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      console.warn('GET /api/chat/history: Email is required');
      return res.status(400).json({ error: 'Email is required' });
    }

    const chat = await Chat.findOne({ email });
    if (!chat) {
      console.debug('GET /api/chat/history: No chat history found', { email });
      return res.status(404).json({ error: 'No chat history found' });
    }

    console.debug('GET /api/chat/history: Chat history retrieved', { email, userId: chat.userId });
    res.json({ messages: chat.messages, userId: chat.userId });
  } catch (err) {
    console.error('GET /api/chat/history: Error retrieving chat history', { error: err.message, stack: err.stack });
    logger.error('GET /api/chat/history: Error retrieving chat history', { error: err.message, stack: err.stack });
    await sendEmail(
      process.env.ADMIN_EMAIL,
      'Error: Chat History Retrieval Failed',
      `Failed to retrieve chat history for user ${req.query.email}. Error: ${err.message}`
    );
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Endpoint to get all chats (for admin)
router.get('/all', async (req, res) => {
  try {
    console.debug('GET /api/chat/all: Retrieving all chats');
    const chats = await Chat.find({});
    console.debug('GET /api/chat/all: Chats retrieved', { count: chats.length });
    res.json(chats);
  } catch (err) {
    console.error('GET /api/chat/all: Error retrieving chats', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Endpoint to update chat session email
router.put('/update-email', async (req, res) => {
  try {
    console.debug('PUT /api/chat/update-email: Processing email update', req.body);
    const { oldEmail, newEmail } = req.body;
    if (!oldEmail || !newEmail) {
      console.warn('PUT /api/chat/update-email: Missing email fields', { oldEmail, newEmail });
      return res.status(400).json({ error: 'Old and new email are required' });
    }

    const chat = await Chat.findOne({ email: oldEmail });
    if (!chat) {
      console.debug('PUT /api/chat/update-email: Chat session not found', { oldEmail });
      return res.status(404).json({ error: 'Chat session not found' });
    }

    chat.email = newEmail;
    await chat.save();
    console.debug('PUT /api/chat/update-email: Email updated successfully', { oldEmail, newEmail });

    res.json({ message: 'Chat session email updated successfully' });
  } catch (err) {
    console.error('PUT /api/chat/update-email: Error updating email', { error: err.message, stack: err.stack });
    logger.error('PUT /api/chat/update-email: Error updating email', { error: err.message, stack: err.stack });
    await sendEmail(
      process.env.ADMIN_EMAIL,
      'Error: Chat Session Email Update Failed',
      `Failed to update chat session email from ${req.body.oldEmail} to ${req.body.newEmail}. Error: ${err.message}`
    );
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    console.debug('DELETE /api/chat/clear: Clearing all chats');
    await Chat.deleteMany({});
    console.debug('DELETE /api/chat/clear: Chats cleared successfully');
    res.json({ message: 'All chat history cleared successfully' });
  } catch (err) {
    console.error('DELETE /api/chat/clear: Error clearing chats', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;