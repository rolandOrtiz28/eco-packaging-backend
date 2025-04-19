// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html = null) => {
  try {
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // Use Gmail's SMTP server
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER, // Your email address (e.g., Gmail address)
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      },
    });

    // Define email options
    const mailOptions = {
      from: `"EcoLogic Solution Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text, // Plain text version
      ...(html && { html }), // Include HTML version if provided
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message, error.stack);
    throw new Error('Failed to send email: ' + error.message);
  }
};

module.exports = sendEmail;