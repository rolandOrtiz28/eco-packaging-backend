const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Chat = require('../models/Chat');
const logger = require('../config/logger');
const sendEmail = require('../utils/sendEmail');

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
    console.log('Submitting chat message:', req.body);
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

    // Check if user wants to talk to a human
    const wantsHuman = message.toLowerCase().includes('talk to human');
    if (wantsHuman) {
      console.log('User requested to talk to a human');
      const lead = await Lead.findOne({ email });
      if (!lead) {
        const newLead = new Lead({
          name,
          email,
          source: 'Chat Widget',
          date: new Date().toISOString().split('T')[0],
          message: 'Requested to talk to a human',
        });
        await newLead.save();
        chat.userId = newLead._id.toString();
      } else {
        chat.userId = lead._id.toString();
      }

      if (!chat.messages.some(msg => msg.text.includes('Your request has been sent to a human agent'))) {
        try {
          await sendEmail(
            process.env.ADMIN_EMAIL,
            'Chat Request: User Wants to Speak with a Human',
            `User ${name} (${email}) has requested to speak with a human. Message: ${message}`
          );
        } catch (emailErr) {
          console.error('Failed to send email to admin:', emailErr);
        }
      }

      chat.messages.push({
        text: 'Your request has been sent to a human agent. Please wait for a response.',
        sender: 'bot',
        name: 'EcoBuddy',
        timestamp: new Date(),
      });
      await chat.save();

      req.app.get('io').to(chat.userId).emit('message', {
        userId: chat.userId,
        text: 'Your request has been sent to a human agent. Please wait for a response.',
        sender: 'bot',
        name: 'EcoBuddy',
        timestamp: new Date().toISOString(),
      });

      return res.json({
        message: 'Your request has been sent to a human agent. Please wait for a response.',
        awaitingHuman: true,
        userId: chat.userId,
      });
    }

    // If an admin is connected, skip AI response and do not emit duplicate message
    if (isAdminConnected) {
      console.log('Admin is connected, skipping AI response and message emission for user message:', message);
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

Provide detailed and accurate responses based on this information. If the user asks about something not covered in the data, respond politely and suggest they contact the support team by typing "talk to human".`
          },
          { role: 'user', content: message },
        ],
      });
      aiResponse = response.choices[0].message.content;
    } catch (openAiErr) {
      console.error('OpenAI API error:', openAiErr.message);
      aiResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again later or type 'talk to human' to speak with a human agent.";
    }
    console.log('OpenAI response:', aiResponse);

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
    console.error('Error processing chat message:', err.message, err.stack);
    logger.error('Error processing chat message:', err.message, err.stack);
    await sendEmail(
      process.env.ADMIN_EMAIL,
      'Error: Chat Message Save Failed',
      `Failed to save chat message for user ${req.body.email}. Error: ${err.message}`
    );
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Endpoint to retrieve chat history (used by admin)
router.get('/history', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const chat = await Chat.findOne({ email });
    if (!chat) {
      return res.status(404).json({ error: 'No chat history found' });
    }

    res.json({ messages: chat.messages, userId: chat.userId });
  } catch (err) {
    console.error('Error retrieving chat history:', err.message, err.stack);
    logger.error('Error retrieving chat history:', err.message, err.stack);
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
    const chats = await Chat.find({});
    res.json(chats);
  } catch (err) {
    console.error('Error retrieving all chats:', err.message, err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Endpoint to update chat session email
router.put('/update-email', async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;
    if (!oldEmail || !newEmail) {
      return res.status(400).json({ error: 'Old and new email are required' });
    }

    const chat = await Chat.findOne({ email: oldEmail });
    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    chat.email = newEmail;
    await chat.save();

    res.json({ message: 'Chat session email updated successfully' });
  } catch (err) {
    console.error('Error updating chat session email:', err.message, err.stack);
    logger.error('Error updating chat session email:', err.message, err.stack);
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
    await Chat.deleteMany({});
    res.json({ message: 'All chat history cleared successfully' });
  } catch (err) {
    console.error('Error clearing chat history:', err.message, err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
