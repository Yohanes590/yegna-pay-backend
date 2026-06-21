import nodemailer from 'nodemailer';
export async function SendingMessage(email, token) {
    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD
        }
    });
    const mailOptions = {
        from: '"Yegna Pay" <no-reply@yegnapay.com>',
        to: email,
        subject: "Confirm your email - Yegna Pay",
        text: `Welcome to Yegna Pay! Please verify your account by visiting: ${token}`,
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Yegna Pay Account</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F4F7FF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding: 40px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(20, 71, 230, 0.1);">
                        
                        <tr>
                            <td height="6" style="background-color: #1447E6;"></td>
                        </tr>

                        <tr>
                            <td align="left" style="padding: 40px 40px 20px 40px;">
                                <div style="font-size: 24px; font-weight: 800; color: #1447E6; letter-spacing: -1px;">
                                    Yegna<span style="color: #000000;">Pay</span>
                                </div>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 20px 40px 40px 40px;">
                                <h2 style="color: #111827; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Verify your identity</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                    Thanks for joining Yegna Pay. We just need to make sure this email address belongs to you before you can start sending and receiving payments.
                                </p>
                                
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center">
                                            <a href="${process.env.CLIENT_URL}/auth/${token}" target="_blank" style="display: inline-block; background-color: #1447E6; color: #ffffff; padding: 18px 40px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(20, 71, 230, 0.3);">
                                                Confirm Email Address
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
                                    For security, this link expires in 15 Minute .
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <div style="border-top: 1px solid #f3f4f6; padding-top: 30px;">
                                    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">
                                        If the button doesn't work, copy this link into your browser: <br>
                                        <a href="${process.env.CLIENT_URL}/auth/${token}" style="color: #1447E6; text-decoration: none; word-break: break-all;">${token}</a>
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td style="background-color: #FAFBFF; padding: 40px; text-align: center; border-top: 1px solid #f3f4f6;">
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                    &copy; ${new Date().getFullYear()} Yegna Pay. Built for the modern economy. <br>
                                    Addis Ababa, Ethiopia.
                                </p>
                                <div style="margin-top: 20px;">
                                    <span style="color: #cbd5e1; font-size: 18px;">•••</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `
    };
    await transport.sendMail(mailOptions);
}
//# sourceMappingURL=sending-email.js.map