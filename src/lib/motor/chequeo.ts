// Chequeo semanal de esfuerzo: la pregunta sale en la primera sesion de
// la semana calendario, en la ultima serie de cada ejercicio. Una lectura
// por ejercicio por semana alcanza para los algoritmos de progresion
// (el motor del MVP solo registra el dato).

import type { SesionCompletada } from './schema.js';
import { inicioSemana } from './racha.js';

// Las canceladas por dolor no cuentan: si la de chequeo se corto por
// dolor, la siguiente de la semana vuelve a preguntar.
// Sin sesiones previas no-canceladas, no es chequeo (caso del primer
// arranque post-onboarding): la regla aplica desde la segunda sesion real.
export function esSesionDeChequeo(sesiones: SesionCompletada[], ahora: number): boolean {
	if (!sesiones.some((s) => !s.cancelada_por_dolor)) return false;
	const semana = inicioSemana(ahora);
	return !sesiones.some((s) => !s.cancelada_por_dolor && inicioSemana(s.fecha) === semana);
}
