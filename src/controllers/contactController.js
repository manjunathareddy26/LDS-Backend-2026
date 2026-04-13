const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Submit contact form
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, company, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, and message are required' 
      });
    }

    // Email content for admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: 'communications@ahoosocial.com',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">Contact Details</h3>
            
            <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            ${company ? `<p style="margin: 8px 0;"><strong>Company:</strong> ${company}</p>` : ''}
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">Message</h3>
            <p style="margin: 0; line-height: 1.6; color: #475569;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
            This email was sent from Learn Data Skill contact form on ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    // Confirmation email for user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Learn Data Skill',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">Thank You for Reaching Out!</h2>
          
          <p style="color: #475569; line-height: 1.6;">
            Hi ${name},
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            Thank you for contacting Learn Data Skill. We have received your message and will get back to you as soon as possible.
          </p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e293b;">Your Message:</h3>
            <p style="margin: 0; color: #64748b; font-style: italic;">"${message}"</p>
          </div>
          
          <p style="color: #475569; line-height: 1.6;">
            In the meantime, feel free to explore our free courses at <a href="https://learndataskills.com/courses" style="color: #3b82f6;">learndataskills.com</a>.
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            Best regards,<br>
            <strong>Learn Data Skill Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="color: #94a3b8; font-size: 12px;">
            This is an automated response. Please do not reply to this email.
          </p>
        </div>
      `
    };

    // Send emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({ 
      success: true, 
      message: 'Thank you for your message! We will get back to you soon.' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message. Please try again later.' 
    });
  }
};
