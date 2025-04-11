const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail');

// POST /api/contact
router.post(
  '/contact',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, subject, message } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.error("❌ ADMIN_EMAIL is not defined in environment variables");
      return res.status(500).json({
        message: "Server misconfiguration: ADMIN_EMAIL is not set.",
      });
    }

    const emailSubject = subject || "New Contact Form Submission";
    const emailText = `
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}
    `.trim();

    try {
      console.log("📩 Sending contact form email to:", adminEmail);
      await sendEmail(adminEmail, emailSubject, emailText);
      console.log("✅ Contact form email sent");

      res.status(200).json({ message: "Contact form submitted successfully" });
    } catch (error) {
      console.error('❌ Error sending contact form email:', error.message);
      res.status(500).json({ message: "Failed to send email", error: error.message });
    }
  }
);

module.exports = router;
