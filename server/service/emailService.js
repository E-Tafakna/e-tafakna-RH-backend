const nodemailer = require('nodemailer');
require('dotenv').config({ path: __dirname + '/../.env' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});



const sendWelcomeEmail = async (employee) => {

  const { email, full_name, profession, department, date_of_start } = employee;
const displayedProfession = profession?.trim() || 'Employee';

  const formattedDate = new Date().toLocaleString('fr-FR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});


  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bienvenue chez E-Tafakna</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { margin-top: 20px; padding: 10px; text-align: center; font-size: 12px; color: #666; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 15px 0;
          font-weight: bold;
        }
        .info-card {
          background: white;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-item { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bienvenue sur E-Tafakna</h1>
        </div>
        <div class="content">
          <p>Bonjour ${full_name},</p>
          <p>Nous sommes ravis de vous accueillir dans notre équipe !</p>
          
          <div class="info-card">
<div class="info-item"><strong>Poste :</strong> ${displayedProfession}</div>
            <div class="info-item"><strong>Département :</strong> ${department}</div>
            <div class="info-item"><strong>Date de début :</strong> ${formattedDate}</div>
          </div>
          
          <p>Vous pouvez maintenant accéder à la plateforme en utilisant votre email comme identifiant.</p>
          
          <div style="text-align: center;">
            <a href="https://e-tafakna.com/login" class="button">Accéder à la plateforme</a>
          </div>
          
          <p>Pour toute question, notre équipe support est disponible à <a href="mailto:support@e-tafakna.com">support@e-tafakna.com</a>.</p>
          
          <p>Bien cordialement,<br>L'équipe des Ressources Humaines</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} E-Tafakna. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Ressources Humaines E-Tafakna" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Bienvenue dans l\'équipe E-Tafakna',
    html: htmlTemplate
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendWelcomeEmail };