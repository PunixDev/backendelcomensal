const express = require("express");
const router = express.Router();
const translationController = require("./controller");

// Ruta para traducir un solo plato
router.post("/translate", translationController.translateFood);

// Ruta para traducir múltiples platos
router.post("/translate/batch", translationController.translateMultipleDishes);

// Ruta de salud
router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Servicio de traducción funcionando" });
});

module.exports = router;
