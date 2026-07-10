// Utilidades minimas de texto para la UI.

// Para etiquetas del catalogo (patrones, niveles) que estan en
// minuscula porque suelen ir en medio de una frase: cuando abren una
// linea o un titulo, se capitaliza la primera letra.
export function capitalizar(texto: string): string {
	return texto.charAt(0).toUpperCase() + texto.slice(1);
}
