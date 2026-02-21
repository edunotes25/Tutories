module.exports = (req, res) => {
  res.json({
    message: 'API funcionando',
    env: {
      nodeEnv: process.env.NODE_ENV,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? '✓' : '✗',
      firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ? '✓' : '✗',
      firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ? '✓' : '✗',
      sessionSecret: process.env.SESSION_SECRET ? '✓' : '✗',
      registroCode: process.env.REGISTRO_PROFESOR_CODE ? '✓' : '✗'
    }
  });
};