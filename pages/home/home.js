// home.js - Lógica del cliente
class HomeController {
    homeView = {};

    constructor() {
        this.inicializar();
    }

    async inicializar() {
        try {
   
            var envApi = await this.getEnvironment()
            this.homeView.env = envApi.env;
            $('#env').html(`[${envApi.env.toLocaleUpperCase()}]`);

            var afiptoken = await this.cargarAfipToken();           
           
            if (afiptoken.success == false) {
               
                await Swal.fire({
                    icon: 'error',
                    title: 'Afip Token',
                    html: `${afiptoken.message}<br>${afiptoken.details}<br>${afiptoken?.cmsGenerado?.tra}`,
                    confirmButtonText: 'OK',

                });
                 return;
            }



            // Cargar datos del servidor
            const [condicionIvaReceptor, utimoComprobanteAutorizado] = await Promise.all([
                this.condicionIvaReceptor(),
                this.cargarUltimoComprobanteAutorizado(),

            ]);

            this.mostrarSesion(afiptoken);
            this.mostrarUltimoComprobanteAutorizado(utimoComprobanteAutorizado);
            this.mostrarCondicionIvaReceptor(condicionIvaReceptor);


            $('#cbteFch').val(new Date().toISOString().slice(0, 10));




            const ultimoDia = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            $('#fchVtoPago').val(ultimoDia.toISOString().slice(0, 10));

            

        } catch (error) {
            console.error('Error al cargar datos:', error);
        }

        await new Promise(r => setTimeout(r, 1000)); 

        $("#spLoad").hide();
    }

    async getEnvironment() {
        const response = await fetch('/api/env');
        return response.json();
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
        if (data.error) {
            this.mostrarAlert(`Ultimo Comprobante Autorizado ${data.error}`, true);
            return;
        }

        this.homeView.cbteNro = data.data.cbteNro;

        $('#comprobante-info').html(`
            <span>Info: ${data.message}</span>
            <span>Comprobante Nro: ${data.data.cbteNro}</span>
        `);

        $('#cbteDesde').val(data.data.cbteNro + 1);

    }

    mostrarCondicionIvaReceptor(data) {

        let condiciones = data.data.condiciones.filter(c => c.descripcion == 'IVA Responsable Inscripto' ||
            c.descripcion == 'IVA Sujeto Exento')



        const select = $('#condicionIVAReceptorId');
        select.empty();
        condiciones.forEach(cond => {
            select.append(`<option value="${cond.id}">${cond.descripcion}</option>`);
        });
        select.val('4');

    }

    verFactura() {

        let tag = $('#txtFacturaArchivo').val();
        const url = `/factura?tag=${encodeURIComponent(tag)}&env=${this.homeView.env}`;
        window.open(url, '_blank');




    }

    async generarFactura() {
        // Validar formato yyyy-mm-dd
        if (!moment($('#fchServDesde').val(), 'YYYY-MM-DD', true).isValid())
            return this.mostrarAlert(`Servicio Desde no valida: ${$('#fchServDesde').val()}`, true);

        if (!moment($('#fchServHasta').val(), 'YYYY-MM-DD', true).isValid())
            return this.mostrarAlert(`Servicio hasta no valida: ${$('#fchServHasta').val()}`, true);

        if (moment($('#fchServDesde').val(), 'YYYY-MM-DD').isAfter(moment($('#fchServHasta').val(), 'YYYY-MM-DD')))
            return this.mostrarAlert('La fecha Desde no puede ser mayor que la fecha Hasta', true);

        if (moment($('#cbteFch').val(), 'YYYY-MM-DD').isAfter(moment()))
            return this.mostrarAlert('La fecha del comprobante no puede ser futura', true);

        const fechaCbte = moment($('#cbteFch').val(), 'YYYY-MM-DD');
        const fechaVto = moment($('#fchVtoPago').val(), 'YYYY-MM-DD');
        const fchServHasta = moment($('#fchServHasta').val(), 'YYYY-MM-DD');

        if (!fechaVto.isAfter(fechaCbte))
            return this.mostrarAlert('La fecha de vencimiento debe ser mayor a la fecha de comprobante', true);

        if (fechaVto.diff(fchServHasta, 'days') > 25)
            return this.mostrarAlert('La fecha de vencimiento no puede superar los 20 días desde la fecha servicio hasta', true);

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
            body: JSON.stringify({ cuit: $('#docNro').val() })
        });

        const data = await response.json();
        this.homeView.consultarcuit = data.data;

        Swal.close();

        const domicilioCompleto = [
            data.data.domicilio?.direccion,
            data.data.domicilio?.localidad,
            data.data.domicilio?.provincia
        ].filter(Boolean).join(" ");

        this.homeView.consultarcuit.domicilioCompleto = domicilioCompleto;

        const result = await Swal.fire({
            icon: 'success',
            title: `${data.data.razonSocial}`,
            html: `
                    <div style="text-align: left">
                        <p>Razón Social: <strong>${data.data.razonSocial}</strong> </p>
                        <p>CUIT:<strong>${data.data.cuit}</strong></p>
                        <p>Actividad Principal: ${data.data.actividadPrincipal}</p>
                        <p>Domicilio:${domicilioCompleto}</p>
                    </div>
                `,
            showCancelButton: true,
            confirmButtonText: '✅ Aceptar',
            cancelButtonText: '❌ Cancelar'
        });

        if (this.homeView?.env?.toLowerCase() == 'prod') {
            const msgEnv = await Swal.fire({
                icon: 'warning',
                title: 'PRODUCCIÓN',
                html: `Estamos en el ambiente de PROD
                `,
                showCancelButton: true,
                confirmButtonText: '✅ Continuar',
                cancelButtonText: '❌ Cancelar'
            });

            if (!msgEnv.isConfirmed) {
                return;
            }
        }

        if (data.data.condicionIVA.toLowerCase().includes('exento') == true && !$('#condicionIVAReceptorId option:selected').text().includes('Exento'))
            return this.mostrarAlert(`Condicion IVA Receptor no coincide `, true);

        if (data.data.condicionIVA.toLowerCase().includes('inscripto') == true && !$('#condicionIVAReceptorId option:selected').text().includes('Inscripto'))
            return this.mostrarAlert(`Condicion IVA Receptor no coincide`, true);



        if (result.isConfirmed) {
            this.generarFacturaSend();
        }
    }

    async generarFacturaSend() {

        Swal.fire({
            title: 'Generando Factura',
            //text: 'Buscando información en AFIP...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {

            //dateStr.replace(/-/g, '');

            const params = {

                metadata: {
                    consultarcuit: this.homeView.consultarcuit,
                    condicionIVAReceptor: $('#condicionIVAReceptorId option:selected').text()
                },
                cuit: "20312354846",
                ptoVta: this.homeView.ptoVta,
                cbteTipo: this.homeView.cbteTipo,
                concepto: $('#concepto').val(),
                docTipo: $('#docTipo').val(),
                docNro: $('#docNro').val(),
                cbteDesde: $('#cbteDesde').val(),
                cbteHasta: $('#cbteDesde').val(),
                cbteFch: $('#cbteFch').val().replace(/-/g, ''),
                fchServDesde: $('#fchServDesde').val().replace(/-/g, ''),
                fchServHasta: $('#fchServHasta').val().replace(/-/g, ''),
                fchVtoPago: $('#fchVtoPago').val().replace(/-/g, ''),
                impTotal: $('#impTotal').val(),
                impNeto: $('#impNeto').val(),
                condicionIVAReceptorId: $('#condicionIVAReceptorId').val(),
                obsMsg: $('#obsMsg').val(),
                obsCode: $('#obsCode').val()

            }

            const response = await fetch('/api/afip/generar-factura', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            })



            const data = await response.json();



            Swal.close();

            if (data.success == true) {
                this.mostrarAlert('Factura Generada!')
                $('#txtFacturaArchivo').val(data.data.filetag);
            }
            else
                this.mostrarAlert(`ERROR ${data.errors?.message}`, true);

        } catch (error) {
            Swal.close();
            this.mostrarAlert(`ERROR ${error?.message}`, true);
        }

    }


    async mostrarAlert(mensaje, error = false) {
        await Swal.fire({
            icon: error ? 'error' : 'success',  // 'success', 'error', 'warning', 'info'
            title: error ? 'Error' : 'Éxito',
            text: mensaje,
            confirmButtonColor: error ? '#dc3545' : '#28a745'
        });
    }


    async consultarCuit() {
        this.activarSpinBtn("btnCuit")
        const response = await fetch('/api/afip/consultar-cuit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cuit: $('#docNro').val() })
        });

        const data = await response.json();
        this.homeView.consultarcuit = data.data;
        //alert(data.data)
        await new Promise(resolve => setTimeout(resolve, 500));
        this.setCondicionIVASelect(data.data.condicionIVA);

        $("#lblCuitInfo").html(`Razon Social: ${data.data.razonSocial} | ${moment().format('YYYY-MM-DD HH:mm:ss')}`)

        this.desactivarSpinBtn("btnCuit")

    }

    setCondicionIVASelect(condicionIVA) {
        const select = $('#condicionIVAReceptorId');
        const valor = condicionIVA.toLowerCase();

        let optionToSelect = null;

        if (valor.includes('exento')) {
            optionToSelect = select.find('option').filter(function () {
                return $(this).text().toLowerCase().includes('exento');
            });
        }
        else if (valor.includes('inscripto')) {
            optionToSelect = select.find('option').filter(function () {
                return $(this).text().toLowerCase().includes('inscripto');
            });
        }

        if (optionToSelect && optionToSelect.length > 0) {
            select.val(optionToSelect.val());
        }
    }

    activarSpinBtn(btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        const icon = btn.querySelector('i');
        if (!icon) return;

        icon.classList.add('spin');
    }

    desactivarSpinBtn(btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        const icon = btn.querySelector('i');
        if (!icon) return;

        icon.classList.remove('spin');
    }

    limpiarCampos() { alert(0) }
}

// Iniciar la aplicación
const app = new HomeController();