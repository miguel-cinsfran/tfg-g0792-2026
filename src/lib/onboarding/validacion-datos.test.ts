import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '$lib/db/db';
import { guardarPerfil, actualizarPerfil, obtenerPerfil } from '$lib/db/perfil';
import { calcularImc } from '$lib/salud/imc';
import { perfilBase } from '../../../tests/fixtures/perfil-base';
import {
	armarParcheDatos,
	anioDesdeEdad,
	decimalUnaCifra,
	edadDesdeAnio,
	entero,
	inputsDesdePerfil,
	normalizarNombre,
	validarAltura,
	alturaACm,
	metrosDesdeCm,
	validarConteo,
	validarDatosEditados,
	validarEdad,
	validarNombre,
	validarPeso
} from './validacion-datos';

beforeEach(async () => {
	if (!db.isOpen()) await db.open();
});

afterEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
});

describe('entero', () => {
	it('devuelve numero para texto de digitos', () => {
		expect(entero('42')).toBe(42);
	});

	it('devuelve null para texto no numerico', () => {
		expect(entero('abc')).toBeNull();
		expect(entero('12.5')).toBeNull();
	});

	it('devuelve null para string vacio', () => {
		expect(entero('')).toBeNull();
	});
});

describe('decimalUnaCifra (peso con un decimal opcional)', () => {
	it('"66" devuelve 66 (entero sin separador)', () => {
		expect(decimalUnaCifra('66')).toBe(66);
	});

	it('"66.8" devuelve 66.8 (punto decimal)', () => {
		expect(decimalUnaCifra('66.8')).toBe(66.8);
	});

	it('"66,8" devuelve 66.8 (coma decimal, normalizada a punto)', () => {
		expect(decimalUnaCifra('66,8')).toBe(66.8);
	});

	it('"  66.8  " devuelve 66.8 (trim)', () => {
		expect(decimalUnaCifra('  66.8  ')).toBe(66.8);
	});

	it('"" devuelve null (vacio)', () => {
		expect(decimalUnaCifra('')).toBeNull();
	});

	it('"   " devuelve null (solo espacios)', () => {
		expect(decimalUnaCifra('   ')).toBeNull();
	});

	it('"66.85" devuelve null (mas de un digito decimal)', () => {
		expect(decimalUnaCifra('66.85')).toBeNull();
	});

	it('"66." devuelve null (separador sin digito decimal)', () => {
		expect(decimalUnaCifra('66.')).toBeNull();
	});

	it('"6.6.6" devuelve null (mas de un separador)', () => {
		expect(decimalUnaCifra('6.6.6')).toBeNull();
	});

	it('"abc" devuelve null (no numerico)', () => {
		expect(decimalUnaCifra('abc')).toBeNull();
	});

	it('"-66" devuelve null (sin signo)', () => {
		expect(decimalUnaCifra('-66')).toBeNull();
	});

	it('".5" devuelve null (sin parte entera)', () => {
		expect(decimalUnaCifra('.5')).toBeNull();
	});
});

describe('validarConteo', () => {
	it('"0" es valido (limite inferior)', () => {
		expect(validarConteo('0')).toBe(true);
	});

	it('"300" es valido (limite superior)', () => {
		expect(validarConteo('300')).toBe(true);
	});

	it('"42" es valido (valor tipico)', () => {
		expect(validarConteo('42')).toBe(true);
	});

	it('"" es invalido (vacio)', () => {
		expect(validarConteo('')).toBe(false);
	});

	it('"   5   " es valido (trim)', () => {
		expect(validarConteo('   5   ')).toBe(true);
	});

	it('"301" es invalido (fuera de rango superior)', () => {
		expect(validarConteo('301')).toBe(false);
	});

	it('"-1" es invalido (negativo)', () => {
		expect(validarConteo('-1')).toBe(false);
	});

	it('"12.5" es invalido (no entero)', () => {
		expect(validarConteo('12.5')).toBe(false);
	});

	it('"abc" es invalido', () => {
		expect(validarConteo('abc')).toBe(false);
	});
});

describe('edadDesdeAnio / anioDesdeEdad', () => {
	it('anioDesdeEdad(30, 2026) === 1996', () => {
		expect(anioDesdeEdad(30, 2026)).toBe(1996);
	});

	it('edadDesdeAnio(1996, 2026) === 30', () => {
		expect(edadDesdeAnio(1996, 2026)).toBe(30);
	});
});

describe('validarNombre', () => {
	it('"Miguel" es valido', () => {
		expect(validarNombre('Miguel')).toBe(true);
	});

	it('"   " es invalido', () => {
		expect(validarNombre('   ')).toBe(false);
	});

	it('string vacio es invalido', () => {
		expect(validarNombre('')).toBe(false);
	});
});

describe('validarEdad', () => {
	it('"30" es valido', () => {
		expect(validarEdad('30')).toBe(true);
	});

	it('"13" es invalido (menor que 14)', () => {
		expect(validarEdad('13')).toBe(false);
	});

	it('"101" es invalido (mayor que 100)', () => {
		expect(validarEdad('101')).toBe(false);
	});

	it('"" es invalido', () => {
		expect(validarEdad('')).toBe(false);
	});

	it('"30.5" es invalido (no entero)', () => {
		expect(validarEdad('30.5')).toBe(false);
	});

	it('"abc" es invalido', () => {
		expect(validarEdad('abc')).toBe(false);
	});
});

describe('validarPeso', () => {
	it('"70" es valido (entero)', () => {
		expect(validarPeso('70')).toBe(true);
	});

	it('"70.8" es valido (decimal con punto)', () => {
		expect(validarPeso('70.8')).toBe(true);
	});

	it('"70,8" es valido (decimal con coma, normalizado)', () => {
		expect(validarPeso('70,8')).toBe(true);
	});

	it('"20" es valido (limite inferior inclusive)', () => {
		expect(validarPeso('20')).toBe(true);
	});

	it('"300" es valido (limite superior inclusive)', () => {
		expect(validarPeso('300')).toBe(true);
	});

	it('"19" es invalido (menor que 20)', () => {
		expect(validarPeso('19')).toBe(false);
	});

	it('"19.9" es invalido (menor que 20 con decimal)', () => {
		expect(validarPeso('19.9')).toBe(false);
	});

	it('"301" es invalido (mayor que 300)', () => {
		expect(validarPeso('301')).toBe(false);
	});

	it('"300.1" es invalido (mayor que 300 con decimal)', () => {
		expect(validarPeso('300.1')).toBe(false);
	});

	it('"70.85" es invalido (mas de un digito decimal)', () => {
		expect(validarPeso('70.85')).toBe(false);
	});

	it('"70." es invalido (separador sin decimal)', () => {
		expect(validarPeso('70.')).toBe(false);
	});

	it('"abc" es invalido (no numerico)', () => {
		expect(validarPeso('abc')).toBe(false);
	});

	it('"" es invalido (vacio)', () => {
		expect(validarPeso('')).toBe(false);
	});
});

describe('validarAltura', () => {
	it('"" (vacio) es valido (opcional)', () => {
		expect(validarAltura('')).toBe(true);
	});

	it('"175" es valido', () => {
		expect(validarAltura('175')).toBe(true);
	});

	it('"99" es invalido (menor que 100)', () => {
		expect(validarAltura('99')).toBe(false);
	});

	it('"231" es invalido (mayor que 230)', () => {
		expect(validarAltura('231')).toBe(false);
	});

	it('"1.75" es valido (metros con punto)', () => {
		expect(validarAltura('1.75')).toBe(true);
	});

	it('"1,60" es valido (metros con coma)', () => {
		expect(validarAltura('1,60')).toBe(true);
	});

	it('"0,9" es invalido (fuera de rango en metros)', () => {
		expect(validarAltura('0,9')).toBe(false);
	});
});

describe('alturaACm', () => {
	it('metros con coma: "1,60" -> 160', () => {
		expect(alturaACm('1,60')).toBe(160);
	});

	it('metros con punto y un decimal: "1.6" -> 160', () => {
		expect(alturaACm('1.6')).toBe(160);
	});

	it('centimetros enteros: "175" -> 175 (costumbre vieja)', () => {
		expect(alturaACm('175')).toBe(175);
	});

	it('extremos en metros: "1" -> 100 y "2,3" -> 230', () => {
		expect(alturaACm('1')).toBe(100);
		expect(alturaACm('2,3')).toBe(230);
	});

	it('fuera de ambos rangos ("99", "231", "0,9") -> null', () => {
		expect(alturaACm('99')).toBe(null);
		expect(alturaACm('231')).toBe(null);
		expect(alturaACm('0,9')).toBe(null);
	});

	it('mas de dos decimales o basura -> null', () => {
		expect(alturaACm('1,755')).toBe(null);
		expect(alturaACm('abc')).toBe(null);
	});
});

describe('metrosDesdeCm', () => {
	it('175 -> "1,75" y 160 -> "1,60"', () => {
		expect(metrosDesdeCm(175)).toBe('1,75');
		expect(metrosDesdeCm(160)).toBe('1,60');
	});
});

describe('normalizarNombre', () => {
	it('"  miguel   insfran " -> "Miguel Insfran"', () => {
		expect(normalizarNombre('  miguel   insfran ')).toBe('Miguel Insfran');
	});
});

describe('validarDatosEditados (sub-pantalla Cambiar mis datos)', () => {
	it('los cuatro campos validos -> valido y sin errores', () => {
		const r = validarDatosEditados('Miguel', '30', '70', '175');
		expect(r.valido).toBe(true);
		expect(r.errores).toEqual({ nombre: null, edad: null, peso: null, altura: null });
		expect(r.primerError).toBeNull();
	});

	it('edad fuera de rango -> invalido, error en edad, primerError = "edad"', () => {
		const r = validarDatosEditados('Miguel', '13', '70', '175');
		expect(r.valido).toBe(false);
		expect(r.errores.edad).not.toBeNull();
		expect(r.errores.nombre).toBeNull();
		expect(r.primerError).toBe('edad');
	});

	it('edad = 101 invalida', () => {
		const r = validarDatosEditados('Miguel', '101', '70', '175');
		expect(r.valido).toBe(false);
		expect(r.errores.edad).not.toBeNull();
	});

	it('peso fuera de rango -> invalido, error en peso', () => {
		const r = validarDatosEditados('Miguel', '30', '19', '175');
		expect(r.valido).toBe(false);
		expect(r.errores.peso).not.toBeNull();
	});

	it('altura vacia es valida (opcional)', () => {
		const r = validarDatosEditados('Miguel', '30', '70', '');
		expect(r.valido).toBe(true);
	});

	it('altura fuera de rango -> invalido, error en altura', () => {
		const r = validarDatosEditados('Miguel', '30', '70', '99');
		expect(r.valido).toBe(false);
		expect(r.errores.altura).not.toBeNull();
	});

	it('multiples errores: el primerError es nombre, en orden nombre->edad->peso->altura', () => {
		const r = validarDatosEditados('', '', '', '');
		expect(r.valido).toBe(false);
		expect(r.primerError).toBe('nombre');
	});

	it('primerError es "peso" si nombre y edad son validos', () => {
		const r = validarDatosEditados('Miguel', '30', '500', '175');
		expect(r.valido).toBe(false);
		expect(r.primerError).toBe('peso');
	});

	it('primerError es "altura" si solo la altura es invalida', () => {
		const r = validarDatosEditados('Miguel', '30', '70', '99');
		expect(r.valido).toBe(false);
		expect(r.primerError).toBe('altura');
	});
});

describe('armarParcheDatos', () => {
	const anio = 2026;

	it('altura incluida en el parche cuando el usuario la ingreso', () => {
		const parche = armarParcheDatos('Miguel', '30', '70', '175', anio);
		expect(parche.nombre).toBe('Miguel');
		expect(parche.anio_nacimiento).toBe(1996);
		expect(parche.peso_kg).toBe(70);
		expect(parche.altura_cm).toBe(175);
	});

	it('altura en metros se guarda en centimetros ("1,75" -> 175)', () => {
		const parche = armarParcheDatos('Miguel', '30', '70', '1,75', anio);
		expect(parche.altura_cm).toBe(175);
	});

	it('nombre normalizado (trim, capitalizacion por palabra)', () => {
		const parche = armarParcheDatos('  miguel   insfran ', '30', '70', '175', anio);
		expect(parche.nombre).toBe('Miguel Insfran');
	});

	it('altura omitida del parche cuando esta vacia (Dexie conserva el valor previo)', () => {
		const parche = armarParcheDatos('Miguel', '30', '70', '', anio);
		expect(parche.altura_cm).toBeUndefined();
		expect('altura_cm' in parche).toBe(false);
	});

	it('anio_nacimiento = anioActual - edad (caso borde: 30 anios en 2026 -> 1996)', () => {
		const parche = armarParcheDatos('Ana', '14', '50', '160', anio);
		expect(parche.anio_nacimiento).toBe(anio - 14);
	});

	it('peso decimal con coma se normaliza a number', () => {
		const parche = armarParcheDatos('Miguel', '30', '66,8', '175', anio);
		expect(parche.peso_kg).toBe(66.8);
	});

	it('peso decimal con punto se persiste como number', () => {
		const parche = armarParcheDatos('Miguel', '30', '66.8', '175', anio);
		expect(parche.peso_kg).toBe(66.8);
	});
});

describe('inputsDesdePerfil', () => {
	const anio = 2026;

	it('edad se calcula con edadDesdeAnio (anioActual - anio_nacimiento)', () => {
		const inputs = inputsDesdePerfil(
			{ nombre: 'Miguel', anio_nacimiento: 1996, peso_kg: 70, altura_cm: 175 },
			anio
		);
		expect(inputs.nombre).toBe('Miguel');
		expect(inputs.edad).toBe('30');
		expect(inputs.peso).toBe('70');
		// La altura se edita en metros, como se escribe.
		expect(inputs.altura).toBe('1,75');
	});

	it('altura vacia cuando el perfil no la tiene', () => {
		const inputs = inputsDesdePerfil(
			{ nombre: 'Miguel', anio_nacimiento: 1996, peso_kg: 70 },
			anio
		);
		expect(inputs.altura).toBe('');
	});

	it('peso decimal se pinta con su digito decimal (sin ".0" sobrante)', () => {
		const inputs = inputsDesdePerfil(
			{ nombre: 'Miguel', anio_nacimiento: 1996, peso_kg: 66.8, altura_cm: 175 },
			anio
		);
		expect(inputs.peso).toBe('66.8');
	});

	it('peso entero se pinta sin ".0" sobrante', () => {
		const inputs = inputsDesdePerfil(
			{ nombre: 'Miguel', anio_nacimiento: 1996, peso_kg: 70, altura_cm: 175 },
			anio
		);
		expect(inputs.peso).toBe('70');
	});
});

describe('flujo integrado: guardar datos actualiza perfil e IMC', () => {
	// El parche de armarParcheDatos se le pasa a actualizarPerfil, que
	// hace merge con el perfil actual. El IMC se recalcula con los
	// nuevos peso/altura via `calcularImc`. Este test demuestra el
	// contrato end-to-end de la logica del ITEM 4 (sin tocar UI).
	it('un parche valido se aplica a Dexie y el IMC refleja los nuevos peso/altura', async () => {
		// Sembrar perfil con peso 70 y altura 175 (IMC 22.9, normal).
		await guardarPerfil(perfilBase({ peso_kg: 70, altura_cm: 175 }));

		// El usuario edita peso a 80 y deja la altura como estaba.
		const parche = armarParcheDatos('Persona de prueba', '31', '80', '175', 2026);
		await actualizarPerfil(parche);

		const perfilActualizado = await obtenerPerfil();
		expect(perfilActualizado?.peso_kg).toBe(80);
		expect(perfilActualizado?.altura_cm).toBe(175);
		// normalizarNombre capitaliza cada palabra ("Persona De Prueba").
		expect(perfilActualizado?.nombre).toBe('Persona De Prueba');

		const imc = calcularImc(perfilActualizado!.peso_kg, perfilActualizado!.altura_cm);
		expect(imc).not.toBeNull();
		// 80 / (1.75^2) = 26.12 -> categoria sobrepeso
		expect(imc!.categoria).toBe('sobrepeso');
	});
});
