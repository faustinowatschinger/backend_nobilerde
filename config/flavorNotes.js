// backend/config/flavorNotes.js

/**
 * Vocabulario controlado de notas sensoriales para mate
 * Usado para validación y agregación consistente de datos
 */
export const FLAVOR_CATEGORIES = {
  // Amargor - Intensidad del sabor amargo
  AMARGOR: [
    'amargo_muy_bajo',
    'amargo_bajo', 
    'amargo_medio',
    'amargo_alto',
    'amargo_muy_alto'
  ],
  
  // Características herbales
  HERBAL: [
    'herbal_fresco',
    'herbal_seco',
    'herbal_complejo',
    'herbal_suave',
    'herbal_intenso'
  ],
  
  // Textura en boca
  TEXTURA: [
    'cremoso',
    'suave',
    'aspero',
    'polvoroso',
    'sedoso',
    'denso'
  ],
  
  // Intensidad aromática
  AROMA: [
    'aroma_intenso',
    'aroma_suave',
    'aroma_fresco',
    'aroma_tostado',
    'aroma_herbal'
  ],
  
  // Cuerpo de la infusión
  CUERPO: [
    'cuerpo_liviano',
    'cuerpo_medio',
    'cuerpo_robusto',
    'cuerpo_intenso',
    'cuerpo_completo'
  ],
  
  // Sabores específicos
  SABORES: [
    'dulce_natural',
    'terroso',
    'citrico',
    'frutal',
    'floral',
    'mineral',
    'ahumado',
    'maderoso'
  ],
  
  // Sensaciones
  SENSACIONES: [
    'equilibrado',
    'astringente',
    'refrescante',
    'energizante',
    'reconfortante',
    'estimulante'
  ],
  
  // Cualidades específicas del mate
  MATE_ESPECIFICO: [
    'con_palo_notable',
    'sin_palo_limpio',
    'barbacua_presente',
    'secado_natural',
    'estacionamiento_largo',
    'molienda_fina',
    'molienda_gruesa'
  ]
};

/**
 * Obtiene todas las notas válidas como array plano
 */
export function getAllValidNotes() {
  return Object.values(FLAVOR_CATEGORIES).flat();
}

/**
 * Valida si una nota es válida
 */
export function isValidNote(note) {
  return getAllValidNotes().includes(note);
}

/**
 * Obtiene la categoría de una nota específica
 */
export function getNoteCategory(note) {
  for (const [category, notes] of Object.entries(FLAVOR_CATEGORIES)) {
    if (notes.includes(note)) {
      return category;
    }
  }
  return null;
}

/**
 * Agrupa notas por categoría
 */
export function groupNotesByCategory(notes) {
  const grouped = {};
  
  for (const note of notes) {
    const category = getNoteCategory(note);
    if (category) {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(note);
    }
  }
  
  return grouped;
}

/**
 * Traducciones de notas para frontend (español)
 */
export const NOTE_TRANSLATIONS = {
  // Amargor
  'amargo_muy_bajo': 'Muy poco amargo',
  'amargo_bajo': 'Poco amargo',
  'amargo_medio': 'Amargo moderado',
  'amargo_alto': 'Muy amargo',
  'amargo_muy_alto': 'Extremadamente amargo',
  
  // Herbal
  'herbal_fresco': 'Herbal fresco',
  'herbal_seco': 'Herbal seco',
  'herbal_complejo': 'Herbal complejo',
  'herbal_suave': 'Herbal suave',
  'herbal_intenso': 'Herbal intenso',
  
  // Textura
  'cremoso': 'Cremoso',
  'suave': 'Suave',
  'aspero': 'Áspero',
  'polvoroso': 'Polvoroso',
  'sedoso': 'Sedoso',
  'denso': 'Denso',
  
  // Aroma
  'aroma_intenso': 'Aroma intenso',
  'aroma_suave': 'Aroma suave',
  'aroma_fresco': 'Aroma fresco',
  'aroma_tostado': 'Aroma tostado',
  'aroma_herbal': 'Aroma herbal',
  
  // Cuerpo
  'cuerpo_liviano': 'Cuerpo liviano',
  'cuerpo_medio': 'Cuerpo medio',
  'cuerpo_robusto': 'Cuerpo robusto',
  'cuerpo_intenso': 'Cuerpo intenso',
  'cuerpo_completo': 'Cuerpo completo',
  
  // Sabores
  'dulce_natural': 'Dulce natural',
  'terroso': 'Terroso',
  'citrico': 'Cítrico',
  'frutal': 'Frutal',
  'floral': 'Floral',
  'mineral': 'Mineral',
  'ahumado': 'Ahumado',
  'maderoso': 'Maderoso',
  
  // Sensaciones
  'equilibrado': 'Equilibrado',
  'astringente': 'Astringente',
  'refrescante': 'Refrescante',
  'energizante': 'Energizante',
  'reconfortante': 'Reconfortante',
  'estimulante': 'Estimulante',
  
  // Mate específico
  'con_palo_notable': 'Con palo notable',
  'sin_palo_limpio': 'Sin palo, limpio',
  'barbacua_presente': 'Barbacuá presente',
  'secado_natural': 'Secado natural',
  'estacionamiento_largo': 'Estacionamiento largo',
  'molienda_fina': 'Molienda fina',
  'molienda_gruesa': 'Molienda gruesa'
};

export default {
  FLAVOR_CATEGORIES,
  getAllValidNotes,
  isValidNote,
  getNoteCategory,
  groupNotesByCategory,
  NOTE_TRANSLATIONS
};
