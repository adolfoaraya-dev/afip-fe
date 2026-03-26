// home.js - Lógica del cliente
class HomeController {
    homeView = {};

    constructor() {
        this.inicializar();
    }

    async inicializar() {
        try {

            this.configurarEventos();

            var afiptoken = await  this.cargarAfipToken();

            // Cargar datos del servidor
            const [condicionIvaReceptor, utimoComprobanteAutorizado] = await Promise.all([
                this.condicionIvaReceptor(),
                this.cargarUltimoComprobanteAutorizado(),
                
            ]);

            this.mostrarSesion(afiptoken);
            this.mostrarUltimoComprobanteAutorizado(utimoComprobanteAutorizado);
            this.mostrarCondicionIvaReceptor(condicionIvaReceptor);
            

           

        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    }

    async cargarAfipToken() {
        const response = await fetch('/api/afip/login-completo');
        return response.json();
    }

    async cargarUltimoComprobanteAutorizado() {
        const response = await fetch('/api/afip/ultimo-comprobante-autorizado', {
            method: 'POST',  
            headers: {
                'Content-Type': 'application/json',  // ← Indicar que envías JSON
            },
            body: JSON.stringify({  // ← Convertir objeto a JSON
                ptoVta: 1002,                                // Punto de venta
                cbteTipo: 11                                  // Tipo comprobante
            })
        });        

        this.homeView.ptoVta = 1002;
        this.homeView.cbteTipo = 11;

        return response.json();
    }

    async condicionIvaReceptor() {
        const response = await fetch('/api/afip/condicion-iva-receptor', {
            method: 'POST',  //
            headers: {
                'Content-Type': 'application/json',  // ← Indicar que envías JSON
            },
            body: JSON.stringify({})
        });  

        return response.json();
    }
    


    mostrarSesion(data) {

        const expiracion = new Date(data.data.ticket.expirationTime);
        $('#session-info').html(`
            <p>Info: ${data.message}</p>
            <p>From Cache: ${data.fromCache}</p>
            <p>Expiración: ${expiracion.toLocaleString()}</p>
        `);
    }

    mostrarUltimoComprobanteAutorizado(data) {

        this.homeView.cbteNro = data.data.cbteNro;

        $('#comprobante-info').html(`
            <p>Info: ${data.message}</p>
            <p>Comprobante Nro: ${data.data.cbteNro}</p>
        `);

        $('#cbteDesde').val(data.data.cbteNro+1);
        $('#cbteHasta').val(data.data.cbteNro+1);
    }

    mostrarCondicionIvaReceptor(data) {

        let condiciones = data.data.condiciones.filter(c=> c.descripcion == 'IVA Responsable Inscripto' || 
            c.descripcion == 'IVA Sujeto Exento' )



        const select = $('#condicionIVAReceptorId');
        select.empty();
        condiciones.forEach(cond => {
            select.append(`<option value="${cond.id}">${cond.descripcion}</option>`);
        });
        select.val('4');

    }

    configurarEventos() {
        document.getElementById('btGenerarFactura').addEventListener('click', () => {
            this.generarFactura();
        });
    }

    async generarFactura(){
            Swal.fire({
                title: 'Consultando CUIT',
                text: 'Buscando información en AFIP...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch('/api/afip/consultar-cuit', {
                                    method: 'POST', 
                                    headers: {
                                        'Content-Type': 'application/json',  
                                    },
                                    body: JSON.stringify({cuit: $('#docNro').val()})
                                });

            const data = await response.json();

            Swal.close();           

            const result = await Swal.fire({
                icon: 'success',
                title: 'Datos encontrados',
                html: `
                    <div style="text-align: left">
                        <p><strong>Razón Social:</strong> ${data.data.razonSocial}</p>
                        <p><strong>CUIT:</strong> ${data.data.cuit}</p>
                        <p><strong>Detalle:</strong> ${data.data.detalle}</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '✅ Usar estos datos',
                cancelButtonText: '❌ Cancelar'
            });
            

            if(data.data.detalle.find(d=> d.includes('Exento') == true) != null &&  !$('#condicionIVAReceptorId option:selected').text().includes('Exento') )
                return this.mostrarAlert( `Condicion IVA Receptor no coincide `,true);

            if(data.data.detalle.find(d=> d.includes('Inscripto') == true) != null &&  !$('#condicionIVAReceptorId option:selected').text().includes('Inscripto') )
                return this.mostrarAlert( `Condicion IVA Receptor no coincide`,true);


           if(result.isConfirmed){
             this.generarFacturaSend();
           }
    }

    async generarFacturaSend(){

        Swal.fire({
            title: 'Consultando CUIT',
            text: 'Buscando información en AFIP...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            

            const params = {
                cuit: "20312354846",
                ptoVta: this.homeView.ptoVta,        
                cbteTipo: this.homeView.cbteTipo,    
                concepto:$('#concepto').val(),
                docTipo: $('#docTipo').val(),
                docNro: $('#docNro').val(),
                cbteDesde: $('#cbteDesde').val(),
                cbteHasta: $('#cbteHasta').val(),
                cbteFch: $('#cbteFch').val(),
                fchServDesde: $('#fchServDesde').val(),
                fchServHasta: $('#fchServHasta').val(),
                fchVtoPago: $('#fchVtoPago').val(),
                impTotal: $('#impTotal').val(),
                impNeto: $('#impNeto').val(),
                condicionIVAReceptorId: $('#condicionIVAReceptorId').val(),
                obsMsg: "Honorarios correspondientes al mes de marzo"
            }

            const response =  await fetch('/api/afip/generar-factura', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',  
                },
                body: JSON.stringify(params)
            })    
            

            
            const data = await response.json();

            Swal.close();        

            if(data.success == true)
                this.mostrarAlert('Factura Generada!')
            else
                this.mostrarAlert( `ERROR ${data.errors[0].message}`,true);
        
        } catch (error) {
             Swal.close();        
            this.mostrarAlert( `ERROR ${error.errors[0].message}`,true);
        }
       
    }


    async mostrarAlert(mensaje, error = false) {
        await Swal.fire({
            icon: error ? 'error' : 'success'  ,  // 'success', 'error', 'warning', 'info'
            title: error ? 'Error' : 'Éxito' ,
            text: mensaje,
            confirmButtonColor: error ? '#dc3545':'#28a745' 
        });
    }

}

// Iniciar la aplicación
const app = new HomeController();