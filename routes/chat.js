const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Chat = require('../models/Chat');
const logger = require('../config/logger');
const sendEmail = require('../utils/sendEmail');

router.post('/chat', [
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
      timestamp: new Date(),
    });

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

      // Send email to admin if this is a new request
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
        timestamp: new Date(),
      });
      await chat.save();

      return res.json({
        message: 'Your request has been sent to a human agent. Please wait for a response.',
        awaitingHuman: true,
        userId: chat.userId,
      });
    }

    // Handle follow-up email request
    if (message.toLowerCase().includes('follow-up email request')) {
      try {
        await sendEmail(
          email,
          'Follow-Up: Eco Packaging Support',
          `Hi ${name},\n\nThank you for reaching out! We’re sorry we couldn’t connect you with a human agent. We’ll follow up with you soon.\n\nBest,\nEco Packaging Team`
        );
      } catch (emailErr) {
        console.error('Failed to send follow-up email to user:', emailErr);
      }

      await chat.save();
      return res.json({ message: 'Follow-up email sent successfully' });
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
          { role: 'system', content: 'You are a helpful assistant for an e-commerce packaging company.' },
          { role: 'user', content: message },
        ],
      });
      aiResponse = response.choices[0].message.content;
    } catch (openAiErr) {
      console.error('OpenAI API error:', openAiErr.message);
      aiResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again later or type 'talk to human' to speak with a human agent.";
    }
    console.log('OpenAI response:', aiResponse);

    // Add the AI response to the chat session
    chat.messages.push({
      text: aiResponse,
      sender: 'bot',
      timestamp: new Date(),
    });

    // Save the chat as a lead if it's a new chat
    const lead = await Lead.findOne({ email });
    if (!lead) {
      const newLead = new Lead({
        name,
        email,
        source: 'Chat Widget',
        date: new Date().toISOString().split('T')[0],
        message: `${message} | AI Response: ${aiResponse}`,
      });
      await newLead.save();
      chat.userId = newLead._id.toString();
    } else {
      chat.userId = lead._id.toString();
    }

    await chat.save();

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
router.get('/chat/history', async (req, res) => {
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
router.get('/chat/all', async (req, res) => {
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

router.delete('/chat/clear', async (req, res) => {
    try {
      await Chat.deleteMany({});
      res.json({ message: 'All chat history cleared successfully' });
    } catch (err) {
      console.error('Error clearing chat history:', err.message, err.stack);
      res.status(500).json({ error: 'Server error: ' + err.message });
    }
  });

module.exports = router;