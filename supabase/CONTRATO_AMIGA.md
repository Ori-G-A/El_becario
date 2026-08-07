# Contrato de lectura para `amiga`

Instrucciones para el proyecto de amiga (Epitaxy). La conexión ya existe: mismo
proyecto de Supabase que El Becario, mismo magic link, mismo `auth.uid()`. No hay
nada que configurar. Lo único que falta es **qué leer y cómo entenderlo**.

---

## 1. Leer la vista, no la tabla

Amiga tiene la sesión de Oriana, así que la RLS le deja ver `bloque` directo. **No
lo hagas.** Leer siempre:

```js
supabase.from('uso_del_tiempo')
```

`bloque` es la tabla cruda. La vista es la misma información ya resuelta, y hay tres
cosas que solo pasan en la vista:

- Los títulos confidenciales están **cifrados con el PIN** en la tabla. Amiga no
  tiene la clave (vive solo en el navegador de El Becario) y recibiría `enc:v1:…`.
  La vista no expone títulos de ningún tipo, así que el problema no existe.
- Las reglas de resolución (tiempo real vs. planeado, de dónde sale el área, qué
  bloques no ocurrieron) están **dentro** de la vista. Reimplementarlas contra
  `bloque` es garantizar que amiga y la app digan números distintos.
- `foco_profundo` y `sueno` no existen como dato guardado: los deriva la vista.

> La sesión es la de Oriana completa: da lectura **y escritura** a todo El Becario.
> Amiga solo lee `uso_del_tiempo`. Ningún insert, update o delete contra `bloque`,
> `tarea`, `iniciativa` o `area` — la agenda se edita desde la app.

---

## 2. Qué es `uso_del_tiempo`

Una fila por bloque de calendario. Es tiempo que **ocurrió o va a ocurrir**, ya
resuelto: amiga no tiene que reconstruir nada desde las tablas crudas.

| Columna | Qué es |
|---|---|
| `bloque_id` | Identidad de la fila. Estable entre consultas. |
| `inicio`, `fin` | `timestamptz`. Convertir a `America/Bogota` para hablar de días y horas. |
| `minutos` | Duración ya calculada, en minutos enteros. **Usar esto, no restar `fin - inicio`.** |
| `con_registro_real` | `true` = Oriana marcó cuándo empezó y terminó de verdad. `false` = son los minutos planeados. |
| `area` / `area_id` | El área de vida. La etiqueta más grande. |
| `iniciativa` / `iniciativa_id` | El proyecto o línea de trabajo. |
| `tarea_id` | La tarea concreta, si el bloque colgaba de una. Solo el id: los títulos no salen. |
| `categoria` | Taxonomía fija de ocho valores (abajo). |
| `tipo` | Modo del bloque: seis valores (abajo). |

**No vienen títulos ni notas de ningún bloque, ni nada marcado confidencial.** No es
un descuido: la vista existe para hablar de *cuánto tiempo y de qué*, no de qué
decía cada bloque. Si amiga necesita el contenido, se lo pide a Oriana.

---

## 3. Los dos ejes (no son lo mismo y no se suman entre sí)

Esto es lo que se venía perdiendo. Cada bloque se lee por dos lados distintos:

**PARA QUÉ era ese tiempo** → `area` → `iniciativa` → `categoria`.
Es la cadena de propósito. El área se define una vez, se le asigna a la iniciativa,
y baja sola a cada tarea y cada bloque que cuelgue de ella.

**CÓMO se usó ese tiempo** → `tipo`.
Es una lectura independiente: dos bloques de la misma iniciativa pueden ser uno de
foco profundo y otro reactivo, y eso dice algo que la categoría no dice.

`tipo` y `categoria` **repiten algunas palabras a propósito** (`autocuidado` y
`sueno` aparecen parecido en ambos). No son duplicados: `tipo` es el resumen
grueso, `categoria` la granularidad. Un bloque `tipo = 'autocuidado'` puede tener
`categoria` de `ejercicio`, `comida`, `traslado`, `cuidado_personal` o `libre`.
Nunca cruzarlos como si fueran la misma columna.

### Valores de `categoria`

`trabajo` · `foco_profundo` · `sueno` · `ejercicio` · `cuidado_personal` ·
`comida` · `traslado` · `libre`

Seis se eligen a mano en la iniciativa. Dos las **deriva la vista** y no existen
como opción: `sueno` (viene del tipo del bloque) y `foco_profundo` (un bloque de
concentración dentro de una iniciativa de trabajo).

Los nombres y su significado **no cambian**. Ese es el contrato: si cambian, la
serie histórica deja de ser comparable y todo lo que amiga concluyó antes se cae.

### Valores de `tipo`

`top_goal` · `trabajo_profundo` · `reactivo` · `reunion` · `autocuidado` · `sueno`

---

## 4. Reglas que la vista ya resolvió — no reimplementar

1. **Los bloques reportados como no cumplidos no aparecen.** Ese tiempo no ocurrió.
   Amiga no tiene que filtrar nada.
2. **El tiempo real le gana al planeado.** Si hay registro real, `minutos` son los
   reales; si no, los planeados. `con_registro_real` dice cuál de los dos es.
3. **Una sola área por bloque, siempre.** Si la tarea tiene un área propia, esa
   gana; si no, la de la iniciativa. Nunca hay dos filas para el mismo bloque, así
   que **sumar `minutos` nunca cuenta doble**.
4. **La iniciativa de la tarea manda.** Si el bloque cuelga de una tarea, la
   iniciativa sale de ahí; la iniciativa directa del bloque es el respaldo.
5. **El sueño está fuera del techo de 40 h de trabajo.** Si amiga calcula carga
   laboral, excluir `categoria = 'sueno'` y `'ejercicio'`, `'comida'`, `'traslado'`,
   `'cuidado_personal'`, `'libre'`.

---

## 5. Los nulos significan algo

| Situación | Qué pasó | Qué debe hacer amiga |
|---|---|---|
| `categoria is null` | Bloque de autocuidado suelto, sin tarea ni iniciativa. | **Reportarlo, no descartarlo.** Es tiempo real sin etiquetar. Decir cuántas horas fueron y sugerir engancharlo a una iniciativa permanente (Ejercicio, Comida, Traslado…). |
| `area is null` | La iniciativa existe pero no tiene área asignada. | Mencionarlo una vez. Se arregla en la pestaña Iniciativas. |
| `iniciativa is null` | El bloque no le reporta a nada. | Igual que el primero: es el agujero que hay que cerrar. |

Descartar los nulos en silencio es exactamente el problema que este contrato vino a
arreglar. Si en una semana hay horas sin clasificar, eso **es** un hallazgo.

---

## 6. Consultas

PostgREST filtra por rango de fechas así:

```js
const { data, error } = await supabase
  .from('uso_del_tiempo')
  .select('inicio, fin, minutos, area, iniciativa, categoria, tipo, con_registro_real')
  .gte('inicio', '2026-08-03T00:00:00-05:00')
  .lt('inicio', '2026-08-10T00:00:00-05:00')
  .order('inicio')
```

Agregar en el cliente: la vista no expone `group by` por PostgREST. Con una semana
son decenas de filas, no miles.

```js
const horasPor = (filas, clave) =>
  filas.reduce((acc, f) => {
    const k = f[clave] ?? 'sin clasificar'
    acc[k] = (acc[k] ?? 0) + f.minutos / 60
    return acc
  }, {})

horasPor(data, 'area')        // reparto por área de vida
horasPor(data, 'iniciativa')  // en qué proyectos se fue la semana
horasPor(data, 'categoria')   // el reparto de vida
horasPor(data, 'tipo')        // la otra lectura: foco vs reactivo vs reuniones
```

---

## 7. Preguntas que amiga ahora sí puede responder

Antes solo llegaba `categoria`, así que lo máximo era "3 h de trabajo". Con la
cadena completa:

- ¿Qué área se comió la semana, y cuál quedó abandonada?
- Dentro de trabajo, ¿qué iniciativa se llevó las horas? ¿Coincide con la que
  Oriana dice que es prioridad?
- ¿Cuánto del tiempo de una iniciativa fue foco profundo y cuánto reactivo?
  (Cruzar `iniciativa` con `tipo`.)
- ¿Cuánto de lo planeado se registró de verdad? (`con_registro_real`.)
- ¿Cuántas horas quedaron sin clasificar, y de qué tipo eran?

---

## 8. Si algo se ve raro

- **Cero filas siempre, sin error** → no hay sesión. La vista tiene
  `security_invoker = true`: sin `auth.uid()` no hay filas que mostrar, y PostgREST
  devuelve una lista vacía en vez de quejarse. Volver a mandar el magic link.
- **Faltan bloques que Oriana jura que existen** → los reportó como no cumplidos, o
  están fuera del rango de fechas (ojo con la zona horaria: Bogotá es UTC-5 fijo,
  sin horario de verano).
- **Las horas no cuadran con la app** → la app cuenta con reglas propias para el
  techo de 40 h (solo `top_goal`, `trabajo_profundo`, `reactivo`, `reunion`).
  La vista entrega todo el tiempo, sin ese filtro.
