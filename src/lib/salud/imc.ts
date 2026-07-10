// IMC: razon entre peso y altura al cuadrado. Modulo de presentacion,
// no parte del motor: no toma decisiones, no persiste, no consulta Dexie.
// No se estiman grasa ni masa muscular con solo peso/altura.

export type CategoriaImc = 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad';

export interface ResultadoImc {
	valor: number;
	categoria: CategoriaImc;
}

// Limites OMS. La categoria se decide sobre el valor SIN redondear para
// evitar saltos en los limites.
const LIMITE_BAJO_PESO = 18.5;
const LIMITE_NORMAL_SUPERIOR = 25;
const LIMITE_SOBREPESO_SUPERIOR = 30;

export function calcularImc(pesoKg: number, alturaCm?: number): ResultadoImc | null {
	if (alturaCm === undefined || alturaCm === null || alturaCm <= 0) return null;
	const alturaM = alturaCm / 100;
	const valorExacto = pesoKg / (alturaM * alturaM);
	const categoria: CategoriaImc =
		valorExacto < LIMITE_BAJO_PESO
			? 'bajo_peso'
			: valorExacto < LIMITE_NORMAL_SUPERIOR
				? 'normal'
				: valorExacto < LIMITE_SOBREPESO_SUPERIOR
					? 'sobrepeso'
					: 'obesidad';
	return { valor: Math.round(valorExacto * 10) / 10, categoria };
}
