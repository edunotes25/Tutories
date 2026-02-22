const nodemailer = require('nodemailer');

// Determinar la URL base según el entorno
// En producción usará la variable de Vercel, en local usará localhost
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('📧 Email Service - BASE_URL:', BASE_URL);

// Configuración del transporte de email
let transporter = null;

const inicializarTransporter = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('✅ Transporte de email configurado');
    } else {
        console.log('⚠️ Variables de email no configuradas, usando ethereal.email para pruebas');
        // Crear cuenta de prueba de ethereal
        nodemailer.createTestAccount().then(account => {
            transporter = nodemailer.createTransport({
                host: account.smtp.host,
                port: account.smtp.port,
                secure: account.smtp.secure,
                auth: {
                    user: account.user,
                    pass: account.pass
                }
            });
            console.log('📧 Cuenta de prueba creada:', account.user);
        }).catch(err => {
            console.error('❌ Error al crear cuenta de prueba:', err);
        });
    }
};

// Inicializar al cargar el módulo
inicializarTransporter();

/**
 * Enviar email de confirmación de reserva al padre
 */
const enviarConfirmacion = async (reserva, profesor) => {
    if (!transporter) {
        console.log('⚠️ Transporte de email no disponible');
        return false;
    }
    
    const cancelUrl = `${BASE_URL}/cancelar/${reserva.tokenAcceso}`;
    const profesoresUrl = `${BASE_URL}/padre/profesores`;
    
    const mailOptions = {
        from: '"Sistema de Tutorías" <tutorias@colegio.edu>',
        to: reserva.padreEmail,
        subject: `✅ Tutoría confirmada con ${profesor.nombre}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    .detalle { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
                    .boton { background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                    .boton-cancelar { background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Tutoría Confirmada!</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a <strong>${reserva.padreNombre}</strong>,</p>
                        <p>Su tutoría ha sido confirmada correctamente:</p>
                        
                        <div class="detalle">
                            <p><strong>Profesor:</strong> ${profesor.nombre}</p>
                            <p><strong>Alumno:</strong> ${reserva.nombreAlumno || 'No especificado'}</p>
                            <p><strong>Fecha:</strong> ${new Date(reserva.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Hora:</strong> ${reserva.hora}</p>
                            <p><strong>ID Reserva:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                            ${reserva.comentarios ? `<p><strong>Comentarios:</strong> ${reserva.comentarios}</p>` : ''}
                        </div>
                        
                        <p>Si necesita cancelar la tutoría, puede hacerlo a través del siguiente enlace:</p>
                        <p style="text-align: center;">
                            <a href="${cancelUrl}" class="boton-cancelar">Cancelar reserva</a>
                        </p>
                        
                        <p style="text-align: center;">
                            <a href="${profesoresUrl}">📅 Reservar otra tutoría</a>
                        </p>
                        
                        <p>Muchas gracias por utilizar nuestro sistema.</p>
                    </div>
                    <div class="footer">
                        <p>Colegio Público - Sistema de Tutorías</p>
                        <p>Este es un mensaje automático, por favor no responda a este correo.</p>
                        <p><small>Sus datos son tratados según la normativa RGPD. Serán eliminados 24h después de la tutoría.</small></p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email de confirmación enviado al padre:', info.messageId);
        
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Vista previa:', previewUrl);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al enviar email de confirmación:', error);
        return false;
    }
};

/**
 * Enviar email de cancelación al padre
 */
const enviarCancelacionPadre = async (reserva, profesor) => {
    if (!transporter) {
        console.log('⚠️ Transporte de email no disponible');
        return false;
    }
    
    const profesoresUrl = `${BASE_URL}/padre/profesores`;
    
    const mailOptions = {
        from: '"Sistema de Tutorías" <tutorias@colegio.edu>',
        to: reserva.padreEmail,
        subject: `❌ Tutoría cancelada - ${profesor.nombre}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    .detalle { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545; }
                    .boton { background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Tutoría Cancelada</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a <strong>${reserva.padreNombre}</strong>,</p>
                        <p>Lamentamos informarle que la siguiente tutoría ha sido <strong style="color: #dc3545;">CANCELADA</strong>:</p>
                        
                        <div class="detalle">
                            <p><strong>Profesor:</strong> ${profesor.nombre}</p>
                            <p><strong>Alumno:</strong> ${reserva.nombreAlumno || 'No especificado'}</p>
                            <p><strong>Fecha:</strong> ${new Date(reserva.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Hora:</strong> ${reserva.hora}</p>
                            <p><strong>ID Reserva:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                        </div>
                        
                        <p>Si desea reservar una nueva tutoría, puede hacerlo a través de nuestro sistema:</p>
                        <p style="text-align: center;">
                            <a href="${profesoresUrl}" class="boton">Reservar nueva tutoría</a>
                        </p>
                        
                        <p>Disculpe las molestias.</p>
                    </div>
                    <div class="footer">
                        <p>Colegio Público - Sistema de Tutorías</p>
                        <p>Este es un mensaje automático, por favor no responda a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email de cancelación enviado al padre:', info.messageId);
        
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Vista previa:', previewUrl);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al enviar email de cancelación al padre:', error);
        return false;
    }
};

/**
 * Enviar email de notificación de cancelación al profesor
 */
const enviarNotificacionProfesor = async (reserva, profesor, padre) => {
    if (!transporter) {
        console.log('⚠️ Transporte de email no disponible');
        return false;
    }
    
    const reservasUrl = `${BASE_URL}/profesor/reservas`;
    
    const mailOptions = {
        from: '"Sistema de Tutorías" <tutorias@colegio.edu>',
        to: profesor.email,
        subject: `⚠️ Tutoría cancelada por ${padre.nombre}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    .detalle { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
                    .boton { background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Tutoría Cancelada por el Padre</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a <strong>${profesor.nombre}</strong>,</p>
                        <p>Le informamos que la siguiente tutoría ha sido <strong style="color: #dc3545;">CANCELADA</strong> por el padre/madre:</p>
                        
                        <div class="detalle">
                            <p><strong>Padre/Madre:</strong> ${padre.nombre}</p>
                            <p><strong>Email de contacto:</strong> ${padre.email}</p>
                            <p><strong>Teléfono:</strong> ${padre.telefono || 'No especificado'}</p>
                            <p><strong>Alumno:</strong> ${reserva.nombreAlumno || 'No especificado'}</p>
                            <p><strong>Fecha:</strong> ${new Date(reserva.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Hora:</strong> ${reserva.hora}</p>
                            <p><strong>ID Reserva:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                            ${reserva.comentarios ? `<p><strong>Comentarios:</strong> ${reserva.comentarios}</p>` : ''}
                        </div>
                        
                        <p>Este horario ya está disponible nuevamente para otras reservas.</p>
                        <p style="text-align: center;">
                            <a href="${reservasUrl}" class="boton">Ver mis reservas</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>Colegio Público - Sistema de Tutorías</p>
                        <p>Este es un mensaje automático, por favor no responda a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Notificación enviada al profesor:', info.messageId);
        
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Vista previa:', previewUrl);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al enviar notificación al profesor:', error);
        return false;
    }
};

module.exports = {
    enviarConfirmacion,
    enviarCancelacionPadre,
    enviarNotificacionProfesor
};