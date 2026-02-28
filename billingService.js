/**
 * billingService.js
 * 
 * Este servicio actúa como fachada para la integración con el proveedor de facturación
 * de terceros (ej: B2Brouter, FacturaDirecta, etc.) para cumplir con Verifactu / TicketBAI.
 * 
 * Instrucciones:
 * 1. Configurar las variables de entorno del proveedor (API_KEY, ENDPOINT).
 * 2. Mapear el JSON de la orden (Ionic) al formato requerido por el proveedor.
 */

const axios = require('axios');

class BillingService {
  constructor() {
    // Configuración genérica para el proveedor de la API de facturación
    this.apiUrl = process.env.BILLING_API_URL || 'https://api.proveedor-facturacion.com/v1';
    this.apiKey = process.env.BILLING_API_KEY || 'TU_API_KEY_AQUI';
  }

  /**
   * Genera una factura oficial a través del proveedor de terceros.
   * El proveedor se encargará de:
   * 1. Crear el XML (FacturaE).
   * 2. Firmarlo con el certificado digital configurado en su plataforma.
   * 3. Enviarlo a la AEAT (Verifactu) o Hacienda Foral (TicketBAI).
   * 4. Devolver la URL del QR y códigos identificativos (TBAI / UUID).
   * 
   * @param {Object} orderData Datos del pedido/ticket desde el Frontend
   * @param {Object} businessData Datos configurados del restaurante (NIF, Razón Social)
   * @returns {Object} Respuesta con { qrUrl, invoiceId, tbaiCode, etc. }
   */
  async generateInvoice(orderData, businessData) {
    try {
      console.log('Iniciando generación de factura para pedido:', orderData.id || 'N/A');

      // 1. Mapeo de datos: Convertir "orderData" al esquema esperado por el proveedor
      const payload = this.mapOrderToImplementationFormat(orderData, businessData);

      /*
      // EJEMPLO DE LLAMADA REAL AL PROVEEDOR
      const response = await axios.post(`${this.apiUrl}/invoices`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        invoiceNumber: response.data.invoice_number,
        qrUrl: response.data.verifactu_qr_url,
        tbaiCode: response.data.tbai_code,
        pdfUrl: response.data.pdf_url
      };
      */

      // --- MOCK RESPONSE PARA DESARROLLO Y PRUEBAS FRONTEND ---
      // Simula el retraso de la red y la firma del XML
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockInvoiceNumber = `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      return {
        success: true,
        invoiceNumber: mockInvoiceNumber,
        // URL de prueba simulando un QR de la AEAT o TicketBAI
        qrUrl: `https://www.aeat.es/verifactu?id=${mockInvoiceNumber}&total=${orderData.total}`,
        tbaiCode: 'TBAI-12345678-ABCD-EFGH',
        message: 'Factura generada y reportada correctamente (MODO SIMULACIÓN)'
      };

    } catch (error) {
      console.error('Error al generar la factura con el proveedor:', error.message);
      if (error.response) {
        console.error('Respuesta de error del proveedor:', error.response.data);
      }
      throw new Error('No se pudo generar la factura electrónica: ' + error.message);
    }
  }

  /**
   * Función auxiliar para estructurar los datos según el proveedor.
   */
  mapOrderToImplementationFormat(orderData, businessData) {
    // Aquí deberás adaptar los campos según la documentación de la API externa elegida.
    // Ej: FacturaDirecta, Holded, B2Brouter, etc.
    
    const items = (orderData.productos || orderData.items || []).map(item => ({
      name: item.nombre || item.name,
      quantity: item.cantidad || item.quantity,
      unitPrice: item.precio || item.price,
      // Asumimos un IVA por defecto si no viene especificado (ej. España Hostelería 10%)
      taxRate: item.iva || 10 
    }));

    return {
      issueDate: new Date().toISOString(),
      currency: 'EUR',
      issuer: {
        nif: businessData?.nif || 'B12345678',
        name: businessData?.nombre || 'Restaurante de Prueba',
      },
      customer: {
        // En TPV de hostelería suele ser factura simplificada sin cliente
        nif: orderData.cliente?.nif || '',
        name: orderData.cliente?.nombre || 'Consumidor Final'
      },
      lines: items,
      totalAmount: orderData.total
    };
  }
}

module.exports = BillingService;
