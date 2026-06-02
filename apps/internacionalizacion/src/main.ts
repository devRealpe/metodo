// Override console methods to suppress unwanted messages
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('Angular is running in development mode') ||
    message.includes('Server started') ||
    message.includes('Hot Module Replacement') ||
    message.includes('Live Reloading') ||
    message.includes('Progress disabled') ||
    message.includes('Overlay enabled') ||
    message.includes('[webpack-dev-server]') ||
    message.includes('Movilidades cargadas del backend') ||
    message.includes('Movilidades después del map') ||
    message.includes('Movilidades filtradas inicialmente') ||
    message.includes('ValueChanges triggered') ||
    message.includes('navigateToSection called') ||
    message.includes('navigating to') ||
    message.includes('Debug Date objects') ||
    message.includes('Debug cálculo') ||
    message.includes('Payload limpio para el backend') ||
    message.includes('Payload enviado al backend') ||
    message.includes('Creando nueva movilidad') ||
    message.includes('Actualizando movilidad ID')
  ) {
    return; // Suppress these messages
  }
  originalLog(...args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('Autofocus processing was blocked because a document already has a focused element') ||
    message.includes('Cannot use \'import.meta\' outside a module')
  ) {
    return; // Suppress these warnings
  }
  originalWarn(...args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('Cannot use \'import.meta\' outside a module') ||
    message.includes('Cannot read properties of null (reading \'addEventListener\')')
  ) {
    return; // Suppress these non-critical errors
  }
  originalError(...args);
};

import('./bootstrap').catch((err) => console.error(err));
