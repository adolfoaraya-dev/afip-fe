
class FacturaController {
    facturaView = {};

    constructor() {
        this.inicializar();
    }

    async inicializar() {
        try {



            const urlParams = new URLSearchParams(window.location.search);
            const tag = urlParams.get('tag');
            const env = urlParams.get('env');

            var result = await this.obtenerFactura(tag,env);

            document.getElementById('PtoVta').innerText = String(result.data.request.ptoVta).padStart(5, '0');
            document.getElementById('CbteDesde').innerText = String(result.data.request.cbteDesde).padStart(8, '0');


            const cbteFch = result.data.request.cbteFch;
            document.getElementById('CbteFch').innerText = cbteFch.slice(6, 8) + '/' + cbteFch.slice(4, 6) + '/' + cbteFch.slice(0, 4);

            const fchServDesde = result.data.request.fchServDesde;
            document.getElementById('FchServDesde').innerText = fchServDesde.slice(6, 8) + '/' + fchServDesde.slice(4, 6) + '/' + fchServDesde.slice(0, 4);


            const fchServHasta = result.data.request.fchServHasta;
            document.getElementById('FchServHasta').innerText = fchServHasta.slice(6, 8) + '/' + fchServHasta.slice(4, 6) + '/' + fchServHasta.slice(0, 4);

            const fchVtoPago = result.data.request.fchVtoPago;
            document.getElementById('FchVtoPago').innerText = fchVtoPago.slice(6, 8) + '/' + fchVtoPago.slice(4, 6) + '/' + fchVtoPago.slice(0, 4);

            document.getElementById('DocNro').innerText = result.data.request.docNro;
            document.getElementById('razonSocial').innerText = result.data.request.metadata.consultarcuit.razonSocial.replace('&amp;', '&');

            const domicilioCompleto = [
                result.data.request.metadata.consultarcuit.domicilio?.direccion,
                result.data.request.metadata.consultarcuit.domicilio?.localidad,
                result.data.request.metadata.consultarcuit.domicilio?.provincia
            ].filter(Boolean).join(" ");

            document.getElementById('CondicionIVAReceptorId').innerText = result.data.request.metadata.condicionIVAReceptor;
            document.getElementById('Domicilio').innerText = domicilioCompleto;
            document.getElementById('Observaciones').innerText = result.data.request.obsMsg;
            document.getElementById('Codigo').innerText = result.data.request.obsCode;

            document.getElementById('PrecioUnit').innerText = result.data.request.impNeto + ',00';
            document.getElementById('SubtotalUnit').innerText = result.data.request.impNeto + ',00';

            document.getElementById('ImpNeto').innerText = result.data.request.impNeto + ',00';
            document.getElementById('ImpTotal').innerText = result.data.request.impTotal + ',00';

            const cae = result.data?.response?.['soap:Envelope']?.['soap:Body']?.['FECAESolicitarResponse']?.['FECAESolicitarResult']?.['FeDetResp']?.['FECAEDetResponse']?.['CAE'];
            document.getElementById('CAE').innerText = cae;

            const caeFchVto = result.data.response['soap:Envelope']['soap:Body']['FECAESolicitarResponse']['FECAESolicitarResult']['FeDetResp']['FECAEDetResponse']['CAEFchVto'];

            console.log(caeFchVto); // "20260326"

            document.getElementById('CAEFchVto').innerText = caeFchVto.slice(6, 8) + '/' + caeFchVto.slice(4, 6) + '/' + caeFchVto.slice(0, 4);

         //fac.20312354846_011_01002_00000003
       document.title = 
    `fac.${result.data.request.cuit}_${String(result.data.request.cbteTipo).padStart(3, '0')}_${String(result.data.request.ptoVta).padStart(5, '0')}_${String(result.data.request.cbteDesde).padStart(8, '0')}`;



            var qr = {
                "ver": 1,
                "fecha": cbteFch.slice(0, 4) + '-' + cbteFch.slice(4, 6) + '-' + cbteFch.slice(6, 8),
                "cuit": parseInt(result.data.request.cuit),
                "ptoVta": parseInt(result.data.request.ptoVta),
                "tipoCmp": parseInt(result.data.request.cbteTipo),
                "nroCmp": parseInt(result.data.request.cbteDesde),
                "importe": parseInt(result.data.request.impTotal),
                "moneda": "PES",   // Moneda local (Pesos Argentinos)
                "ctz": 1,           // Cotización 1 (porque es moneda local)
                "tipoDocRec": parseInt(result.data.request.docTipo),
                "nroDocRec": parseInt(result.data.request.docNro),
                "tipoCodAut": "E", // Si llamaste a FECAESolicitar
                "codAut": parseInt(cae)
            }

            const qrString = JSON.stringify(qr);
            const qrBase64 = btoa(qrString);

            var qrUrl = `https://www.arca.gob.ar/fe/qr/?p=${qrBase64}`



            var result = await this.generarQr(qrUrl);

            // alert(result.data)

            document.getElementById('qrUrl').src = result.data

   console.log("TITLE SET:", document.title);
     
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    }


    async obtenerFactura(tag,env) {

        const response = await fetch('/api/afip/obtener-factura', {
            method: 'POST',  //
            headers: {
                'Content-Type': 'application/json',  // ← Indicar que envías JSON
            },
            body: JSON.stringify({ tag: tag,env:env })
        });

        return response.json();
    }

    async generarQr(data) {
        const response = await fetch('/api/afip/generar-qr', {
            method: 'POST',  //
            headers: {
                'Content-Type': 'application/json',  // ← Indicar que envías JSON
            },
            body: JSON.stringify({ qrUrl: data })
        });

        return response.json();
    }

}

// Iniciar la aplicación
const app = new FacturaController();