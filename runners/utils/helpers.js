/**
 * Contiene funciones de ayuda reutilizables en toda la aplicación.
 */

/**
 * Pausa la ejecución durante un número determinado de milisegundos.
 * @param {number} ms - El número de milisegundos a esperar.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  sleep,
};
