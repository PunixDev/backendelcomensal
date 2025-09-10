const DeepSeekTranslator = require("./deepseekService");

const translator = new DeepSeekTranslator();

/**
 * Controlador para traducir platos
 */
const translationController = {
  async translateFood(req, res) {
    try {
      const { nombre, ingredientes } = req.body;

      // Validación básica
      if (!nombre || !ingredientes || !Array.isArray(ingredientes)) {
        return res.status(400).json({
          error:
            'Datos inválidos. Se requiere "nombre" y "ingredientes" (array)',
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
      console.error("Error en translateFood:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: error.message,
      });
    }
  },

  async translateMultipleDishes(req, res) {
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
      console.error("Error en translateMultipleDishes:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: error.message,
      });
    }
  },
};

module.exports = translationController;
