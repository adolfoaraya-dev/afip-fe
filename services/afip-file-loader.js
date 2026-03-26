const fs = require('fs').promises;
const path = require('path');
const config = require('../config/app-config.json');

class AfipFileLoader {
    constructor(certsPath = '../config') {
        this.certsPath = path.join(__dirname, certsPath);

        this.privateKeyPath = config.setting[config.env].privateKey;
        this.certificatePemPath = config.setting[config.env].certificatePem;

    }

    /**
     * Lee la clave privada del archivo
     */
    async leerPrivateKey() {
        try {
            const filePath = path.join(this.certsPath, this.privateKeyPath);
            console.log("privateKeyPath: "+filePath)

            const content = await fs.readFile(filePath, 'utf8');
            return content.trim(); // Eliminar espacios en blanco al inicio/final
        } catch (error) {
            throw new Error(`Error al leer clave privada: ${error.message}`);
        }
    }

    /**
     * Lee el certificado del archivo
     */
    async leerCertificate() {
        try {
            const filePath = path.join(this.certsPath, this.certificatePemPath);
            console.log("certificatePemPath: "+filePath)



            const content = await fs.readFile(filePath, 'utf8');
            return content.trim();
        } catch (error) {
            throw new Error(`Error al leer certificado: ${error.message}`);
        }
    }

    /**
     * Lee ambas claves
     */
    async leerTodasLasClaves() {
        try {
            const [privateKey, certificate] = await Promise.all([
                this.leerPrivateKey(),
                this.leerCertificate()
            ]);

            return {
                privateKeyPem: privateKey,
                certificatePem: certificate
            };
        } catch (error) {
            throw new Error(`Error al leer claves: ${error.message}`);
        }
    }

    /**
     * Verifica que los archivos existen
     */
    async verificarArchivos() {
        try {
            const files = await fs.readdir(this.certsPath);
            console.log('📁 Archivos en carpeta certs:', files);
            return files;
        } catch (error) {
            console.error('❌ No se pudo leer la carpeta certs:', error.message);
            return [];
        }
    }

    /**
     * Carga configuración completa (claves + config JSON)
     */
    async cargarConfiguracionCompleta(configPath = '../config/afip-config.json') {
        try {
            // Leer claves de los archivos PEM
            const claves = await this.leerTodasLasClaves();

            // Leer configuración adicional del JSON
            const configFilePath = path.join(__dirname, configPath);
            let config = {};
            
            try {
                const configData = await fs.readFile(configFilePath, 'utf8');
                config = JSON.parse(configData);
            } catch (e) {
                console.log('⚠️ No se encontró archivo de configuración, usando valores por defecto');
            }

            return {
                privateKeyPem: claves.privateKeyPem,
                certificatePem: claves.certificatePem,
                service: config.service || 'wsfe',
                uniqueId: config.uniqueId || Math.floor(Math.random() * 1000000).toString(),
                environment: config.environment || 'production'
            };

        } catch (error) {
            throw new Error(`Error al cargar configuración: ${error.message}`);
        }
    }
}

module.exports = AfipFileLoader;