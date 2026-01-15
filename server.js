// server.js
require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const GeminiTranslator = require("./geminiService");

const app = express();
const translator = new GeminiTranslator();

// Permitir CORS solo desde https://elrestaurante.store y http://localhost:8100 para pruebas
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://elrestaurante.store",
    "http://localhost:8100",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    // No expand profundo: Stripe limita la profundidad de expansión.
    // Recuperaremos precios y productos por separado cuando haga falta.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (!subscriptions || subscriptions.data.length === 0) {
      return res.json({ isSubscribed: false });
    }

    const subscription = subscriptions.data[0];

    const items = await Promise.all(
      subscription.items.data.map(async (item) => {
        // Asegurarnos de obtener el objeto price completo
        let priceObj = item.price;
        try {
          if (
            !priceObj ||
            typeof priceObj === "string" ||
            !priceObj.unit_amount
          ) {
            const priceId =
              typeof priceObj === "string"
                ? priceObj
                : priceObj?.id || item.price?.id;
            if (priceId) {
              priceObj = await stripe.prices.retrieve(priceId);
            }
          }
        } catch (err) {
          // Si falla recuperar el precio, mantenemos lo que haya
          priceObj = priceObj || { id: item.price };
        }

        // Ahora, obtener el producto asociado al price (objeto o id)
        let product = priceObj?.product;
        try {
          if (product && typeof product === "string") {
            product = await stripe.products.retrieve(product);
          }
        } catch (err) {
          product = { id: priceObj?.product };
        }

        const planFromMetadata =
          product?.metadata?.plan || product?.metadata?.tier;
        let inferredPlan = planFromMetadata || null;
        if (!inferredPlan && product?.name) {
          const name = (product.name || "").toLowerCase();
          if (name.includes("premium")) inferredPlan = "premium";
          else if (name.includes("basic")) inferredPlan = "basic";
        }

        return {
          id: item.id,
          price: {
            id: priceObj?.id,
            nickname: priceObj?.nickname,
            unit_amount: priceObj?.unit_amount,
            currency: priceObj?.currency,
            recurring: priceObj?.recurring,
          },
          product: product
            ? {
                id: product.id,
                name: product.name,
                description: product.description,
                metadata: product.metadata,
              }
            : { id: priceObj?.product },
          inferredPlan,
        };
      })
    );

    return res.json({
      isSubscribed: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      items,
    });
  } catch (error) {
    console.error("Error al verificar la suscripción:", error);
    res.status(500).json({
      error: "Error interno del servidor.",
      details: error.message || error,
    });
  }
});

// Endpoint para obtener el customer ID por email
app.post("/get-customer-by-email", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Falta el email del cliente." });
  }

  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      res.json({ customerId: customers.data[0].id });
    } else {
      res.status(404).json({ error: "Cliente no encontrado." });
    }
  } catch (error) {
    console.error("Error al obtener el cliente por email:", error);
    res.status(500).json({
      error: "Error interno del servidor.",
      details: error.message || error,
    });
  }
});

// Endpoint para traducir un plato
app.post("/translate-dish", async (req, res) => {
  try {
    const dishData = req.body;

    // Validación básica: debe ser un objeto con nombre
    if (!dishData || typeof dishData !== "object" || !dishData.nombre) {
      return res.status(400).json({
        error: 'Datos inválidos. Se requiere un objeto con "nombre"',
      });
    }

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

// Endpoint para traducir una categoría
app.post("/translate-category", async (req, res) => {
  try {
    const categoryData = req.body;

    // Validación básica: debe ser un objeto con nombre
    if (
      !categoryData ||
      typeof categoryData !== "object" ||
      !categoryData.nombre
    ) {
      return res.status(400).json({
        error: 'Datos inválidos. Se requiere un objeto con "nombre"',
      });
    }

    const translation = await translator.translateCategory(categoryData);

    res.json({
      success: true,
      data: translation,
    });
  } catch (error) {
    console.error("Error en translate-category:", error);
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

// Endpoint para analizar una carta (imagen o URL)
app.post("/parse-menu", async (req, res) => {
  try {
    const { image, url } = req.body;

    if (!image && !url) {
      return res.status(400).json({
        error: 'Se requiere "image" (base64) o "url"',
      });
    }

    const menuData = await translator.parseMenu({ image, url });

    res.json({
      success: true,
      data: menuData,
    });
  } catch (error) {
    console.error("Error en parse-menu:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      message: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  console.log(`Endpoints disponibles:`);
  console.log(`- GET  /hola`);
  console.log(`- POST /create-customer-portal-session`);
  console.log(`- POST /check-subscription`);
  console.log(`- POST /get-customer-by-email`);
  console.log(`- POST /translate-dish`);
  console.log(`- POST /translate-category`);
  console.log(`- POST /translate-dishes`);
  console.log(`- POST /parse-menu`);
  console.log(`- GET  /translate/health`);
});
