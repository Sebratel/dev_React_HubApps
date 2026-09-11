/**
 * sanitize.js — utilitário de sanitização de entrada de texto livre.
 *
 * Defesa-em-profundidade no backend: o React já escapa no frontend,
 * mas sanitizar aqui garante dados limpos no banco independente do cliente.
 * Aplicar em todos os campos de texto livre antes de gravar no banco.
 */

/**
 * Remove tags HTML e padrões de XSS/injeção de uma string.
 *
 * @param {unknown} str  Valor recebido do body (pode não ser string)
 * @param {number}  max  Tamanho máximo após sanitização (trunca se necessário)
 * @returns {string}     Texto limpo, sem HTML, sem event handlers
 */
function stripHtml(str, max = 500) {
  if (typeof str !== 'string') return ''

  return str
    .replace(/<[^>]*>/g, '')               // remove qualquer tag HTML: <script>, <img>, <a>, etc.
    .replace(/javascript\s*:/gi, '')       // remove javascript: URI
    .replace(/vbscript\s*:/gi, '')         // remove vbscript: URI
    .replace(/data\s*:\s*text\/html/gi, '') // remove data:text/html
    .replace(/on\w+\s*=\s*["']?[^"'\s>]*/gi, '') // remove event handlers (onerror=, onload=…)
    .trim()
    .slice(0, max)
}

module.exports = { stripHtml }
