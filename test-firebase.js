require('dotenv').config();
const { db, auth } = require('./backend/config/firebase');

async function testConnection() {
  try {
    // Probar Firestore
    const testDoc = await db.collection('test').add({
      message: 'Conexión exitosa',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Firestore: Documento creado con ID:', testDoc.id);
    
    // Eliminar documento de prueba
    await testDoc.delete();
    console.log('✅ Firestore: Documento eliminado');
    
    console.log('🎉 Conexión con Firebase exitosa');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

testConnection();
