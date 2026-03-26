const forge = require('node-forge');
const AfipServices = require('./afip-services');


class AfipLoginCmsGenServices {
    constructor() {
        this.forge = forge;
    }

    /**
     * Genera el TRA (Ticket de Requerimiento de Acceso)
     * @param {Object} opciones - Configuración del TRA
     */
    generarTra(opciones = {}) {
        const {
            uniqueId = '12',
            generationTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            expirationTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
            service = 'wsfe'
        } = opciones;

        // Formato específico que espera AFIP (sin milisegundos)
        const genTime = generationTime.replace(/\.\d{3}Z$/, 'Z');
        const expTime = expirationTime.replace(/\.\d{3}Z$/, 'Z');

        const traXml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;

        return traXml;
    }

    /**
     * Crea el CMS exactamente como lo hacía en Postman
     * @param {string} traXml - El XML del TRA
     * @param {string} privateKeyPem - Clave privada en formato PEM
     * @param {string} certificatePem - Certificado en formato PEM
     */
    crearCMSAfip(traXml, privateKeyPem, certificatePem) {
        try {
            // Parsear clave privada y certificado
            const privateKey = this.forge.pki.privateKeyFromPem(privateKeyPem);
            const certificate = this.forge.pki.certificateFromPem(certificatePem);

            // Crear el contenido (TRA)
            const content = this.forge.util.createBuffer(traXml, 'utf8');

            // Crear estructura SignedData
            const p7 = this.forge.pkcs7.createSignedData();
            p7.content = content;

            // Agregar el firmante con TODOS los atributos requeridos por AFIP
            p7.addSigner({
                key: privateKey,
                certificate: certificate,
                digestAlgorithm: this.forge.pki.oids.sha256,
                authenticatedAttributes: [
                    {
                        type: this.forge.pki.oids.contentType,
                        value: this.forge.pki.oids.data
                    },
                    {
                        type: this.forge.pki.oids.messageDigest
                        // Se calculará automáticamente
                    },
                    {
                        type: this.forge.pki.oids.signingTime,
                        value: new Date()
                    }
                ]
            });

            // Forzar inclusión del certificado
            p7.certificates = [certificate];

            // Firmar (detached: false para incluir el contenido)
            p7.sign({ detached: false });

            return p7;

        } catch (error) {
            throw new Error(`Error al crear CMS: ${error.message}`);
        }
    }

    /**
     * Convierte el PKCS#7 a Base64 (formato que espera AFIP)
     * @param {Object} p7 - El objeto PKCS#7 generado
     */
    cmsToBase64(p7) {
        // Convertir a PEM
        const pem = this.forge.pkcs7.messageToPem(p7);
        
        // Extraer solo el contenido Base64 (sin headers)
        const base64Lines = pem.split('\n');
        let base64 = '';
        
        // Empezar desde la línea 1 (después de -----BEGIN PKCS7-----)
        // Hasta la línea antes de -----END PKCS7-----
        for (let i = 1; i < base64Lines.length - 2; i++) {
            base64 += base64Lines[i].trim();
        }
        
        return base64;
    }

    /**
     * Método principal: genera el CMS completo
     * @param {Object} opciones - Configuración completa
     */
    generarCmsCompleto(opciones) {
        const {
            privateKeyPem,
            certificatePem,
            uniqueId = Math.floor(Math.random() * 1000000).toString(),
            generationTime,
            expirationTime,
            service = 'wsfe'
        } = opciones;

        // Validar que tenemos las claves
        if (!privateKeyPem || !certificatePem) {
            throw new Error('Se requiere privateKeyPem y certificatePem');
        }

        // Generar TRA
        const traXml = this.generarTra({
            uniqueId,
            generationTime,
            expirationTime,
            service
        });

        console.log('📄 TRA generado:', traXml.substring(0, 200) + '...');

        // Crear CMS
        const p7 = this.crearCMSAfip(traXml, privateKeyPem, certificatePem);

        // Convertir a Base64
        const cmsBase64 = this.cmsToBase64(p7);

        return {
            traXml,
            cmsBase64,
            length: cmsBase64.length,
            preview: cmsBase64.substring(0, 100)
        };
    }

    /**
     * Guarda las claves en variables de entorno (útil para desarrollo)
     */
    static async cargarClavesDesdeArchivos(rutaPrivada, rutaCertificado) {
        const fs = require('fs').promises;
        
        try {
            const [privateKey, certificate] = await Promise.all([
                fs.readFile(rutaPrivada, 'utf8'),
                fs.readFile(rutaCertificado, 'utf8')
            ]);
            
            return { privateKeyPem: privateKey, certificatePem: certificate };
        } catch (error) {
            throw new Error(`Error al cargar claves: ${error.message}`);
        }
    }
}

module.exports = AfipLoginCmsGenServices;