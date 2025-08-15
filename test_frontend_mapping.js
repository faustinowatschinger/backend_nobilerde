// Script para verificar el mapeo exacto de campos
console.log('🔍 Verificando mapeo de campos...');

// Datos que retorna el backend (basado en test anterior)
const backendData = {
  notes: [
    {
      label: "Muy Buena durabilidad para ser argentina, con un sabor unico",
      fullComment: "Muy Buena durabilidad para ser argentina, con un sabor unico",
      author: "Usuario eliminado",
      yerba: "Kalena Tradicional (Kalena)",
      interactionScore: 33,
      normalizedScore: 33,
      likes: 1,
      replies: 10
    },
    {
      label: "Sabor muy Rico ahumado",
      fullComment: "Sabor muy Rico ahumado",
      author: "Usuario eliminado", 
      yerba: "Kalena Tradicional (Kalena)",
      interactionScore: 15,
      normalizedScore: 15,
      likes: 1,
      replies: 4
    }
  ],
  sample: {
    nEvents: 24,
    nRatings: 24,
    kAnonymityOk: true
  }
};

// Simular lo que hace el frontend
console.log('\n📋 Simulando frontend:');
const notes = backendData?.notes || [];

if (notes.length > 0) {
  const maxScore = Math.max(...notes.map(note => note.normalizedScore || note.interactionScore || 1));
  console.log('Max score calculado:', maxScore);
  
  notes.forEach((note, index) => {
    console.log(`\nNota ${index + 1}:`);
    console.log(`  label: "${note.label}"`);
    console.log(`  author: "${note.author}"`);
    console.log(`  yerba: "${note.yerba}"`);
    
    const interactionScore = note.normalizedScore || note.interactionScore || 0;
    console.log(`  interactionScore: ${interactionScore}`);
    
    const likes = note.likes || 0;
    const replies = note.replies || 0;
    console.log(`  likes: ${likes}`);
    console.log(`  replies: ${replies}`);
    
    const barWidth = maxScore > 0 ? (interactionScore / maxScore) * 100 : 0;
    console.log(`  barWidth: ${barWidth}%`);
  });
} else {
  console.log('❌ No hay notas para mostrar');
}
