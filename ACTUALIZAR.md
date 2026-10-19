# Cómo se carga una factura nueva de Claro al Panel (procedimiento automático)

Lo ejecuta una tarea programada de Claude (o Claude a pedido). Eduardo solo sube el PDF a Drive.

1. Drive, carpeta "Facturas Claro" (parentId 1W7ybqyJfYCCmrsU34GSk-hE-t2t859Zv): PDFs `Factura_<número>.pdf`
   (ignorar otros archivos: Detalle_Factura.csv, ebooks, duplicados). Leer cada PDF con read_file_content.
2. Del texto sacar "Factura N° 1340-00749074" (nroFact). Si ya está en `FACTURAS` de index.html → nada que hacer.
3. Armar la entrada nueva al final de `FACTURAS` copiando la del mes anterior:
   - `mesLabel` = mes de la fecha de emisión ("Fecha de Factura"), `fechaStr/fechaISO`, `total` (Total Factura),
     `venc`, `proxVenc`, `periodo` ("Período Facturado desde … hasta …").
   - `lineas`: las 35 líneas de "DETALLE DE ITEMS POR LINEA". `base` = plan − bonificación (columna Total por línea
     SIN los extras), `extra` = datos/roaming/llamadas/Teatrix de esa línea ("Otros cargos" + "Datos" + "Roaming"…).
   - `extras`: una por consumo, `quien` = nombre de la línea, `v` = monto; `totalExtras` = suma.
   - `imp`: iva21, iva27, p3 (Iva Percepción 3%), ib (Perc. IIBB), ii (Impuesto Interno, si aparece).
   - Si cambia el nombre de un plan (ej. CC11R→CC21R) agregarlo a `PLAN_GB` y al CSS `.p-…`.
   - Línea nueva o que desaparece: agregarla/quitarla de `GRUPOS`; si no se sabe de quién es, NO inventar: avisar.
4. `node tools/validar.js` tiene que dar OK (líneas + impuestos = total, extras suman, N° no repetido).
5. Commit + push a main (Vercel publica en 1–2 min). Avisar a Eduardo: mes, N° de factura, total, F2, extras por persona.
Nunca inventar datos: si algo no cierra, no publicar y avisar qué falta.

---

# Conciliación de cobros (extractos del Banco Patagonia)

Regla de oro: **el panel solo muestra lo que dice un extracto real del banco**. Mes sin extracto → la pantalla Conciliar dice "No hay datos" y no muestra nada. Nunca cargar cobros "de memoria" ni de otra fuente.

1. Drive, carpeta "Patagonia" (parentId 1xpcteaJQCKqXp0vali-hxauVPq5XFZ3Q): extractos `<mes> 2026.pdf` (ej. `agosto 2026.pdf`; ignorar `resumenTarjetaCredito…`, `Listado de Liquidaciones…`, html y duplicados).
   Un extracto cuyo "ESTADO DE CUENTAS UNIFICADO … AL dd/mm/aa" ya está en `CONC_MESES` (clave del mes) → nada que hacer.
2. Leerlo con read_file_content, guardar el texto completo en un archivo (scratchpad) y correr `node tools/conciliar.js <archivo.txt>`.
   El script lee "TRANSFERENCIAS RECIBIDAS" y "PAGO DE SERVICIOS CLARO", asigna cada transferencia a su grupo con `tools/pagadores.json` y escribe el mes entre las marcas `/*CONC:INICIO*/ … /*CONC:FIN*/` de index.html.
3. Si el script dice **SIN ASIGNAR** (transferencia de alguien que no está en pagadores.json) o **sin confirmar**: NO inventar de quién es. Cargar igual lo asignado y avisar a Eduardo cada caso (fecha, nombre del banco, monto) para que diga a qué grupo va; recién ahí se agrega a `pagadores.json`.
4. `node tools/validar.js` tiene que dar OK. Commit + push a main. Avisar: mes, cuánto transfirió cada grupo, quién NO transfirió, Pago a Claro, diferencia, y los sin asignar.
Si el extracto no se puede leer o el script falla (cantidad de transferencias no coincide), no publicar y avisar.
