<!--
  Control de importacion de respaldo (.json), reutilizado por config y
  por la bienvenida del onboarding. Encapsula SOLO el control; el
  parrafo de contexto lo pone cada pantalla. Tras exito, llama a
  `onImportado` y el host decide adonde ir.
-->
<script module lang="ts">
	// Cada instancia recibe un id unico para el input.
	let contadorInstancias = 0;
</script>

<script lang="ts">
	import { importarDatos } from '$lib/importar/importar';
	import { mensajePara } from '$lib/errores/mensajes';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import Boton from '$lib/components/Boton.svelte';

	let {
		onImportado,
		etiquetaBoton = 'Importar y reemplazar mis datos'
	}: {
		// Llamado tras exito. El host decide a donde ir.
		onImportado: () => void;
		etiquetaBoton?: string;
	} = $props();

	contadorInstancias = contadorInstancias + 1;
	const idInput = `archivo-importar-${contadorInstancias - 1}`;

	let archivo = $state<FileList | null>(null);
	let guardando = $state(false);

	async function manejarImportar() {
		const f = archivo?.[0];
		// Validacion al pulsar, no al deshabilitar: un boton disabled no
		// da feedback al toque (y TalkBack lo salta).
		if (!f) {
			avisar('Elige primero el archivo de exportación.', 'error');
			return;
		}
		guardando = true;
		try {
			let datos: unknown;
			try {
				datos = JSON.parse(await f.text());
			} catch {
				avisar(mensajePara('ERR-IMPORT-INVALID'), 'error');
				return;
			}
			await importarDatos(datos);
			avisar('Datos importados', 'exito');
			onImportado();
		} catch (e) {
			avisar(
				mensajePara((e as { code?: string }).code ?? 'ERR-IMPORT-INVALID'),
				'error'
			);
		} finally {
			guardando = false;
		}
	}
</script>

<label class="block py-2" for={idInput}>Archivo de exportación (.json)</label>
<!-- accept incluye octet-stream: el selector de Android esconde los
     .json que quedaron con MIME generico (descargas, apps de chat) si
     solo se pide application/json. El contenido se valida igual. -->
<input
	id={idInput}
	type="file"
	accept="application/json,application/octet-stream,.json"
	bind:files={archivo}
/>
<!-- El error se muestra via el aviso visible: una sola llamada a
     `avisar` cubre lector + pantalla, no se renderiza inline. -->
<div class="mt-6 flex flex-col gap-2">
	<Boton variante="primario" onclick={manejarImportar} deshabilitado={guardando}>
		{etiquetaBoton}
	</Boton>
</div>
