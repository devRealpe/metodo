const USE_LOCAL = {
    auth: false,   // ← Gateway local → auth local
    general: false,
    oracle: false,
    smtp: false,
    generalMongoDB: false,
    ordenesPago: false,   // ← Gateway local → ordenes-pago local
};


// Gateway remoto (otros servicios)
const SERVER = 'http://10.10.10.187:5530';
const COMMON = { secure: false, changeOrigin: true, logLevel: 'debug' };

// Gateway local — mismo formato de rutas, sin pathRewrite.
// El Gateway local recibe /api/auth/**, /api/hojas-de-vida/**, etc.
// y él mismo se encarga de rutear al microservicio correspondiente.
const LOCAL_GATEWAY = 'http://localhost:5530';
const LOCAL_CFG = {
    auth: { target: LOCAL_GATEWAY, ...COMMON },
    general: { target: LOCAL_GATEWAY, ...COMMON },
    ordenesPago: { target: LOCAL_GATEWAY, ...COMMON },
    oracle: { target: LOCAL_GATEWAY, ...COMMON },
    smtp: { target: LOCAL_GATEWAY, ...COMMON },
    generalMongoDB: { target: LOCAL_GATEWAY, ...COMMON },
    sse: { target: LOCAL_GATEWAY, ...COMMON },
};

const srv = { target: SERVER, ...COMMON };
const sel = (key) => USE_LOCAL[key] ? LOCAL_CFG[key] : srv;

/**
 * IMPORTANTE: Las rutas más específicas deben ir primero para que el proxy
 * no interprete /api/general-mongodb como /api/general, etc.
 */
module.exports = {
    '/api/general-mongodb': sel('generalMongoDB'),
    '/api/oracle': sel('oracle'),
    '/api/smtp': sel('smtp'),
    '/api/auth': sel('auth'),
    '/api/general': sel('general'),
    '/api/sse': USE_LOCAL.generalMongoDB ? LOCAL_CFG.sse : srv,
    '/api': srv, // catch-all → siempre al servidor (Gateway)
};
