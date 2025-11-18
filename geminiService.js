const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class GeminiTranslator {
  constructor() {
    // Asegúrate de tener GEMINI_API_KEY en tu archivo .env

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  /**
   * Traduce un plato de comida a múltiples idiomas usando Gemini
   * @param {Object} dishData - JSON con datos del plato (nombre, descripcion, alergenos, opciones, etc.)
   * @returns {Promise<Object>} El objeto original con las traducciones rellenadas
   */
  async translateDish(dishData) {
    try {
      const prompt = this.createPrompt(dishData);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      return this.extractJson(content);
    } catch (error) {
      console.error(
        "Error en la API de Gemini:",
        error.response?.data || error.message
      );
      throw new Error("Error al traducir el plato con Gemini");
    }
  }

  createPrompt(dishData) {
    const nombre = dishData.nombre || "";
    const precio = dishData.precio || "";
    const descripcion = dishData.descripcion || "";
    const alergenos = dishData.alergenos || "";
    const opciones = dishData.opciones || [];

    return `
        Traduce los siguientes campos de un plato de comida a inglés, francés, alemán e italiano.
        Mantén el precio sin cambios.
        Devuelve ÚNICAMENTE un JSON con el objeto completo, incluyendo los campos originales y las traducciones rellenadas, sin texto adicional ni markdown:

        {
            "nombre": "${nombre}",
            "precio": ${precio},
            "descripcion": "${descripcion}",
            "alergenos": "${alergenos}",
            "opciones": ${JSON.stringify(opciones)},
            "nombreEn": "traducción al inglés aquí",
            "descripcionEn": "traducción al inglés aquí",
            "alergenosEn": "traducción al inglés aquí",
            "opcionesEn": ["traducción1", "traducción2"],
            "nombreFr": "traduction en français ici",
            "descripcionFr": "traduction en français ici",
            "alergenosFr": "traduction en français ici",
            "opcionesFr": ["traduction1", "traduction2"],
            "nombreDe": "Übersetzung auf Deutsch hier",
            "descripcionDe": "Übersetzung auf Deutsch hier",
            "alergenosDe": "Übersetzung auf Deutsch hier",
            "opcionesDe": ["Übersetzung1", "Übersetzung2"],
            "nombreIt": "traduzione in italiano qui",
            "descripcionIt": "traduzione in italiano qui",
            "alergenosIt": "traduzione in italiano qui",
            "opcionesIt": ["traduzione1", "traduzione2"]
        }

        Asegúrate de que todas las traducciones sean precisas y apropiadas para el contexto culinario.
        `;
  }

  extractJson(text) {
    try {
      // Busca el primer { y último } para extraer el JSON, ignorando el markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No se encontró un JSON válido en la respuesta.");
    } catch (error) {
      console.error("Error al extraer JSON:", error.message);
      throw new Error("La respuesta del modelo no es un JSON válido.");
    }
  }
}

module.exports = GeminiTranslator;
