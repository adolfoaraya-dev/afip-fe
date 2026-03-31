const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const AfipEngineApi = require('./api/afip-api');

// Servir archivos estáticos para Pages
app.use(express.static(path.join(__dirname)));
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

app.use('/bootstrap/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/bootstrap/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/sweetalert2', express.static(path.join(__dirname, 'node_modules/sweetalert2/dist')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/moment/min')));


// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get('/api/afip/login-completo', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.login();

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})

app.post('/api/afip/ultimo-comprobante-autorizado', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.ultimoComprobanteAutorizado(req);

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})

app.post('/api/afip/condicion-iva-receptor', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.condicionIvaReceptor(req);

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})

app.post('/api/afip/consultar-cuit', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.consultarCUIT(req);

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})

app.post('/api/afip/generar-qr', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.generarQr(req);

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})



app.post('/api/afip/generar-factura', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.generarFactura(req);

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})

app.post('/api/afip/obtener-factura', async (req, res) => {
    const afipEngineApi = new AfipEngineApi();

    let result =  await afipEngineApi.obtenerFactura(req);

    if(result.success === true){
        res.json(result);
    }else{
         res.status(500).json(result);
    }

})


// Ruta principal - sirve home.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'home', 'home.html'));
});

app.get('/factura', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'factura', 'factura.html'));
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en:`);
    console.log(`👉 http://localhost:${port} (home.html)`);
});