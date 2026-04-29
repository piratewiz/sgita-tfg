import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD,
    },
  });
}

// proceso donde el admin recibe la peticion para resetear la password
export const sendResetEmail = async(
  employeeEmail: string,
  employeeName: string,
  resetUrl: string
): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL no está configurado en las variables de entorno')
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SGITA" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `[SGITA] Solicitud de cambio de contraseña — ${employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Solicitud de restablecimiento de contraseña</h2>
        <p>El siguiente empleado ha solicitado restablecer su contraseña:</p>
        <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background:#f1f5f9; font-weight:600; border-radius:4px 0 0 4px; width:40%;">Nombre</td>
            <td style="padding: 8px 12px; background:#f8fafc; border-radius:0 4px 4px 0;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background:#f1f5f9; font-weight:600; border-radius:4px 0 0 4px;">Email</td>
            <td style="padding: 8px 12px; background:#f8fafc; border-radius:0 4px 4px 0;">${employeeEmail}</td>
          </tr>
        </table>
        <p>Pulsa el siguiente botón para establecer una nueva contraseña para este empleado:</p>
        <a href="${resetUrl}"
           style="display:inline-block; margin: 20px 0; padding: 12px 28px;
                  background:#1d4ed8; color:#fff; border-radius:8px;
                  text-decoration:none; font-weight:500; font-size:15px;">
          Restablecer contraseña del empleado
        </a>
        <p style="color:#666; font-size:13px;">
          Este enlace caduca en <strong>1 hora</strong>. Si no reconoces esta solicitud, ignora este email.
        </p>
        <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;" />
        <p style="color:#999; font-size:12px;">SGITA — Sistema de Gestión de Stock para Restaurantes</p>
      </div>
    `,
  });
}