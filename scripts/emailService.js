// Email service using nodemailer
// You'll need to install: npm install nodemailer

const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  async init() {
    // Configure your email service here
    // Example with Gmail:
    this.transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });

    // For other services like SendGrid, Mailgun, etc., configure accordingly
    // Example with SendGrid:
    /*
    this.transporter = nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
    */

    // Test connection (optional)
    try {
      if (this.transporter) {
        await this.transporter.verify();
        console.log("✅ Email service connected successfully");
      }
    } catch (error) {
      console.log("❌ Email service connection failed:", error.message);
    }
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        console.log(
          "Email service not configured - Email would be sent to:",
          to
        );
        return { success: false, message: "Email service not configured" };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@bsaraha.com",
        to,
        subject,
        html,
        text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, message: error.message };
    }
  }

  // Email templates
  getVerificationEmailTemplate(username, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    return {
      subject: "تأكيد البريد الإلكتروني - Bsaraha",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>تأكيد البريد الإلكتروني</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً ${username}! 👋</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">أهلاً بك في منصة بصراحة</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">تأكيد البريد الإلكتروني</h2>
            <p>شكراً لتسجيلك في منصة بصراحة! لإكمال عملية التسجيل، يرجى النقر على الزر أدناه لتأكيد بريدك الإلكتروني.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold;
                        font-size: 16px;
                        display: inline-block;">
                تأكيد البريد الإلكتروني ✅
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              إذا لم تستطع النقر على الزر، يمكنك نسخ الرابط التالي ولصقه في المتصفح:
            </p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 14px;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا الإيميل.<br>
              هذا الرابط صالح لمدة 24 ساعة فقط.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        مرحباً ${username}!
        
        شكراً لتسجيلك في منصة بصراحة! لإكمال عملية التسجيل، يرجى زيارة الرابط التالي لتأكيد بريدك الإلكتروني:
        
        ${verificationUrl}
        
        هذا الرابط صالح لمدة 24 ساعة فقط.
        
        إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا الإيميل.
      `,
    };
  }

  getPasswordResetTemplate(username, resetCode) {
    return {
      subject: "إعادة تعيين كلمة المرور - Bsaraha",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>إعادة تعيين كلمة المرور</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً ${username}! 🔐</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">طلب إعادة تعيين كلمة المرور</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">كود إعادة تعيين كلمة المرور</h2>
            <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الكود التالي لإعادة تعيين كلمة مرور جديدة:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #e9ecef; 
                          padding: 20px; 
                          border-radius: 10px; 
                          font-size: 32px; 
                          font-weight: bold; 
                          letter-spacing: 5px; 
                          color: #495057;
                          font-family: monospace;">
                ${resetCode}
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ تحذير:</strong> هذا الكود صالح لمدة 10 دقائق فقط. إذا لم تستخدمه خلال هذه المدة، ستحتاج لطلب كود جديد.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.<br>
              حسابك آمن ولا حاجة لاتخاذ أي إجراء.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        مرحباً ${username}!
        
        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.
        
        كود إعادة التعيين: ${resetCode}
        
        هذا الكود صالح لمدة 10 دقائق فقط.
        
        إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.
      `,
    };
  }

  getNewMessageNotificationTemplate(recipientName, senderName, isAnonymous) {
    const senderText = isAnonymous ? "رسالة مجهولة" : `رسالة من ${senderName}`;

    return {
      subject: `رسالة جديدة - Bsaraha`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>رسالة جديدة</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💌 رسالة جديدة!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">${senderText}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">مرحباً ${recipientName}!</h2>
            <p>لقد وصلتك رسالة جديدة على منصة بصراحة.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold;
                        font-size: 16px;
                        display: inline-block;">
                عرض الرسائل 📱
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        مرحباً ${recipientName}!
        
        لقد وصلتك رسالة جديدة على منصة بصراحة - ${senderText}
        
        قم بزيارة الرابط التالي لعرض رسائلك:
        ${process.env.FRONTEND_URL}/dashboard
      `,
    };
  }

  // Send specific emails
  async sendVerificationEmail(email, username, verificationToken) {
    const template = this.getVerificationEmailTemplate(
      username,
      verificationToken
    );
    return await this.sendEmail({
      to: email,
      ...template,
    });
  }

  async sendPasswordResetEmail(email, username, resetCode) {
    const template = this.getPasswordResetTemplate(username, resetCode);
    return await this.sendEmail({
      to: email,
      ...template,
    });
  }

  async sendNewMessageNotification(
    email,
    recipientName,
    senderName,
    isAnonymous
  ) {
    const template = this.getNewMessageNotificationTemplate(
      recipientName,
      senderName,
      isAnonymous
    );
    return await this.sendEmail({
      to: email,
      ...template,
    });
  }
}

// Create a singleton instance
const emailService = new EmailService();

module.exports = emailService;
