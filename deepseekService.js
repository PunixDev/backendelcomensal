const axios = require("axios");
require("dotenv").config();

class DeepSeekTranslator {
  constructor() {
    this.apiKey = "sk-3dd7f4ea32ed4b4b822d25faf6c972ab";
    this.apiUrl = "https://api.deepseek.com/v1/chat/completions";
  }

  /**
   * Traduce un plato de comida a múltiples idiomas
   * @param {Object} dishData - JSON con nombre del plato e ingredientes
   * @returns {Promise<Object>} Traducciones en los idiomas solicitados
   */
  async translateDish(dishData) {
    try {
      const prompt = this.createPrompt(dishData);

      const payload = {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Eres un traductor especializado en gastronomía. Devuelve siempre JSON válido sin texto adicional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      };

      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers,
        timeout: 30000,
      });
      const content = response.data.choices[0].message.content;

      return this.extractJson(content);
    } catch (error) {
      console.error(
        "Error en la API DeepSeek:",
        error.response?.data || error.message
      );
      throw new Error("Error al traducir el plato");
    }
  }

  createPrompt(dishData) {
    const nombre = dishData.nombre || "";
    const ingredientes = dishData.ingredientes || [];

    return `
        Traduce el siguiente plato de comida a español, inglés, italiano, alemán y francés.
        Devuelve ÚNICAMENTE un JSON con el siguiente formato, sin texto adicional:

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
      // Buscar el primer { y último } para extraer el JSON
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}") + 1;

      if (start === -1 || end === 0) {
        throw new Error("No se encontró JSON en la respuesta");
      }

      const jsonStr = text.substring(start, end);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Error al extraer JSON:", error);
      throw new Error("Formato de respuesta inválido");
    }
  }
}

module.exports = DeepSeekTranslator;
