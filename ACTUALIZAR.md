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
