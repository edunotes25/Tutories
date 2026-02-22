const nodemailer = require('nodemailer');
const i18n = require('i18n');

// Determinar la URL base según el entorno
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
const enviarConfirmacion = async (reserva, profesor, idioma = 'es') => {
    if (!transporter) {
        console.log('⚠️ Transporte de email no disponible');
        return false;
    }
    
    i18n.setLocale(idioma);
    
    const cancelUrl = `${BASE_URL}/cancelar/${reserva.tokenAcceso}`;
    const profesoresUrl = `${BASE_URL}/padre/profesores`;
    
    const mailOptions = {
        from: '"Sistema de Tutorías" <tutorias@colegio.edu>',
        to: reserva.padreEmail,
        subject: i18n.__('email_confirmacion_asunto', { profesor: profesor.nombre }),
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
                        <h1>${i18n.__('email_confirmacion_titulo')}</h1>
                    </div>
                    <div class="content">
                        <p>${i18n.__('email_confirmacion_saludo', { nombre: reserva.padreNombre })}</p>
                        <p>${i18n.__('email_confirmacion_mensaje')}</p>
                        
                        <div class="detalle">
                            <p><strong>${i18n.__('profesor')}:</strong> ${profesor.nombre}</p>
                            <p><strong>${i18n.__('alumno')}:</strong> ${reserva.nombreAlumno || i18n.__('no_especificado')}</p>
                            <p><strong>${i18n.__('fecha')}:</strong> ${new Date(reserva.fecha).toLocaleDateString(idioma, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>${i18n.__('hora')}:</strong> ${reserva.hora}</p>
                            <p><strong>${i18n.__('id_reserva')}:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                            ${reserva.comentarios ? `<p><strong>${i18n.__('comentarios')}:</strong> ${reserva.comentarios}</p>` : ''}
                        </div>
                        
                        <p>${i18n.__('email_confirmacion_cancelar_info')}</p>
                        <p style="text-align: center;">
                            <a href="${cancelUrl}" class="boton-cancelar">${i18n.__('email_cancelar_boton')}</a>
                        </p>
                        
                        <p style="text-align: center;">
                            <a href="${profesoresUrl}">${i18n.__('email_reservar_otra')}</a>
                        </p>
                        
                        <p>${i18n.__('email_gracias')}</p>
                    </div>
                    <div class="footer">
                        <p>${i18n.__('colegio_nombre')}</p>
                        <p>${i18n.__('email_automático')}</p>
                        <p><small>${i18n.__('texto_rgpd')}</small></p>
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
const enviarCancelacionPadre = async (reserva, profesor, idioma = 'es') => {
    if (!transporter) {
        console.log('⚠️ Transporte de email no disponible');
        return false;
    }
    
    i18n.setLocale(idioma);
    
    const profesoresUrl = `${BASE_URL}/padre/profesores`;
    
    const mailOptions = {
        from: '"Sistema de Tutorías" <tutorias@colegio.edu>',
        to: reserva.padreEmail,
        subject: i18n.__('email_cancelacion_asunto', { profesor: profesor.nombre }),
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
                        <h1>${i18n.__('email_cancelacion_titulo')}</h1>
                    </div>
                    <div class="content">
                        <p>${i18n.__('email_confirmacion_saludo', { nombre: reserva.padreNombre })}</p>
                        <p>${i18n.__('email_cancelacion_mensaje')}</p>
                        
                        <div class="detalle">
                            <p><strong>${i18n.__('profesor')}:</strong> ${profesor.nombre}</p>
                            <p><strong>${i18n.__('alumno')}:</strong> ${reserva.nombreAlumno || i18n.__('no_especificado')}</p>
                            <p><strong>${i18n.__('fecha')}:</strong> ${new Date(reserva.fecha).toLocaleDateString(idioma, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>${i18n.__('hora')}:</strong> ${reserva.hora}</p>
                            <p><strong>${i18n.__('id_reserva')}:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                        </div>
                        
                        <p>${i18n.__('email_cancelacion_nueva_info')}</p>
                        <p style="text-align: center;">
                            <a href="${profesoresUrl}" class="boton">${i18n.__('email_cancelacion_nueva')}</a>
                        </p>
                        
                        <p>${i18n.__('email_disculpas')}</p>
                    </div>
                    <div class="footer">
                        <p>${i18n.__('colegio_nombre')}</p>
                        <p>${i18n.__('email_automático')}</p>
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
const enviarNotificacionProfesor = async (reserva, profesor, padre, idioma = 'es') => {
    if (!transporter) {
        console.log('⚠️ Transporte de email no disponible');
        return false;
    }
    
    i18n.setLocale(idioma);
    
    const reservasUrl = `${BASE_URL}/profesor/reservas`;
    
    const mailOptions = {
        from: '"Sistema de Tutorías" <tutorias@colegio.edu>',
        to: profesor.email,
        subject: i18n.__('email_notificacion_profesor_asunto', { nombre: padre.nombre }),
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
                        <h1>${i18n.__('email_notificacion_profesor_titulo')}</h1>
                    </div>
                    <div class="content">
                        <p>${i18n.__('email_notificacion_profesor_saludo', { nombre: profesor.nombre })}</p>
                        <p>${i18n.__('email_notificacion_profesor_mensaje')}</p>
                        
                        <div class="detalle">
                            <p><strong>${i18n.__('padre')}:</strong> ${padre.nombre}</p>
                            <p><strong>${i18n.__('email')}:</strong> ${padre.email}</p>
                            <p><strong>${i18n.__('telefono')}:</strong> ${padre.telefono || i18n.__('no_especificado')}</p>
                            <p><strong>${i18n.__('alumno')}:</strong> ${reserva.nombreAlumno || i18n.__('no_especificado')}</p>
                            <p><strong>${i18n.__('fecha')}:</strong> ${new Date(reserva.fecha).toLocaleDateString(idioma, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>${i18n.__('hora')}:</strong> ${reserva.hora}</p>
                            <p><strong>${i18n.__('id_reserva')}:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                            ${reserva.comentarios ? `<p><strong>${i18n.__('comentarios')}:</strong> ${reserva.comentarios}</p>` : ''}
                        </div>
                        
                        <p>${i18n.__('email_notificacion_profesor_info')}</p>
                        <p style="text-align: center;">
                            <a href="${reservasUrl}" class="boton">${i18n.__('email_ver_reservas')}</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>${i18n.__('colegio_nombre')}</p>
                        <p>${i18n.__('email_automático')}</p>
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