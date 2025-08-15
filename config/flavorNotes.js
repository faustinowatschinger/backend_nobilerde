// backend/config/flavorNotes.js
// Vocabulario controlado de notas sensoriales para yerba mate

/**
 * Mapeo de códigos de notas sensoriales a sus traducciones legibles
 */
export const NOTE_TRANSLATIONS = {
  // Notas básicas de sabor
  'amargo_suave': 'Amargo Suave',
  'amargo_moderado': 'Amargo Moderado', 
  'amargo_alto': 'Amargo Alto',
  'amargo_intenso': 'Amargo Intenso',
  'dulce_natural': 'Dulce Natural',
  'dulce_residual': 'Dulce Residual',
  
  // Notas herbales
  'herbal_suave': 'Herbal Suave',
  'herbal_intenso': 'Herbal Intenso',
  'herbal_medicinal': 'Herbal Medicinal',
  'herbal_fresco': 'Herbal Fresco',
  
  // Notas terrosas
  'terroso': 'Terroso',
  'terroso_humedo': 'Terroso Húmedo',
  'terroso_seco': 'Terroso Seco',
  'mineral': 'Mineral',
  
  // Notas de madera/humo
  'ahumado': 'Ahumado',
  'ahumado_suave': 'Ahumado Suave',
  'ahumado_intenso': 'Ahumado Intenso',
  'madera': 'Madera',
  'madera_verde': 'Madera Verde',
  'madera_seca': 'Madera Seca',
  
  // Notas vegetales
  'vegetal': 'Vegetal',
  'vegetal_fresco': 'Vegetal Fresco',
  'hierba_cortada': 'Hierba Cortada',
  'heno': 'Heno',
  'pasto': 'Pasto',
  
  // Notas florales
  'floral': 'Floral',
  'floral_suave': 'Floral Suave',
  'miel': 'Miel',
  
  // Notas frutales
  'frutal': 'Frutal',
  'citrico': 'Cítrico',
  'frutal_seco': 'Frutal Seco',
  
  // Notas de intensidad y cuerpo
  'cuerpo_liviano': 'Cuerpo Liviano',
  'cuerpo_medio': 'Cuerpo Medio',
  'cuerpo_pleno': 'Cuerpo Pleno',
  'intenso': 'Intenso',
  'suave': 'Suave',
  
  // Notas de textura
  'astringente': 'Astringente',
  'cremoso': 'Cremoso',
  'sedoso': 'Sedoso',
  
  // Notas aromáticas
  'aroma_intenso': 'Aroma Intenso',
  'aroma_suave': 'Aroma Suave',
  'aroma_fresco': 'Aroma Fresco',
  
  // Notas específicas regionales
  'estilo_argentino': 'Estilo Argentino',
  'estilo_brasileno': 'Estilo Brasileño',
  'estilo_paraguayo': 'Estilo Paraguayo',
  'estilo_uruguayo': 'Estilo Uruguayo',
  
  // Características especiales
  'balanceado': 'Balanceado',
  'complejo': 'Complejo',
  'simple': 'Simple',
  'persistente': 'Persistente',
  'fugaz': 'Fugaz',
  
  // Notas para yerbas compuestas
  'menta': 'Menta',
  'naranja': 'Naranja',
  'limon': 'Limón',
  'hierbas_serranas': 'Hierbas Serranas',
  'peperina': 'Peperina',
  'boldo': 'Boldo',
  'cedron': 'Cedrón',
  'manzanilla': 'Manzanilla',
  'tilo': 'Tilo',
  
  // Notas adicionales
  'polvo': 'Polvo',
  'limpio': 'Limpio',
  'sucio': 'Sucio',
  'equilibrado': 'Equilibrado',
  'rustico': 'Rústico',
  'refinado': 'Refinado',
  'tradicional': 'Tradicional',
  'moderno': 'Moderno'
};

/**
 * Categorías de notas sensoriales organizadas por tipo
 */
export const NOTE_CATEGORIES = {
  sabor: [
    'amargo_suave', 'amargo_moderado', 'amargo_alto', 'amargo_intenso',
    'dulce_natural', 'dulce_residual'
  ],
  herbal: [
    'herbal_suave', 'herbal_intenso', 'herbal_medicinal', 'herbal_fresco'
  ],
  terroso: [
    'terroso', 'terroso_humedo', 'terroso_seco', 'mineral'
  ],
  ahumado: [
    'ahumado', 'ahumado_suave', 'ahumado_intenso', 'madera', 
    'madera_verde', 'madera_seca'
  ],
  vegetal: [
    'vegetal', 'vegetal_fresco', 'hierba_cortada', 'heno', 'pasto'
  ],
  floral: [
    'floral', 'floral_suave', 'miel'
  ],
  frutal: [
    'frutal', 'citrico', 'frutal_seco'
  ],
  cuerpo: [
    'cuerpo_liviano', 'cuerpo_medio', 'cuerpo_pleno', 'intenso', 'suave'
  ],
  textura: [
    'astringente', 'cremoso', 'sedoso'
  ],
  aroma: [
    'aroma_intenso', 'aroma_suave', 'aroma_fresco'
  ],
  regional: [
    'estilo_argentino', 'estilo_brasileno', 'estilo_paraguayo', 'estilo_uruguayo'
  ],
  caracteristicas: [
    'balanceado', 'complejo', 'simple', 'persistente', 'fugaz',
    'equilibrado', 'rustico', 'refinado', 'tradicional', 'moderno'
  ],
  compuestas: [
    'menta', 'naranja', 'limon', 'hierbas_serranas', 'peperina',
    'boldo', 'cedron', 'manzanilla', 'tilo'
  ]
};

/**
 * Obtiene todas las notas válidas como array
 * @returns {string[]} Array con todos los códigos de notas válidas
 */
export function getAllValidNotes() {
  return Object.keys(NOTE_TRANSLATIONS);
}

/**
 * Obtiene todas las notas de una categoría específica
 * @param {string} category - Nombre de la categoría
 * @returns {string[]} Array con las notas de la categoría
 */
export function getNotesByCategory(category) {
  return NOTE_CATEGORIES[category] || [];
}

/**
 * Traduce un array de códigos de notas a sus nombres legibles
 * @param {string[]} noteCodes - Array de códigos de notas
 * @returns {string[]} Array de nombres traducidos
 */
export function translateNotes(noteCodes) {
  if (!Array.isArray(noteCodes)) return [];
  return noteCodes.map(code => NOTE_TRANSLATIONS[code] || code);
}

/**
 * Valida si una nota es válida
 * @param {string} noteCode - Código de la nota a validar
 * @returns {boolean} True si la nota es válida
 */
export function isValidNote(noteCode) {
  return NOTE_TRANSLATIONS.hasOwnProperty(noteCode);
}

/**
 * Obtiene notas recomendadas basadas en el tipo de yerba
 * @param {string} tipoYerba - Tipo de yerba
 * @returns {string[]} Array de notas recomendadas para ese tipo
 */
export function getRecommendedNotesForType(tipoYerba) {
  const recommendations = {
    'Tradicional': ['amargo_moderado', 'herbal_intenso', 'terroso', 'cuerpo_pleno'],
    'Suave': ['amargo_suave', 'herbal_suave', 'dulce_natural', 'cuerpo_liviano'],
    'Despalada': ['amargo_alto', 'herbal_intenso', 'astringente', 'cuerpo_pleno'],
    'Barbacuá': ['ahumado_intenso', 'madera_seca', 'terroso', 'cuerpo_pleno'],
    'Compuesta': ['herbal_medicinal', 'floral', 'balanceado', 'complejo'],
    'Orgánica': ['vegetal_fresco', 'limpio', 'natural', 'equilibrado']
  };
  
  return recommendations[tipoYerba] || [];
}

export default {
  NOTE_TRANSLATIONS,
  NOTE_CATEGORIES,
  getAllValidNotes,
  getNotesByCategory,
  translateNotes,
  isValidNote,
  getRecommendedNotesForType
};
