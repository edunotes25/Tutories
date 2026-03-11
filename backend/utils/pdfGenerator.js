// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    async generarConfirmacio(dades) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configurar document
                doc.font('Helvetica');
                
                // Capçalera
                doc.fontSize(20)
                   .fillColor('#4a90e2')
                   .text('Confirmació de Tutoria', { align: 'center' })
                   .moveDown();

                doc.fontSize(12)
                   .fillColor('#333')
                   .text('Col·legi Públic - Sistema de Tutories', { align: 'center' })
                   .moveDown(2);

                // Línia separadora
                doc.strokeColor('#4a90e2')
                   .lineWidth(2)
                   .moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke()
                   .moveDown(2);

                // Dades de la reserva
                doc.fontSize(14)
                   .fillColor('#333')
                   .text('Dades de la Reserva:', { underline: true })
                   .moveDown();

                const dadesReserva = [
                    ['ID de Reserva:', dades.id],
                    ['Nom del Pare/Mare:', dades.nom],
                    ['Email:', dades.email],
                    ['Nom de l\'Alumne:', dades.nomAlumne],
                    ['Professor:', dades.professor],
                    ['Data:', dades.data],
                    ['Hora:', dades.hora]
                ];

                doc.fontSize(12);
                dadesReserva.forEach(([label, value]) => {
                    doc.text(`${label} ${value}`, {
                        continued: false,
                        lineGap: 5
                    });
                });

                doc.moveDown(2);

                // Informació important
                doc.fontSize(14)
                   .fillColor('#4a90e2')
                   .text('Informació Important:', { underline: true })
                   .moveDown();

                doc.fontSize(11)
                   .fillColor('#666')
                   .text('• Si us plau, arribi 5 minuts abans de l\'hora programada.')
                   .text('• La reunió es realitzarà a l\'aula habitual del professor.')
                   .text('• Si necessita cancel·lar, contacti amb el centre com més aviat millor.')
                   .text('• Guardi aquest comprovant per a la seva referència.')
                   .moveDown(2);

                // Peu de pàgina
                doc.fontSize(10)
                   .fillColor('#999')
                   .text('Aquest document és un comprovant de la seva reserva.', { align: 'center' })
                   .text('Les dades personals seran eliminades automàticament després de 24 hores.', { align: 'center' })
                   .text('© 2024 - Col·legi Públic - Compleix amb RGPD', { align: 'center' });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    async generarHorariProfessor(professor, data, reserves) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Capçalera
                doc.fontSize(20)
                   .fillColor('#4a90e2')
                   .text('Horari de Tutories', { align: 'center' })
                   .moveDown();

                doc.fontSize(14)
                   .fillColor('#333')
                   .text(`Professor: ${professor}`, { align: 'center' })
                   .text(`Data: ${data}`, { align: 'center' })
                   .moveDown(2);

                // Crear taula d'horaris
                const hores = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
                
                hores.forEach(hora => {
                    const reserva = reserves.find(r => r.hora === hora);
                    
                    doc.rect(50, doc.y, 500, 30)
                       .fillColor(reserva ? '#f0f7ff' : '#f5f5f5')
                       .fill();
                    
                    doc.fillColor('#333')
                       .fontSize(11)
                       .text(hora, 60, doc.y + 8);
                    
                    if (reserva) {
                        doc.text(`${reserva.nomAlumne} - ${reserva.contacte?.nom || 'Reservat'}`, 150, doc.y + 8);
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