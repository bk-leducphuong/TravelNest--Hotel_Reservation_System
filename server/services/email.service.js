const transporter = require('@config/nodemailer.config');
const logger = require('@config/logger.config');
const fs = require('fs');
const path = require('path');

/**
 * Email Service
 * Handles all email sending operations using nodemailer
 */
class EmailService {
  /**
   * Load and process email template
   * @param {string} templateName - Name of the template file (without .html extension)
   * @param {Object} variables - Variables to replace in template
   * @returns {Promise<string>} Processed HTML content
   */
  async loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(
        __dirname,
        '..',
        'email-templates',
        `${templateName}.html`
      );

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templateName}.html`);
      }

      let template = fs.readFileSync(templatePath, 'utf8');

      // Replace variables in template
      Object.keys(variables).forEach((key) => {
        const value = variables[key];
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, value);
      });

      return template;
    } catch (error) {
      logger.error(`Error loading email template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Send email using nodemailer
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content (optional)
   * @param {string} options.from - Sender email (optional, defaults to env variable)
   * @returns {Promise<Object>} Nodemailer send result
   */
  async sendEmail(options) {
    const { to, subject, html, text, from } = options;

    if (!to || !subject || !html) {
      throw new Error('Missing required email fields: to, subject, html');
    }

    try {
      const mailOptions = {
        from: from || process.env.NODEMAILER_EMAIL,
        to,
        subject,
        html,
        text: text || this.htmlToText(html), // Convert HTML to plain text if text not provided
      };

      const info = await transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId,
      });

      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Convert HTML to plain text (simple implementation)
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Format price/amount for display
   * @param {number} amount - Amount in smallest currency unit (e.g., cents)
   * @param {string} currency - Currency code (e.g., 'USD', 'VND')
   * @returns {string} Formatted price string
   */
  formatPrice(amount, currency = 'USD') {
    const numericAmount =
      typeof amount === 'string' ? parseFloat(amount) : amount;

    // Convert from cents to dollars for USD
    const displayAmount =
      currency === 'USD' ? numericAmount / 100 : numericAmount;

    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(displayAmount);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(displayAmount);
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date string or Date object
   * @param {string} locale - Locale string (default: 'en-US')
   * @returns {string} Formatted date string
   */
  formatDate(date, locale = 'en-US') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }

  /**
   * Send booking confirmation email
   * @param {Object} data - Booking confirmation data
   * @param {string} data.email - Recipient email
   * @param {string} data.bookingCode - Booking code
   * @param {string} data.checkInDate - Check-in date
   * @param {string} data.checkOutDate - Check-out date
   * @param {number} data.numberOfGuests - Number of guests
   * @param {number} data.totalPrice - Total price (in cents)
   * @param {string} data.currency - Currency code (default: 'USD')
   * @param {string} data.hotelName - Hotel name (optional)
   * @param {string} data.roomType - Room type (optional)
   * @param {string} data.buyerName - Buyer name (optional)
   * @returns {Promise<Object>} Email send result
   */
  async sendBookingConfirmation(data) {
    const {
      email,
      bookingCode,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      totalPrice,
      currency = 'USD',
      hotelName,
      roomType,
      buyerName = 'Guest',
    } = data;

    try {
      const html = await this.loadTemplate('thankyou', {
        bookingCode: bookingCode || 'N/A',
        checkInDate: this.formatDate(checkInDate),
        checkOutDate: this.formatDate(checkOutDate),
        numberOfGuests: numberOfGuests || 1,
        totalPrice: this.formatPrice(totalPrice, currency),
        hotelName: hotelName || 'Our Hotel',
        roomType: roomType || 'Standard Room',
        buyerName: buyerName,
      });

      return await this.sendEmail({
        to: email,
        subject: `Booking Confirmation - ${bookingCode}`,
        html,
      });
    } catch (error) {
      logger.error('Error sending booking confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send payment failure email
   * @param {Object} data - Payment failure data
   * @param {string} data.email - Recipient email
   * @param {string} data.failureMessage - Failure message
   * @param {string} data.bookingCode - Booking code (optional)
   * @param {string} data.buyerName - Buyer name (optional)
   * @returns {Promise<Object>} Email send result
   */
  async sendPaymentFailure(data) {
    const { email, failureMessage, bookingCode, buyerName = 'Guest' } = data;

    try {
      // Create a simple failure email template
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .email-header {
              background-color: #dc3545;
              padding: 20px;
              text-align: center;
            }
            .logo {
              color: white;
              font-size: 24px;
              font-weight: bold;
            }
            .email-content {
              padding: 40px 30px;
            }
            .error-message {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
              color: #721c24;
            }
            .cta-button {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #003580;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
            }
            .email-footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <div class="logo">TravelNest</div>
            </div>
            <div class="email-content">
              <h1>Payment Failed</h1>
              <p>Dear ${buyerName},</p>
              <p>We regret to inform you that your payment could not be processed.</p>
              ${bookingCode ? `<p><strong>Booking Code:</strong> ${bookingCode}</p>` : ''}
              <div class="error-message">
                <strong>Error:</strong> ${failureMessage || 'Payment processing failed. Please try again.'}
              </div>
              <p>Please try the following:</p>
              <ul>
                <li>Check your payment method details</li>
                <li>Ensure you have sufficient funds</li>
                <li>Try using a different payment method</li>
                <li>Contact your bank if the issue persists</li>
              </ul>
              <div class="cta-button">
                <a href="${process.env.CLIENT_HOST || 'http://localhost:5173'}/book" class="button">Try Again</a>
              </div>
              <p>If you continue to experience issues, please contact our support team.</p>
              <p>Best regards,<br />The TravelNest Team</p>
            </div>
            <div class="email-footer">
              <p>© ${new Date().getFullYear()} TravelNest. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: email,
        subject: 'Payment Failed - Action Required',
        html,
      });
    } catch (error) {
      logger.error('Error sending payment failure email:', error);
      throw error;
    }
  }

  /**
   * Send refund confirmation email
   * @param {Object} data - Refund data
   * @param {string} data.email - Recipient email
   * @param {string} data.bookingCode - Booking code
   * @param {number} data.refundAmount - Refund amount (in cents)
   * @param {string} data.currency - Currency code (default: 'USD')
   * @param {string} data.buyerName - Buyer name (optional)
   * @param {string} data.reason - Refund reason (optional)
   * @returns {Promise<Object>} Email send result
   */
  async sendRefundConfirmation(data) {
    const {
      email,
      bookingCode,
      refundAmount,
      currency = 'USD',
      buyerName = 'Guest',
      reason,
    } = data;

    try {
      const html = await this.loadTemplate('cancelBooking', {
        bookingCode: bookingCode || 'N/A',
        refundAmount: this.formatPrice(refundAmount, currency),
        buyerName: buyerName,
        reason: reason || 'Requested by customer',
      });

      return await this.sendEmail({
        to: email,
        subject: `Refund Processed - Booking ${bookingCode}`,
        html,
      });
    } catch (error) {
      logger.error('Error sending refund confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send OTP verification email
   * @param {Object} data - OTP data
   * @param {string} data.email - Recipient email
   * @param {string} data.otp - OTP code
   * @param {string} data.userName - User name (optional)
   * @returns {Promise<Object>} Email send result
   */
  async sendOTPVerification(data) {
    const { email, otp, userName = 'User' } = data;

    try {
      const html = await this.loadTemplate('otpVerification', {
        otp: otp,
        userName: userName,
      });

      return await this.sendEmail({
        to: email,
        subject: 'Verify Your Email - OTP Code',
        html,
      });
    } catch (error) {
      logger.error('Error sending OTP verification email:', error);
      throw error;
    }
  }

  /**
   * Send generic email with custom template
   * @param {Object} data - Email data
   * @param {string} data.email - Recipient email
   * @param {string} data.subject - Email subject
   * @param {string} data.templateName - Template name (without .html)
   * @param {Object} data.variables - Template variables
   * @returns {Promise<Object>} Email send result
   */
  async sendTemplateEmail(data) {
    const { email, subject, templateName, variables = {} } = data;

    try {
      const html = await this.loadTemplate(templateName, variables);

      return await this.sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      logger.error(`Error sending template email (${templateName}):`, error);
      throw error;
    }
  }

  /**
   * Send custom HTML email
   * @param {Object} data - Email data
   * @param {string} data.email - Recipient email
   * @param {string} data.subject - Email subject
   * @param {string} data.html - HTML content
   * @param {string} data.text - Plain text content (optional)
   * @returns {Promise<Object>} Email send result
   */
  async sendCustomEmail(data) {
    const { email, subject, html, text } = data;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Verify email transporter connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async verifyConnection() {
    try {
      await transporter.verify();
      logger.info('Email transporter connection verified');
      return true;
    } catch (error) {
      logger.error('Email transporter verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
