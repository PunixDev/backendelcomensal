// server.js
require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const GeminiTranslator = require("./geminiService");

const app = express();
const translator = new GeminiTranslator();

// Permitir CORS solo desde https://elrestaurante.store
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://elrestaurante.store");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const port = process.env.PORT || 3000;

// Endpoint para hola mundo
app.get("/hola", (req, res) => {
  res.json({ message: "ole mis huevosss" });
});

// Endpoint para crear sesión del portal de clientes de Stripe
app.post("/create-customer-portal-session", async (req, res) => {
  const { customerId } = req.body;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://elrestaurante.store/admin",
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// ENDPOINTS PARA TRADUCCIÓN (GEMINI)

// Endpoint para traducir un plato
app.post("/translate-dish", async (req, res) => {
  try {
    const { nombre, ingredientes } = req.body;

    // Validación
    if (!nombre || !ingredientes || !Array.isArray(ingredientes)) {
      return res.status(400).json({
        error: 'Datos inválidos. Se requiere "nombre" y "ingredientes" (array)',
      });
    }

    const dishData = {
      nombre: nombre.trim(),
      ingredientes: ingredientes
        .map((item) => item.trim())
        .filter((item) => item),
    };

    const translation = await translator.translateDish(dishData);

    res.json({
      success: true,
      data: translation,
    });
  } catch (error) {
    console.error("Error en translate-dish:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      message: error.message,
    });
  }
});

// Endpoint para traducir múltiples platos
app.post("/translate-dishes", async (req, res) => {
  try {
    const { platos } = req.body;

    if (!Array.isArray(platos)) {
      return res.status(400).json({
        error: 'Se requiere un array "platos"',
      });
    }

    const results = await Promise.all(
      platos.map(async (plato, index) => {
        try {
          const translation = await translator.translateDish(plato);
          return { success: true, data: translation, index };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            index,
            plato: plato.nombre,
          };
        }
      })
    );

    res.json({
      success: true,
      results: results,
    });
  } catch (error) {
    console.error("Error en translate-dishes:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      message: error.message,
    });
  }
});

// Endpoint de salud para el traductor
app.get("/translate/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Servicio de traducción funcionando",
    service: "Gemini Translator",
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  console.log(`Endpoints disponibles:`);
  console.log(`- GET  /hola`);
  console.log(`- POST /create-customer-portal-session`);
  console.log(`- POST /check-subscription`);
  console.log(`- POST /translate-dish`);
  console.log(`- POST /translate-dishes`);
  console.log(`- GET  /translate/health`);
});
