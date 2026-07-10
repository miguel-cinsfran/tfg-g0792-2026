// Timestamps con nombre para tests (ADR-0012 regla 3).
// NUNCA Date.now() en tests (ADR-0001): siempre estas constantes.
//
// AHORA se construye con el constructor local de Date (no con un literal
// en ms) a proposito: el motor define la semana calendario en hora LOCAL
// (ALG-11), asi que los tests deben generar sus fechas con el mismo
// calendario local para ser reproducibles en cualquier zona horaria.

// Miercoles 10 de junio de 2026, 12:00 hora local.
export const AHORA = new Date(2026, 5, 10, 12, 0, 0).getTime();

export const DIA_MS = 86_400_000;

// Dias hacia atras desde AHORA respetando el calendario local.
export function diasAntes(dias: number): number {
	return new Date(2026, 5, 10 - dias, 12, 0, 0).getTime();
}
