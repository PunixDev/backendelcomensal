// server.js
require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = 3000;

app.use(express.json());

// Endpoint para verificar la suscripción
app.post('/check-subscription', async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Falta el ID del cliente.' });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      res.json({ isSubscribed: true });
    } else {
      res.json({ isSubscribed: false });
    }
  } catch (error) {
    console.error('Error al verificar la suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});