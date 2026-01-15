// geminiService.js
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

class GeminiTranslator {
  constructor() {
    // Asegúrate de tener GEMINI_API_KEY en tu archivo .env
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Traduce una categoría a múltiples idiomas usando Gemini
   */
  async translateCategory(categoryData) {
    try {
      const prompt = this.createCategoryPrompt(categoryData);

      const response = await this.ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });
      
      const content = response.text; // En la nueva lib, text es una propiedad (getter) o función? User snippet says property.

      return this.extractJson(content);
    } catch (error) {
      console.error(
        "Error en la API de Gemini (translateCategory):",
        error
      );
      throw new Error("Error al traducir la categoría con Gemini");
    }
  }

  createCategoryPrompt(categoryData) {
    const nombre = categoryData.nombre || "";

    return `
        Traduce el nombre de la siguiente categoría a inglés, francés, alemán e italiano.
        Devuelve ÚNICAMENTE un JSON con el objeto completo, incluyendo el campo original y las traducciones rellenadas, sin texto adicional ni markdown:

        {
            "nombre": "${nombre}",
            "nombreEn": "traducción al inglés aquí",
            "nombreFr": "traduction en français ici",
            "nombreDe": "Übersetzung auf Deutsch hier",
            "nombreIt": "traduzione in italiano qui"
        }

        Asegúrate de que las traducciones sean precisas.
        `;
  }

  async translateDish(dishData) {
    try {
      const prompt = this.createPrompt(dishData);

      const response = await this.ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });
      
      const content = response.text;

      return this.extractJson(content);
    } catch (error) {
      console.error(
        "Error en la API de Gemini (translateDish):",
        error
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

  async parseMenu(input) {
    try {
      const { image, url } = input;
      let promptParts = [];

      promptParts.push({
          text: `
        Analiza esta imagen de menú de restaurante y extrae todas las categorías y productos.
        Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura exacta:
        {
          "categories": [
            {
              "name": "Nombre Categoría",
              "products": [
                {
                  "nombre": "Nombre Producto",
                  "precio": 10.50,
                  "descripcion": "descripción del plato",
                  "alergenos": "lista de alergenos si se mencionan",
                  "opciones": ["opción 1", "opción 2"]
                }
              ]
            }
          ]
        }
        - El precio debe ser un número. Si no hay precio, pon 0.
        - Si no hay descripción, string vacío.
        - Ignora elementos decorativos o que no sean comida/bebida.
        - Agrupa lógicamente por las cabeceras que veas en la imagen.
      `});

      if (image) {
        // Asegurar que solo enviamos la parte base64 sin el header
        const base64Data = image.includes("base64,")
          ? image.split("base64,")[1]
          : image;

        promptParts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        });
      } else if (url) {
        promptParts.push({ text: `\nAquí está la URL del menú: ${url}. Intenta extraer el texto y estructura del menú de esta URL si es posible.` });
      }

      const response = await this.ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: promptParts,
      });

      const content = response.text;

      return this.extractJson(content);
    } catch (error) {
      console.error(
        "Error en la API de Gemini (parseMenu):",
        error
      );
      throw new Error("Error al analizar el menú con IA");
    }
  }

  extractJson(text) {
    try {
      // Busca el primer { y último } para extraer el JSON, ignorando el markdown
      if (!text) return null;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         // Limpieza de caracteres problemáticos si fuera necesario
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No se encontró un JSON válido en la respuesta.");
    } catch (error) {
      console.error("Error al extraer JSON:", error.message, text);
      throw new Error("La respuesta del modelo no es un JSON válido.");
    }
  }
}

module.exports = GeminiTranslator;
