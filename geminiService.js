const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class GeminiTranslator {
  constructor() {
    // Asegúrate de tener GEMINI_API_KEY en tu archivo .env

    this.genAI = new GoogleGenerativeAI(
      "AIzaSyBQf0Fe5hbwPjEU1yCSYwpYlVSrZ3UUswo"
    );
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Traduce un plato de comida a múltiples idiomas usando Gemini
   * @param {Object} dishData - JSON con nombre del plato e ingredientes
   * @returns {Promise<Object>} Traducciones en los idiomas solicitados
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
    const ingredientes = dishData.ingredientes || [];

    return `
        Traduce el siguiente plato de comida a español, inglés, italiano, alemán y francés.
        Devuelve ÚNICAMENTE un JSON con el siguiente formato, sin texto adicional ni markdown:

        {
            "original": {
                "nombre": "${nombre}",
                "ingredientes": ${JSON.stringify(ingredientes)}
            },
            "traducciones": {
                "español": {
                    "nombre": "traducción aquí",
                    "ingredientes": ["traducción1", "traducción2"]
                },
                "ingles": {
                    "nombre": "translation here",
                    "ingredientes": ["translation1", "translation2"]
                },
                "italiano": {
                    "nombre": "traduzione qui",
                    "ingredientes": ["traduzione1", "traduzione2"]
                },
                "aleman": {
                    "nombre": "Übersetzung hier",
                    "ingredientes": ["Übersetzung1", "Übersetzung2"]
                },
                "frances": {
                    "nombre": "traduction ici",
                    "ingredientes": ["traduction1", "traduction2"]
                }
            }
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
