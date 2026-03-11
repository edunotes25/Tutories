const nodemailer = require('nodemailer');

// Determinar la URL base segons l'entorn
// En producció utilitzarà la variable de Vercel, en local utilitzarà localhost
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('📧 Email Service - BASE_URL:', BASE_URL);

// Configuració del transport d'email
let transporter = null;

const inicialitzarTransporter = () => {
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
        console.log('✅ Transport d\'email configurat');
    } else {
        console.log('⚠️ Variables d\'email no configurades, utilitzant ethereal.email per proves');
        // Crear compte de prova d'ethereal
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
            console.log('📧 Compte de prova creat:', account.user);
        }).catch(err => {
            console.error('❌ Error en crear compte de prova:', err);
        });
    }
};

// Inicialitzar en carregar el mòdul
inicialitzarTransporter();

/**
 * Enviar email de confirmació de reserva al pare/mare
 */
const enviarConfirmacio = async (reserva, professor) => {
    if (!transporter) {
        console.log('⚠️ Transport d\'email no disponible');
        return false;
    }
    
    const cancelUrl = `${BASE_URL}/cancelar/${reserva.tokenAcces}`;
    const professorsUrl = `${BASE_URL}/pare/professors`;
    
    const mailOptions = {
        from: '"Sistema de Tutories" <tutories@colegio.edu>',
        to: reserva.emailPare,
        subject: `✅ Tutoria confirmada amb ${professor.nom}`,
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
                        <h1>Tutoria Confirmada!</h1>
                    </div>
                    <div class="content">
                        <p>Benvolgut/da <strong>${reserva.nomPare}</strong>,</p>
                        <p>La seva tutoria ha estat confirmada correctament:</p>
                        
                        <div class="detalle">
                            <p><strong>Professor:</strong> ${professor.nom}</p>
                            <p><strong>Alumne:</strong> ${reserva.nomAlumne || 'No especificat'}</p>
                            <p><strong>Data:</strong> ${new Date(reserva.data).toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Hora:</strong> ${reserva.hora}</p>
                            <p><strong>ID Reserva:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                            ${reserva.comentaris ? `<p><strong>Comentaris:</strong> ${reserva.comentaris}</p>` : ''}
                        </div>
                        
                        <p>Si necessita cancel·lar la tutoria, pot fer-ho a través del següent enllaç:</p>
                        <p style="text-align: center;">
                            <a href="${cancelUrl}" class="boton-cancelar">Cancel·lar reserva</a>
                        </p>
                        
                        <p style="text-align: center;">
                            <a href="${professorsUrl}">📅 Reservar una altra tutoria</a>
                        </p>
                        
                        <p>Moltes gràcies per utilitzar el nostre sistema.</p>
                    </div>
                    <div class="footer">
                        <p>Col·legi Públic - Sistema de Tutories</p>
                        <p>Aquest és un missatge automàtic, si us plau no respongueu a aquest correu.</p>
                        <p><small>Les seves dades són tractades segons la normativa RGPD. Seran eliminades 24h després de la tutoria.</small></p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email de confirmació enviat al pare/mare:', info.messageId);
        
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Vista prèvia:', previewUrl);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error en enviar email de confirmació:', error);
        return false;
    }
};

/**
 * Enviar email de cancel·lació al pare/mare
 */
const enviarCancelacioPare = async (reserva, professor) => {
    if (!transporter) {
        console.log('⚠️ Transport d\'email no disponible');
        return false;
    }
    
    const professorsUrl = `${BASE_URL}/pare/professors`;
    
    const mailOptions = {
        from: '"Sistema de Tutories" <tutories@colegio.edu>',
        to: reserva.emailPare,
        subject: `❌ Tutoria cancel·lada - ${professor.nom}`,
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
                        <h1>Tutoria Cancel·lada</h1>
                    </div>
                    <div class="content">
                        <p>Benvolgut/da <strong>${reserva.nomPare}</strong>,</p>
                        <p>Lamentem informar-li que la següent tutoria ha estat <strong style="color: #dc3545;">CANCEL·LADA</strong>:</p>
                        
                        <div class="detalle">
                            <p><strong>Professor:</strong> ${professor.nom}</p>
                            <p><strong>Alumne:</strong> ${reserva.nomAlumne || 'No especificat'}</p>
                            <p><strong>Data:</strong> ${new Date(reserva.data).toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Hora:</strong> ${reserva.hora}</p>
                            <p><strong>ID Reserva:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                        </div>
                        
                        <p>Si desitja reservar una nova tutoria, pot fer-ho a través del nostre sistema:</p>
                        <p style="text-align: center;">
                            <a href="${professorsUrl}" class="boton">Reservar nova tutoria</a>
                        </p>
                        
                        <p>Disculpi les molèsties.</p>
                    </div>
                    <div class="footer">
                        <p>Col·legi Públic - Sistema de Tutories</p>
                        <p>Aquest és un missatge automàtic, si us plau no respongueu a aquest correu.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email de cancel·lació enviat al pare/mare:', info.messageId);
        
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Vista prèvia:', previewUrl);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error en enviar email de cancel·lació al pare/mare:', error);
        return false;
    }
};

/**
 * Enviar email de notificació de cancel·lació al professor
 */
const enviarNotificacioProfessor = async (reserva, professor, pare) => {
    if (!transporter) {
        console.log('⚠️ Transport d\'email no disponible');
        return false;
    }
    
    const reservesUrl = `${BASE_URL}/professor/reserves`;
    
    const mailOptions = {
        from: '"Sistema de Tutories" <tutories@colegio.edu>',
        to: professor.email,
        subject: `⚠️ Tutoria cancel·lada per ${pare.nom}`,
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
                        <h1>Tutoria Cancel·lada pel Pare/Mare</h1>
                    </div>
                    <div class="content">
                        <p>Benvolgut/da <strong>${professor.nom}</strong>,</p>
                        <p>Us informem que la següent tutoria ha estat <strong style="color: #dc3545;">CANCEL·LADA</strong> pel pare/mare:</p>
                        
                        <div class="detalle">
                            <p><strong>Pare/Mare:</strong> ${pare.nom}</p>
                            <p><strong>Email de contacte:</strong> ${pare.email}</p>
                            <p><strong>Telèfon:</strong> ${pare.telefon || 'No especificat'}</p>
                            <p><strong>Alumne:</strong> ${reserva.nomAlumne || 'No especificat'}</p>
                            <p><strong>Data:</strong> ${new Date(reserva.data).toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Hora:</strong> ${reserva.hora}</p>
                            <p><strong>ID Reserva:</strong> ${reserva.reservaId.substring(0, 8).toUpperCase()}</p>
                            ${reserva.comentaris ? `<p><strong>Comentaris:</strong> ${reserva.comentaris}</p>` : ''}
                        </div>
                        
                        <p>Aquest horari ja està disponible novament per a altres reserves.</p>
                        <p style="text-align: center;">
                            <a href="${reservesUrl}" class="boton">Veure les meves reserves</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>Col·legi Públic - Sistema de Tutories</p>
                        <p>Aquest és un missatge automàtic, si us plau no respongueu a aquest correu.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Notificació enviada al professor:', info.messageId);
        
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Vista prèvia:', previewUrl);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error en enviar notificació al professor:', error);
        return false;
    }
};

module.exports = {
    enviarConfirmacio,
    enviarCancelacioPare,
    enviarNotificacioProfessor
};