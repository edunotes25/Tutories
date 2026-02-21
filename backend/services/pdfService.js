/**
 * SERVICIO DE PDF
 * Genera documentos PDF de confirmación de reserva
 */

const PDFDocument = require('pdfkit');

// Generar PDF de confirmación
const generarConfirmacion = async (reserva) => {
    return new Promise((resolve, reject) => {
        try {
            const chunks = [];
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Confirmación Tutoría - ${reserva.profesorNombre}`,
                    Author: 'Sistema de Tutorías',
                    Subject: 'Reserva de Tutoría',
                    Keywords: 'tutoría, colegio, reserva',
                    CreationDate: new Date()
                }
            });
            
            // Capturar los datos del PDF
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            
            // Cabecera
            doc.fillColor('#4a90e2')
               .fontSize(25)
               .text('CONFIRMACIÓN DE TUTORÍA', { align: 'center' })
               .moveDown();
            
            doc.fillColor('#333')
               .fontSize(12)
               .text('Colegio Público - Sistema de Tutorías', { align: 'center' })
               .moveDown(2);
            
            // Línea separadora
            doc.strokeColor('#4a90e2')
               .lineWidth(2)
               .moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke()
               .moveDown();
            
            // Datos de la reserva
            doc.fontSize(14)
               .fillColor('#4a90e2')
               .text('DETALLES DE LA RESERVA', { underline: true })
               .moveDown();
            
            doc.fontSize(12)
               .fillColor('#333');
            
            // Crear tabla simple
            const leftCol = 70;
            const rightCol = 250;
            let yPos = doc.y;
            
            doc.text('Profesor:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.profesorNombre}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('Fecha:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${new Date(reserva.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('Hora:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.hora}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('ID Reserva:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.id.substring(0, 8).toUpperCase()}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('Fecha reserva:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${new Date(reserva.fechaReserva).toLocaleString('es-ES')}`, rightCol, yPos)
               .font('Helvetica');
            
            doc.moveDown(3);
            
            // Datos del padre/madre
            doc.fontSize(14)
               .fillColor('#4a90e2')
               .text('DATOS DEL PADRE/MADRE', { underline: true })
               .moveDown();
            
            doc.fontSize(12)
               .fillColor('#333');
            
            yPos = doc.y;
            doc.text('Nombre:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.nombrePadre}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('Email:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.emailPadre}`, rightCol, yPos)
               .font('Helvetica');
            
            if (reserva.telefono) {
                yPos += 25;
                doc.text('Teléfono:', leftCol, yPos, { continued: true })
                   .font('Helvetica-Bold')
                   .text(` ${reserva.telefono}`, rightCol, yPos)
                   .font('Helvetica');
            }
            
            if (reserva.comentarios) {
                doc.moveDown(2);
                doc.fontSize(14)
                   .fillColor('#4a90e2')
                   .text('COMENTARIOS', { underline: true })
                   .moveDown();
                
                doc.fontSize(12)
                   .fillColor('#333')
                   .text(reserva.comentarios, { align: 'left' });
            }
            
            doc.moveDown(3);
            
            // Línea separadora
            doc.strokeColor('#4a90e2')
               .lineWidth(1)
               .moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke()
               .moveDown(2);
            
            // Información RGPD
            doc.fontSize(10)
               .fillColor('#666')
               .text('INFORMACIÓN SOBRE PROTECCIÓN DE DATOS (RGPD)', { align: 'center', underline: true })
               .moveDown(0.5);
            
            doc.text('Sus datos personales serán utilizados únicamente para la gestión de esta tutoría. ', { align: 'justify' })
               .text('Serán eliminados automáticamente de nuestro sistema tras 24 horas después de la tutoría.', { align: 'justify' })
               .text('Puede ejercer sus derechos de acceso, rectificación, cancelación y oposición contactando con el centro educativo.', { align: 'justify' })
               .moveDown();
            
            doc.text(`Documento generado el: ${new Date().toLocaleString('es-ES')}`, { align: 'right' });
            
            // Finalizar
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generarConfirmacion
};