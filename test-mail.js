const nodemailer = require('nodemailer');

// Replace these values with your SMTP server settings
const smtpHost = 'in-v3.mailjet.com';
const smtpPort = 587; // Usually 587 for TLS or 465 for SSL
const smtpUser = '563d3e5c8cd5646d64d8695cb67dc806';
const smtpPass = '0c2b4cc20dfd3c2d8ebdf9c611a4ff32';

// Replace these values with the sender and recipient details
const fromEmail = 'notification@nitda.gov.ng';
const toEmail = 'alhajee2009@gmail.com';

async function testSmtpConnection() {
  // Create a transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // Verify the connection configuration
  try {
    await transporter.verify();
    console.log('SMTP connection successful!');
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return;
  }

  // Define email options
  let mailOptions = {
    from: fromEmail,
    to: toEmail,
    subject: 'SMTP Test Email',
    text: 'This is a test email to verify SMTP connection settings.',
  };

  // Send an email
  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

testSmtpConnection();
