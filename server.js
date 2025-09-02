// Endpoint para crear sesión del portal de clientes de Stripe
app.post("/create-customer-portal-session", async (req, res) => {
  const { customerId } = req.body; // El ID de cliente de Stripe
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://elrestaurante.store/admin", // URL a la que volver tras gestionar
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// server.js
require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
// Permitir CORS solo desde https://elrestaurante.store
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://elrestaurante.store");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
const port = process.env.PORT || 3000;

app.use(express.json());

// Nuevo endpoint para hola mundo
app.get("/hola", (req, res) => {
  res.json({ message: "ole mis huevosss" });
});

// Endpoint para verificar la suscripción
app.post("/check-subscription", async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: "Falta el ID del cliente." });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      res.json({ isSubscribed: true });
    } else {
      res.json({ isSubscribed: false });
    }
  } catch (error) {
    console.error("Error al verificar la suscripción:", error);
    res.status(500).json({
      error: "Error interno del servidor.",
      details: error.message || error,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
