// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    async generarConfirmacion(datos) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configurar documento
                doc.font('Helvetica');
                
                // Encabezado
                doc.fontSize(20)
                   .fillColor('#4a90e2')
                   .text('Confirmación de Tutoría', { align: 'center' })
                   .moveDown();

                doc.fontSize(12)
                   .fillColor('#333')
                   .text('Colegio Público - Sistema de Tutorías', { align: 'center' })
                   .moveDown(2);

                // Línea separadora
                doc.strokeColor('#4a90e2')
                   .lineWidth(2)
                   .moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke()
                   .moveDown(2);

                // Datos de la reserva
                doc.fontSize(14)
                   .fillColor('#333')
                   .text('Datos de la Reserva:', { underline: true })
                   .moveDown();

                const datosReserva = [
                    ['ID de Reserva:', datos.id],
                    ['Nombre del Padre/Madre:', datos.nombre],
                    ['Email:', datos.email],
                    ['Nombre del Alumno:', datos.nombreAlumno],
                    ['Profesor:', datos.profesor],
                    ['Fecha:', datos.fecha],
                    ['Hora:', datos.hora]
                ];

                doc.fontSize(12);
                datosReserva.forEach(([label, value]) => {
                    doc.text(`${label} ${value}`, {
                        continued: false,
                        lineGap: 5
                    });
                });

                doc.moveDown(2);

                // Información importante
                doc.fontSize(14)
                   .fillColor('#4a90e2')
                   .text('Información Importante:', { underline: true })
                   .moveDown();

                doc.fontSize(11)
                   .fillColor('#666')
                   .text('• Por favor, llegue 5 minutos antes de la hora programada.')
                   .text('• La reunión se realizará en el aula habitual del profesor.')
                   .text('• Si necesita cancelar, contacte con el centro lo antes posible.')
                   .text('• Guarde este comprobante para su referencia.')
                   .moveDown(2);

                // Pie de página
                doc.fontSize(10)
                   .fillColor('#999')
                   .text('Este documento es un comprobante de su reserva.', { align: 'center' })
                   .text('Los datos personales serán eliminados automáticamente después de 24 horas.', { align: 'center' })
                   .text('© 2024 - Colegio Público - Cumple con RGPD', { align: 'center' });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    async generarHorarioProfesor(profesor, fecha, reservas) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Encabezado
                doc.fontSize(20)
                   .fillColor('#4a90e2')
                   .text('Horario de Tutorías', { align: 'center' })
                   .moveDown();

                doc.fontSize(14)
                   .fillColor('#333')
                   .text(`Profesor: ${profesor}`, { align: 'center' })
                   .text(`Fecha: ${fecha}`, { align: 'center' })
                   .moveDown(2);

                // Crear tabla de horarios
                const horas = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
                
                horas.forEach(hora => {
                    const reserva = reservas.find(r => r.hora === hora);
                    
                    doc.rect(50, doc.y, 500, 30)
                       .fillColor(reserva ? '#f0f7ff' : '#f5f5f5')
                       .fill();
                    
                    doc.fillColor('#333')
                       .fontSize(11)
                       .text(hora, 60, doc.y + 8);
                    
                    if (reserva) {
                        doc.text(`${reserva.nombreAlumno} - ${reserva.contacto?.nombre || 'Reservado'}`, 150, doc.y + 8);
                    } else {
                        doc.text('Disponible', 150, doc.y + 8, { fillColor: '#4a90e2' });
                    }
                    
                    doc.moveDown(2);
                });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFGenerator();