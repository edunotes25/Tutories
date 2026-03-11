/**
 * SERVEI DE PDF
 * Genera documents PDF de confirmació de reserva
 */

const PDFDocument = require('pdfkit');

// Generar PDF de confirmació
const generarConfirmacio = async (reserva) => {
    return new Promise((resolve, reject) => {
        try {
            const chunks = [];
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Confirmació Tutoria - ${reserva.professorNom}`,
                    Author: 'Sistema de Tutories',
                    Subject: 'Reserva de Tutoria',
                    Keywords: 'tutoria, col·legi, reserva',
                    CreationDate: new Date()
                }
            });
            
            // Capturar les dades del PDF
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            
            // Capçalera
            doc.fillColor('#4a90e2')
               .fontSize(25)
               .text('CONFIRMACIÓ DE TUTORIA', { align: 'center' })
               .moveDown();
            
            doc.fillColor('#333')
               .fontSize(12)
               .text('Col·legi Públic - Sistema de Tutories', { align: 'center' })
               .moveDown(2);
            
            // Línia separadora
            doc.strokeColor('#4a90e2')
               .lineWidth(2)
               .moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke()
               .moveDown();
            
            // Dades de la reserva
            doc.fontSize(14)
               .fillColor('#4a90e2')
               .text('DETALLS DE LA RESERVA', { underline: true })
               .moveDown();
            
            doc.fontSize(12)
               .fillColor('#333');
            
            // Crear taula simple
            const leftCol = 70;
            const rightCol = 250;
            let yPos = doc.y;
            
            doc.text('Professor:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.professorNom}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('Data:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${new Date(reserva.data).toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, rightCol, yPos)
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
            doc.text('Data reserva:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${new Date(reserva.dataReserva).toLocaleString('ca-ES')}`, rightCol, yPos)
               .font('Helvetica');
            
            doc.moveDown(3);
            
            // Dades del pare/mare
            doc.fontSize(14)
               .fillColor('#4a90e2')
               .text('DADES DEL PARE/MARE', { underline: true })
               .moveDown();
            
            doc.fontSize(12)
               .fillColor('#333');
            
            yPos = doc.y;
            doc.text('Nom:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.nomPare}`, rightCol, yPos)
               .font('Helvetica');
            
            yPos += 25;
            doc.text('Email:', leftCol, yPos, { continued: true })
               .font('Helvetica-Bold')
               .text(` ${reserva.emailPare}`, rightCol, yPos)
               .font('Helvetica');
            
            if (reserva.telefon) {
                yPos += 25;
                doc.text('Telèfon:', leftCol, yPos, { continued: true })
                   .font('Helvetica-Bold')
                   .text(` ${reserva.telefon}`, rightCol, yPos)
                   .font('Helvetica');
            }
            
            if (reserva.comentaris) {
                doc.moveDown(2);
                doc.fontSize(14)
                   .fillColor('#4a90e2')
                   .text('COMENTARIS', { underline: true })
                   .moveDown();
                
                doc.fontSize(12)
                   .fillColor('#333')
                   .text(reserva.comentaris, { align: 'left' });
            }
            
            doc.moveDown(3);
            
            // Línia separadora
            doc.strokeColor('#4a90e2')
               .lineWidth(1)
               .moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke()
               .moveDown(2);
            
            // Informació RGPD
            doc.fontSize(10)
               .fillColor('#666')
               .text('INFORMACIÓ SOBRE PROTECCIÓ DE DADES (RGPD)', { align: 'center', underline: true })
               .moveDown(0.5);
            
            doc.text('Les seves dades personals seran utilitzades únicament per a la gestió d\'aquesta tutoria. ', { align: 'justify' })
               .text('Seran eliminades automàticament del nostre sistema després de 24 hores després de la tutoria.', { align: 'justify' })
               .text('Pot exercir els seus drets d\'accés, rectificació, cancel·lació i oposició contactant amb el centre educatiu.', { align: 'justify' })
               .moveDown();
            
            doc.text(`Document generat el: ${new Date().toLocaleString('ca-ES')}`, { align: 'right' });
            
            // Finalitzar
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generarConfirmacio
};