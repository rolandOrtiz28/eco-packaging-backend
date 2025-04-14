const twilio = require('twilio');

const sendChatRequestSmsToAdmins = async ({ name, email, message, userId, timestamp }) => {
  try {
    console.debug('sendChatRequestSmsToAdmins: Initializing Twilio SMS for chat request', { userId, email });
    if (!process.env.ADMIN_PHONE_NUMBERS) {
      throw new Error('ADMIN_PHONE_NUMBERS is not defined in .env file');
    }

    const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const adminPhoneNumbers = process.env.ADMIN_PHONE_NUMBERS.split(',');

    const smsBody = `Chat Request\nUser: ${name} (${email})\nMessage: ${message}\nUserId: ${userId}\nTime: ${new Date(timestamp).toLocaleString()}`;

    for (const phoneNumber of adminPhoneNumbers) {
      try {
        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber.trim(),
        });
        console.debug('sendChatRequestSmsToAdmins: SMS sent successfully', { phoneNumber, userId });
      } catch (smsErr) {
        console.error('sendChatRequestSmsToAdmins: Failed to send SMS', { phoneNumber, error: smsErr.message });
      }
    }
  } catch (twilioErr) {
    console.error('sendChatRequestSmsToAdmins: Failed to initialize Twilio or send SMS', { error: twilioErr.message });
  }
};

module.exports = { sendChatRequestSmsToAdmins };