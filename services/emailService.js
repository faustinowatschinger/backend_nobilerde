import nodemailer from 'nodemailer';

// Configuración del transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // tu email
    pass: process.env.EMAIL_PASS  // tu contraseña de aplicación
  }
});

// Verificar configuración
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error);
    console.log('📧 Pasos para configurar Gmail:');
    console.log('1. Activa la verificación en dos pasos en tu cuenta de Gmail');
    console.log('2. Ve a https://myaccount.google.com/apppasswords');
    console.log('3. Genera una contraseña de aplicación para "Correo"');
    console.log('4. Usa esa contraseña de 16 caracteres en EMAIL_PASS');
    console.log('📧 Configuración actual:');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER);
    console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? `${process.env.EMAIL_PASS.substring(0, 4)}****` : 'No configurado');
  } else {
    console.log('✅ Servidor de email configurado correctamente');
    console.log('📧 Email configurado para:', process.env.EMAIL_USER);
  }
});

const sendVerificationEmail = async (email, code, username = '') => {
  // Modo desarrollo: simular envío exitoso
  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
    console.log('📧 MODO DESARROLLO - Email simulado');
    console.log('📧 Para:', email);
    console.log('📧 Código:', code);
    console.log('📧 En producción, configura las credenciales de Gmail correctamente');
    return { success: true, messageId: 'dev-simulation' };
  }

  try {
    const mailOptions = {
      from: {
        name: 'NobleErde',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Verificación de Email - NobleErde',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #B99470; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #FEFAE0; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-container { background-color: #5F6F52; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; }
            .warning { background-color: #FFF3CD; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #FF9800; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a NobleErde!</h1>
            </div>
            <div class="content">
              <h2>Hola ${username ? username : 'Matero'}! 🧉</h2>
              <p>Gracias por registrarte en NobleErde. Para completar tu registro, necesitamos verificar tu dirección de email.</p>
              
              <div class="code-container">
                <p style="margin: 0; font-size: 16px;">Tu código de verificación es:</p>
                <div class="code">${code}</div>
              </div>
              
              <p>Ingresa este código en la aplicación para activar tu cuenta.</p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este código expira en 15 minutos</li>
                  <li>Solo puedes usarlo una vez</li>
                  <li>Si no solicitaste este código, ignora este email</li>
                </ul>
              </div>
              
              <p>Una vez verificado tu email, podrás disfrutar de todas las funcionalidades de NobleErde y descubrir las mejores yerbas mate para tu gusto.</p>
              
              <p>¡Nos vemos en la ronda! 🧉</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NobleErde - La mejor app para materos</p>
              <p>Si tienes problemas, contacta nuestro soporte.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de verificación enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    // En desarrollo, retornar éxito para poder probar el flujo
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 MODO DESARROLLO - Simulando éxito a pesar del error');
      console.log('📧 Código para verificar:', code);
      return { success: true, messageId: 'dev-fallback' };
    }
    
    return { success: false, error: error.message };
  }
};

export { sendVerificationEmail };
