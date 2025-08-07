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
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background-color: white;
      border-radius: 8px; 
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header { 
      background-color: #1c6ae4; 
      color: white; 
      padding: 30px 20px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content { 
      padding: 30px; 
      background-color: white;
    }
    .footer { 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #666;
      background-color: #f9f9f9;
      border-top: 1px solid #e0e0e0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #1c6ae4;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
      transition: background-color 0.3s ease;
    }
    .button:hover {
      background-color: #1557b8;
    }
    .info-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      border: 1px solid #e1e8ed;
    }
    .info-item { 
      margin-bottom: 12px;
      font-size: 15px;
    }
    .info-item strong {
      color: #1c6ae4;
    }
    a {
      color: #1c6ae4;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    p {
      margin: 0 0 15px 0;
      font-size: 15px;
    }
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