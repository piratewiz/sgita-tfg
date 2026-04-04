import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetEmail = async (
  to: string,
  name: string,
  resetUrl: string
): Promise<void> => {
  await transporter.sendMail({
    from:    `"SGITA" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Recuperación de contraseña — SGITA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Recuperar contraseña</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Pulsa el botón para continuar:</p>
        <a href="${resetUrl}"
           style="display:inline-block; margin: 20px 0; padding: 12px 24px;
                  background:#1d4ed8; color:#fff; border-radius:8px;
                  text-decoration:none; font-weight:500;">
          Restablecer contraseña
        </a>
        <p style="color:#666; font-size:13px;">
          Este enlace caduca en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este email.
        </p>
        <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;" />
        <p style="color:#999; font-size:12px;">SGITA — Sistema de Gestión de Stock para Restaurantes</p>
      </div>
    `,
  });
};