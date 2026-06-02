const USE_LOCAL = {
    auth: true,
    general: false,
    oracle: false,
    smtp: false,
    generalMongoDB: false,
    ordenesPago: false,
    pazYSalvo: true,
};


// Gateway remoto (otros servicios)
const SERVER = 'http://192.168.5.16:5530';
const COMMON = { secure: false, changeOrigin: true, logLevel: 'debug' };

// Gateway local — mismo formato de rutas, sin pathRewrite.
const LOCAL_GATEWAY = 'http://localhost:5530';
const LOCAL_PAZ_SALVO = 'http://localhost:8089';
const LOCAL_CFG = {
    auth: { target: LOCAL_GATEWAY, ...COMMON },
    general: { target: LOCAL_GATEWAY, ...COMMON },
    ordenesPago: { target: LOCAL_GATEWAY, ...COMMON },
    oracle: { target: LOCAL_GATEWAY, ...COMMON },
    smtp: { target: LOCAL_GATEWAY, ...COMMON },
    generalMongoDB: { target: LOCAL_GATEWAY, ...COMMON },
    sse: { target: LOCAL_GATEWAY, ...COMMON },
    // En local el servicio expone /api/**, por eso se conserva ese prefijo.
    pazYSalvo: { target: LOCAL_PAZ_SALVO, pathRewrite: { '^/api/paz-y-salvo': '/api' }, ...COMMON },
};

const srv = { target: SERVER, ...COMMON };
const sel = (key) => USE_LOCAL[key] ? LOCAL_CFG[key] : srv;

module.exports = {
    '/api/paz-y-salvo': sel('pazYSalvo'),
    '/api/general-mongodb': sel('generalMongoDB'),
    '/api/oracle': sel('oracle'),
    '/api/smtp': sel('smtp'),
    '/api/auth': sel('auth'),
    '/api/general': sel('general'),
    '/api/sse': USE_LOCAL.generalMongoDB ? LOCAL_CFG.sse : srv,
    '/api': srv,
};
