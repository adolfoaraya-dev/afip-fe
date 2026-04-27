const axios = require('axios');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false });
const builder = new xml2js.Builder();
const fs = require('fs').promises;
const path = require('path');
const config = require('../environment/environment.json');
const { json } = require('stream/consumers');
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const QRCode = require('qrcode');
const storage = require('./memory-storage.js');
const cheerio = require('cheerio');

class AfipServices {
    constructor() {

        this.service = 'wsfe'; // o el servicio que necesites: wsfe, wsfev1, etc.

        this.url = config.setting[config.env].url;
        this.urlLogin = config.setting[config.env].urlLogin;

        this.loadCuitsStorage(config.setting[config.env].cuits);

    }



    async loadCuitsStorage(cuits) {
        cuits.forEach(async e => {
            let result = await this.consultarCUIT({ "cuit": e.cuit })
            storage.set(e.cuit, result);
        });

    }

    async obtenerTicketAcceso(cms) {
        try {
            // Generar el request SOAP
            const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
            <soapenv:Header/>
            <soapenv:Body>
                <wsaa:loginCms>
                    <wsaa:in0>${cms}</wsaa:in0>
                </wsaa:loginCms>
            </soapenv:Body>
            </soapenv:Envelope>`;

            console.log('📤 Enviando request a AFIP WSAA...', soapRequest);

            // Hacer la petición POST
            const response = await axios({
                method: 'post',
                url: this.urlLogin,
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'loginCms',
                    'User-Agent': 'Node.js AFIP Client',
                    'Accept': '*/*'
                },
                data: soapRequest
            });

            // let response = {data:null}
            // response.data = ` <?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Body><loginCmsResponse xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov"><loginCmsReturn>&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot; standalone=&quot;yes&quot;?&gt;    
            // &lt;loginTicketResponse version=&quot;1.0&quot;&gt;
            //     &lt;header&gt;
            //         &lt;source&gt;CN=wsaa, O=AFIP, C=AR, SERIALNUMBER=CUIT 33693450239&lt;/source&gt;
            //         &lt;destination&gt;SERIALNUMBER=CUIT 20312354846, CN=adolfoaraya&lt;/destination&gt;
            //         &lt;uniqueId&gt;1184047143&lt;/uniqueId&gt;
            //         &lt;generationTime&gt;2026-03-19T13:39:59.339-03:00&lt;/generationTime&gt;
            //         &lt;expirationTime&gt;2026-03-20T01:39:59.339-03:00&lt;/expirationTime&gt;
            //     &lt;/header&gt;
            //     &lt;credentials&gt;
            //         &lt;token&gt;PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8c3NvIHZlcnNpb249IjIuMCI+CiAgICA8aWQgc3JjPSJDTj13c2FhLCBPPUFGSVAsIEM9QVIsIFNFUklBTE5VTUJFUj1DVUlUIDMzNjkzNDUwMjM5IiBkc3Q9IkNOPXdzZmUsIE89QUZJUCwgQz1BUiIgdW5pcXVlX2lkPSIyOTkyNDc0NzEyIiBnZW5fdGltZT0iMTc3MzkzODMzOSIgZXhwX3RpbWU9IjE3NzM5ODE1OTkiLz4KICAgIDxvcGVyYXRpb24gdHlwZT0ibG9naW4iIHZhbHVlPSJncmFudGVkIj4KICAgICAgICA8bG9naW4gZW50aXR5PSIzMzY5MzQ1MDIzOSIgc2VydmljZT0id3NmZSIgdWlkPSJTRVJJQUxOVU1CRVI9Q1VJVCAyMDMxMjM1NDg0NiwgQ049YWRvbGZvYXJheWEiIGF1dGhtZXRob2Q9ImNtcyIgcmVnbWV0aG9kPSIyMiI+CiAgICAgICAgICAgIDxyZWxhdGlvbnM+CiAgICAgICAgICAgICAgICA8cmVsYXRpb24ga2V5PSIyMDMxMjM1NDg0NiIgcmVsdHlwZT0iNCIvPgogICAgICAgICAgICA8L3JlbGF0aW9ucz4KICAgICAgICA8L2xvZ2luPgogICAgPC9vcGVyYXRpb24+Cjwvc3NvPgo=&lt;/token&gt;
            //         &lt;sign&gt;P78koBBnYt13qwRd3fVyZBwiMyTG61kjpREzmTtXX4bPZNvsnIjVUCP2zsgox3rOQRKX01B6kmCwYQhUNvOrLsjR/vANf6fuVqZkDSJY6z4yKwy/pYIWXs2p27EKUqxWxns08dzqf67a8X57b4d6S0eDLVPgDZ4WjEyefG7h/Cg=&lt;/sign&gt;
            //     &lt;/credentials&gt;
            // &lt;/loginTicketResponse&gt;
            // </loginCmsReturn></loginCmsResponse></soapenv:Body></soapenv:Envelope>`


            console.log('📥 Respuesta recibida de AFIP', response.data);

            let result = await parser.parseStringPromise(response.data);


            // Navegar por la estructura del SOAP response
            const body = result['soapenv:Envelope']['soapenv:Body'];
            const loginResponse = body['loginCmsResponse'];
            const loginReturn = loginResponse['loginCmsReturn'];

            // Parsear el loginTicketReturn que viene como XML escapado
            let ticketResult = await parser.parseStringPromise(loginReturn)


            const ticket = ticketResult.loginTicketResponse;
            let ticketMap = {
                uniqueId: ticket.header.uniqueId,
                generationTime: ticket.header.generationTime,
                expirationTime: ticket.header.expirationTime,
                token: ticket.credentials.token,
                sign: ticket.credentials.sign,
                raw: ticket,
                xml: response.data
            }


            return {
                success: true,
                data: ticketMap
            };

        } catch (error) {
            console.error('❌ Error en llamada a AFIP:', error.message);

            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }

            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    async ultimoComprobanteAutorizado(params) {
        try {

            const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
                <soapenv:Header/>
                <soapenv:Body>
                    <ar:FECompUltimoAutorizado>
                        <ar:Auth>
                            <ar:Token>${params.token}</ar:Token>
                            <ar:Sign>${params.sign}</ar:Sign>
                            <ar:Cuit>${params.cuit}</ar:Cuit>
                        </ar:Auth>
                        <ar:PtoVta>${params.ptoVta}</ar:PtoVta>
                        <ar:CbteTipo>${params.cbteTipo}</ar:CbteTipo>
                    </ar:FECompUltimoAutorizado>
                </soapenv:Body>
                </soapenv:Envelope>`;


            console.log('📤 Enviando request a AFIP WSFEv1...' + soapRequest);

            const response = await axios({
                method: 'post',
                url: this.url,
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
                    'User-Agent': 'Node.js AFIP Client'
                },
                data: soapRequest
            });

            console.log('📥 Respuesta recibida de AFIP');
            let result = await parser.parseStringPromise(response.data);
            // Navegar por la estructura SOAP
            const body = result['soap:Envelope']['soap:Body'];
            const responsesoap = body['FECompUltimoAutorizadoResponse'];
            const resultData = responsesoap['FECompUltimoAutorizadoResult'];

            const parsed = {
                ptoVta: resultData.PtoVta,
                cbteTipo: resultData.CbteTipo,
                cbteNro: parseInt(resultData.CbteNro, 10),
                events: []
            };

            // Procesar eventos/advertencias si existen
            if (resultData.Events?.Evt) {
                const events = Array.isArray(resultData.Events.Evt)
                    ? resultData.Events.Evt
                    : [resultData.Events.Evt];

                parsed.events = events.map(evt => ({
                    code: evt.Code,
                    message: evt.Msg
                }));
            }



            return {
                success: true,
                message: 'OK',
                data: parsed,
                raw: response.data
            };

        } catch (error) {
            console.error('❌ Error en llamada a AFIP WSFEv1:', error.message);

            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }

            return {
                error: error.message,
                details: error.response?.data
            };
        }
    }

    async condicionIvaReceptor(params) {
        try {

            const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
            <soapenv:Header/>
            <soapenv:Body>
                <ar:FEParamGetCondicionIvaReceptor>
                    <ar:Auth>
                        <ar:Token>${params.token}</ar:Token>
                        <ar:Sign>${params.sign}</ar:Sign>
                        <ar:Cuit>${params.cuit}</ar:Cuit>
                    </ar:Auth>
                    <ar:ClaseCmp>C</ar:ClaseCmp> 
                </ar:FEParamGetCondicionIvaReceptor>
            </soapenv:Body>
            </soapenv:Envelope>`;

            console.log('📤 Enviando request a AFIP WSFEv1...' + soapRequest);

            const response = await axios({
                method: 'post',
                url: this.url,
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FEParamGetCondicionIvaReceptor',
                    'User-Agent': 'Node.js AFIP Client'
                },
                data: soapRequest
            });

            console.log('📥 Respuesta recibida de AFIP');
            let result = await parser.parseStringPromise(response.data);
            // Navegar por la estructura SOAP
            const body = result['soap:Envelope']['soap:Body'];
            const responseData = body['FEParamGetCondicionIvaReceptorResponse'];
            const resultData = responseData['FEParamGetCondicionIvaReceptorResult'];
            const resultGet = resultData['ResultGet'];

            let condiciones = [];

            if (resultGet['CondicionIvaReceptor']) {
                const items = Array.isArray(resultGet['CondicionIvaReceptor'])
                    ? resultGet['CondicionIvaReceptor']
                    : [resultGet['CondicionIvaReceptor']];

                condiciones = items.map(item => ({
                    id: parseInt(item.Id, 10),
                    descripcion: item.Desc,
                    claseComprobante: item.Cmp_Clase
                }));
            }

            const parsed = {
                condiciones: condiciones,
                cantidad: condiciones.length
            };

            // Procesar eventos/advertencias si existen
            if (resultData.Events?.Evt) {
                const events = Array.isArray(resultData.Events.Evt)
                    ? resultData.Events.Evt
                    : [resultData.Events.Evt];

                parsed.events = events.map(evt => ({
                    code: evt.Code,
                    message: evt.Msg
                }));
            }

            return {
                success: true,
                message: 'OK',
                data: parsed,
                raw: response.data
            };

        } catch (error) {
            console.error('❌ Error en llamada a AFIP WSFEv1:', error.message);

            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }

            return {
                error: error.message,
                details: error.response?.data
            };
        }
    }

    async generarFactura(params) {
        let filedate = Date.now();
        let returndata = null;
        let requestSoap = null;
        let response = null;


        try {
            let resultado = {};
            requestSoap = `<?xml version="1.0" encoding="utf-8"?>
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
                <soapenv:Header/>
                <soapenv:Body>
                    <ar:FECAESolicitar>
                        <ar:Auth>
                            <ar:Token>${params.token}</ar:Token>
                            <ar:Sign>${params.sign}</ar:Sign>
                            <ar:Cuit>${params.cuit}</ar:Cuit>
                        </ar:Auth>
                        <ar:FeCAEReq>
                            <ar:FeCabReq>
                            <ar:CantReg>${params.cantReg || 1}</ar:CantReg>
                            <ar:PtoVta>${params.ptoVta}</ar:PtoVta>
                            <ar:CbteTipo>${params.cbteTipo}</ar:CbteTipo>
                            </ar:FeCabReq>
                            <ar:FeDetReq>
                            <ar:FECAEDetRequest>
                                <ar:CondicionIVAReceptorId>${params.condicionIVAReceptorId || 4}</ar:CondicionIVAReceptorId>
                                <ar:Concepto>${params.concepto}</ar:Concepto>
                                <ar:DocTipo>${params.docTipo}</ar:DocTipo>
                                <ar:DocNro>${params.docNro}</ar:DocNro>
                                <ar:CbteDesde>${params.cbteDesde}</ar:CbteDesde>
                                <ar:CbteHasta>${params.cbteHasta}</ar:CbteHasta>
                                <ar:CbteFch>${params.cbteFch}</ar:CbteFch>
                                <ar:FchServDesde>${params.fchServDesde}</ar:FchServDesde>
                                <ar:FchServHasta>${params.fchServHasta}</ar:FchServHasta>
                                <ar:FchVtoPago>${params.fchVtoPago}</ar:FchVtoPago>
                                <ar:ImpTotal>${params.impTotal}</ar:ImpTotal>
                                <ar:ImpTotConc>${params.impTotConc || 0}</ar:ImpTotConc>
                                <ar:ImpNeto>${params.impNeto}</ar:ImpNeto>
                                <ar:ImpOpEx>${params.impOpEx || 0}</ar:ImpOpEx>
                                <ar:ImpIVA>${params.impIVA || 0}</ar:ImpIVA>
                                <ar:ImpTrib>${params.impTrib || 0}</ar:ImpTrib>
                                <ar:MonId>${params.monId || 'PES'}</ar:MonId>
                                <ar:MonCotiz>${params.monCotiz || 1}</ar:MonCotiz>
                                <ar:Observaciones>
                                    <ar:Obs>
                                        <ar:Code>${params.obsCode || 0}</ar:Code>
                                        <ar:Msg>${params.obsMsg || ''}</ar:Msg>
                                    </ar:Obs>
                                </ar:Observaciones>
                            </ar:FECAEDetRequest>
                            </ar:FeDetReq>
                        </ar:FeCAEReq>
                    </ar:FECAESolicitar>
                </soapenv:Body>
                </soapenv:Envelope>`;





            console.log('📤 Solicitando CAE a AFIP...', JSON.stringify(params, null, 2));

            response = await axios({
                method: 'post',
                url: this.url,  // usa this.url que ya tienes
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
                    'User-Agent': 'Node.js AFIP Client'
                },
                data: requestSoap
            });


            console.log('📥 Respuesta recibida de AFIP');

            // Parsear respuesta usando parseStringPromise (como vimos antes)
            const result = await parser.parseStringPromise(response.data);

            // Navegar por la estructura
            const body = result['soap:Envelope']['soap:Body'];
            const responseData = body['FECAESolicitarResponse'];
            const resultData = responseData['FECAESolicitarResult'];

            // Extraer datos del comprobante
            const cabecera = resultData['FeCabResp'];
            const detalle = resultData['FeDetResp']['FECAEDetResponse'];
            const errors = resultData['Errors'];

            console.log('responseData', responseData)
            console.log('detalle', detalle)

            //Success
            if ((detalle?.CAE?.length ?? 0) > 2) {
                returndata = {
                    success: true,
                    raw: response.data,
                    data: {
                        filetag: `generar_factura_${filedate}`,
                        cabecera: {
                            cuit: cabecera.Cuit,
                            ptoVta: cabecera.PtoVta,
                            cbteTipo: cabecera.CbteTipo,
                            cantReg: parseInt(cabecera.CantReg, 10),
                            resultado: cabecera.Resultado,
                            fechaProceso: cabecera.FchProceso
                        },
                        comprobante: {
                            concepto: detalle.Concepto,
                            docTipo: detalle.DocTipo,
                            docNro: detalle.DocNro,
                            cbteDesde: parseInt(detalle.CbteDesde, 10),
                            cbteHasta: parseInt(detalle.CbteHasta, 10),
                            cbteFch: detalle.CbteFch,
                            resultado: detalle.Resultado,
                            cae: detalle.CAE,
                            caeFchVto: detalle.CAEFchVto
                        }
                    }
                };
            }

            //Error
            if (errors?.Err) {
                const err = Array.isArray(errors.Err) ? errors.Err[0] : errors.Err;

                returndata = {
                    success: false,
                    errors: {
                        code: err.Code,
                        message: err.Msg
                    }
                };
            }
            //Error
            else if (detalle?.CAE == null || detalle?.CAE == '') {
                console.log(detalle)

                returndata = {
                    success: false,
                    errors: {
                        code: detalle.Observaciones.Obs.Code,
                        message: detalle.Observaciones.Obs.Msg
                    }
                };

            }


            // Mostrar eventos/advertencias si existen
            if (resultData.Events?.Evt) {
                const events = Array.isArray(resultData.Events.Evt)
                    ? resultData.Events.Evt
                    : [resultData.Events.Evt];

                resultado.eventos = events.map(evt => ({
                    code: evt.Code,
                    message: evt.Msg
                }));

                console.log('⚠️ Eventos:', resultado.eventos);
            }



        } catch (error) {
            console.error('❌ Error en FECAESolicitar:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            returndata = {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }


        try {


            const facturaPath = `logs/${config.env}/factura/${returndata.success ? 'ok' : 'error'}`;

            await fs.mkdir(facturaPath, { recursive: true });


            await fs.writeFile(path.join(__dirname, '..', facturaPath, `generar_factura_${filedate}_metadata.json`), JSON.stringify(params), 'utf8');
            await fs.writeFile(path.join(__dirname, '..', facturaPath, `generar_factura_${filedate}_request.xml`), requestSoap, 'utf8');
            await fs.writeFile(path.join(__dirname, '..', facturaPath, `generar_factura_${filedate}_response.xml`), response.data, 'utf8');
        } catch (e) {
            console.error('❌ Error en writeFile:', e);
        }

        return returndata;
    }

    async obtenerFactura(params) {

        console.log('obtenerFactura', params)
        const facturaPath = path.join(__dirname, '..', `logs/${params.env}/factura/ok`);

        try {




            const filePath = path.join(facturaPath, `${params.tag}_response.xml`);
            await fs.access(filePath);

            const xmlData = await fs.readFile(filePath, 'utf8');
            const jsonData = await parser.parseStringPromise(xmlData);


            const filePathReq = path.join(facturaPath, `${params.tag}_metadata.json`);

            await fs.access(filePathReq);

            const jsonDataReq = await fs.readFile(filePathReq, 'utf8');

            return {
                success: true,
                response: jsonData,
                request: JSON.parse(jsonDataReq)
            };


        } catch (error) {
            console.error('❌ Error:', error);
        }

        return resultdata
    }

    async consultarCUIT_(params) {

        try {



            const response = await axios.get(`https://www.cuitonline.com/search/${params.cuit}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            let html = response.data;

            const clean = (txt) =>
                txt
                    .replace(/&#8226;/g, '•')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&raquo;/g, '»')
                    .replace(/\s+/g, ' ')
                    .trim();

            const get = (txt, r) =>
                clean(txt.match(r)?.[1] || '');

            // 🔹 aislar SOLO el resultado
            const hit = html.match(/<div class="hit"[\s\S]*?<\/div>\s*<\/div>/)?.[0];

            if (!hit) return { success: false };

            const razonSocial = get(hit, /<h2 class="denominacion"[^>]*>(.*?)<\/h2>/);

            const cuit = get(hit, /<span class="cuit">(.*?)<\/span>/)
                .replace(/\D/g, '');

            const bloque = get(hit, /<div class="doc-facets"[^>]*>([\s\S]*?)<\/div>/);

            const detalle = bloque
                ? [...bloque.matchAll(/<\/span>\s*([^<]+?)\s*<br\s*\/?>/gi)]
                    .map(m =>
                        m[1]
                            .replace(/&nbsp;/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                    )
                    .filter(x => x && !x.startsWith('CUIT'))
                : [];

            return {
                success: true,
                data: { cuit, razonSocial, detalle }
            };




        } catch (error) {
            console.error('Error:', error.message);
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    async consultarCUIT(params) {
        try {

            if (storage.get(params.cuit))
                return storage.get(params.cuit);

            const jar = new CookieJar();
            const client = wrapper(axios.create({ jar, withCredentials: true }));

            const url = "https://sistemas360.ar/cuitonline";

            // 1) GET primero (genera sesión + CSRF válido)
            const page = await client.get(url);

            const token = page.data.match(/name="_token"\s+value="(.+?)"/)?.[1];

            // 2) POST con MISMA sesión (cookie jar)
            const data = new URLSearchParams({
                _token: token,
                cuit: params.cuit || "30707617078",
            });

            const response = await client.post(url, data, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Origin": "https://sistemas360.ar",
                    "Referer": url,
                },
            });

            return {
                success: true,
                data: this.parseCUIT(response.data),
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error.response?.data,
            };
        }
    }


    parseCUIT(html) {
        const $ = cheerio.load(html);

        const getText = (selector) => $(selector).text().trim() || "";

        const razonSocial = $('.fs-4.fw-bold.text-dark').text().trim();
        const cuit = $('th:contains("CUIT")').next('td').text().trim();
        const tipoPersona = $('th:contains("Tipo de Persona")').next('td').text().trim();
        const estadoClave = $('th:contains("Estado de Clave")').next('td').text().trim();
        const condicionIVA = $('th:contains("Condición IVA")').next('td').find('.badge').text().trim();

        const direccion = $('th:contains("Dirección")').next('td').text().trim();
        const localidad = $('th:contains("Localidad")').next('td').text().trim();
        const provincia = $('th:contains("Provincia")').next('td').text().trim();
        const cp = $('th:contains("Código Postal")').next('td').text().trim();

        const actividad = $('.mb-4 ul li').first().text().trim();

        const impuestos = [];
        $('.mb-4 ul li').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto && !texto.includes('SERVICIOS') && !texto.includes('HOSPEDAJE')) {
                impuestos.push(texto);
            }
        });

        return {
            razonSocial,
            cuit,
            tipoPersona,
            estadoClave,
            condicionIVA,
            domicilio: {
                direccion,
                localidad,
                provincia,
                codigoPostal: cp,
            },
            actividadPrincipal: actividad,
            impuestos,
        };
    }


    async generarQr(params) {
        try {

            const dataURL = await QRCode.toDataURL(params.qrUrl, {
                width: 200,
                margin: 2
            });
            console.log('✅ QR generado como base64');


            return {
                success: true,
                data: dataURL,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error.response?.data,
            };
        }
    }


}

module.exports = AfipServices;