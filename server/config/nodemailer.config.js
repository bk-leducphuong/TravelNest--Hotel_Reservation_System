const nodemailer = require('nodemailer');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Sử dụng Gmail SMTP server
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Tắt xác thực chứng chỉ
  },
});

module.exports = transporter;
