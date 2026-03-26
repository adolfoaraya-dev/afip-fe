const fs = require('fs').promises;
const path = require('path'); 
const AfipFileLoader = require('../services/afip-file-loader'); 
const AfipLoginCmsGenServices = require('../services/afip-cms-gen-services'); 
const AfipServices = require('../services/afip-services'); 
const config = require('../config/app-config.json');
const { log } = require('console');
const { sign } = require('crypto');
const xml2js = require('xml2js');

class AfipEngineApi {
    constructor() {
    }


    async login () {
        try {

            // ============================================
            // VERIFICAR SI YA HAY UN TOKEN VÁLIDO`^`~
            // ============================================
            const filePath = path.join(__dirname, '../config', `afip-login-cms-data-${config.env}.json`);
            let tokenValido = false;



            try {
                // Verificar si el archivo existe
                await fs.access(filePath);

                // Leer el archivo existente
                const data = await fs.readFile(filePath, 'utf8');
                const tokenExistente = JSON.parse(data);

                console.log('afip-login-cms-data: ', data);

                // Verificar si tiene ticket y fecha de expiración
                if (tokenExistente?.data?.ticket?.expirationTime) {
                    const expiracion = new Date(tokenExistente.data.ticket.expirationTime);
                    const ahora = new Date();

                    if (expiracion > ahora) {
                        console.log('✅ Token existente VÁLIDO - Usando caché');
                        console.log(`   Expira: ${expiracion.toLocaleString()}`);

                        // Devolver el token existente
                        return {
                            success: true,
                            message: 'Token válido existente (desde archivo)',
                            fromCache: true,
                            data: tokenExistente.data,
                            env: config.env.toLocaleUpperCase()
                        };
                    } else {
                        console.log('⚠️ Token expirado - Generando uno nuevo');
                        console.log(`   Expiró: ${expiracion.toLocaleString()}`);
                    }
                }
            } catch (error) {
                // Archivo no existe o está corrupto - generar nuevo
                console.log('📁 No hay token válido en archivo - Generando nuevo');
            }

            const fileLoader = new AfipFileLoader();
            const claves = await fileLoader.leerTodasLasClaves();



            // Instanciar generador de CMS
            const generador = new AfipLoginCmsGenServices();

            // Generar CMS
            const cmsResult = generador.generarCmsCompleto({
                privateKeyPem: claves.privateKeyPem,
                certificatePem: claves.certificatePem,
                service: 'wsfe',
                uniqueId: Math.floor(Math.random() * 1000000).toString()
            });

            console.log('✅ CMS generado. Longitud:', cmsResult.length);

            console.log('📤 PASO 2: Enviando a AFIP WSAA...');

            // Instanciar servicio de AFIP
            const afip = new AfipServices();

            // Obtener ticket con el CMS generado
            const ticketResult = await afip.obtenerTicketAcceso(cmsResult.cmsBase64);

            if (ticketResult.success) {
                console.log('✅ Ticket obtenido correctamente');

                const respuestaCompleta = {
                    success: true,
                    message: 'Login exitoso',
                    env: config.env.toLocaleUpperCase(),
                    timestamp: new Date().toISOString(),
                    fromCache: false,
                    data: {
                        cms: {
                            tra: cmsResult.traXml,
                            cmsPreview: cmsResult.preview,
                            longitud: cmsResult.length
                        },
                        ticket: {
                            uniqueId: ticketResult.data.uniqueId,
                            generationTime: ticketResult.data.generationTime,
                            expirationTime: ticketResult.data.expirationTime,
                            token: ticketResult.data.token,
                            sign: ticketResult.data.sign,
                            xml: ticketResult.data.xml
                        }
                    }
                };

                // Definir ruta del archivo
                const filePath = path.join(__dirname, '../config', `afip-login-cms-data-${config.env}.json`);

                // Guardar archivo
                await fs.writeFile(
                    filePath,
                    JSON.stringify(respuestaCompleta, null, 2), // null,2 para formato legible
                    'utf8'
                );

                console.log(`✅ Archivo guardado en: ${filePath}`);

                // Enviar respuesta al cliente
                return (respuestaCompleta);

            } else {
               return {
                    success: false,
                    message: 'Error al obtener ticket',
                    details: ticketResult.error,
                    env: config.env.toLocaleUpperCase(),
                    cmsGenerado: {
                        preview: cmsResult.preview,
                        tra: cmsResult.traXml
                    }
                };
            }

        } catch (error) {
            console.error('❌ Error:', error);
            return{
                success: false,
                message: error.message
            };
        }
    }

    async ultimoComprobanteAutorizado (req) {
        try {

            const auth = await this.login()



            const afip = new AfipServices();

            // Obtener ticket con el CMS generado
            const result = await afip.ultimoComprobanteAutorizado({
                token: auth.data.ticket.token,
                sign: auth.data.ticket.sign,
                cuit: "20312354846",
                ptoVta: req.body.ptoVta,        
                cbteTipo: req.body.cbteTipo           

            });

            console.log('ultimoComprobanteAutorizado', result)
            return result;


        } catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async generarFactura (req) {
        try {

            const auth = await this.login()

            const afip = new AfipServices();

            const params = {
                metadata: req.body.metadata, 
                token: auth.data.ticket.token,
                sign: auth.data.ticket.sign,
                cuit: req.body.cuit,  
                ptoVta: req.body.ptoVta,        
                cbteTipo: req.body.cbteTipo,    
                concepto: req.body.concepto,    
                docTipo: req.body.docTipo,    
                docNro: req.body.docNro,    
                cbteDesde: req.body.cbteDesde,    
                cbteHasta: req.body.cbteHasta,    
                cbteFch: req.body.cbteFch,    
                fchServDesde: req.body.fchServDesde,    
                fchServHasta: req.body.fchServHasta,    
                fchVtoPago: req.body.fchVtoPago,    
                impTotal: req.body.impTotal,    
                impNeto: req.body.impNeto,    
                condicionIVAReceptorId: req.body.condicionIVAReceptorId,    
                obsMsg: req.body.obsMsg,    
                obsCode: req.body.obsCode,    
            };

            // Obtener ticket con el CMS generado
            const result = await afip.generarFactura(params);


            return result;


        } catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

     async obtenerFactura (req) {

        console.log('obtenerFactura',req.body)
            
       try {
            const afip = new AfipServices();

            const params = {
                filename: req.body.filename
            }

            var jsonData = await afip.obtenerFactura(params)


                return {
                    success: true,
                    data: jsonData
                };


        } catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async condicionIvaReceptor (req) {
        try {

            const auth = await this.login()



            const afip = new AfipServices();

            // Obtener ticket con el CMS generado
            const result = await afip.condicionIvaReceptor({
                token: auth.data.ticket.token,
                sign: auth.data.ticket.sign,
                cuit: "20312354846"
            });


            return result;


        } catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async consultarCUIT (req) {

        console.log('consultarCUIT',req.body)
            
       try {

            const afip = new AfipServices();

            // Obtener ticket con el CMS generado
            const result = await afip.consultarCUIT({
                cuit: req.body.cuit
            });


            return result;


        } catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }


    async generarQr (req) {

        console.log('consultarCUIT',req.body)
            
       try {

            const afip = new AfipServices();

            // Obtener ticket con el CMS generado
            const result = await afip.generarQr({
                qrUrl: req.body.qrUrl
            });


            return result;


        } catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

}

module.exports = AfipEngineApi;