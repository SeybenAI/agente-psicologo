# Kit de entrenamiento del agente — Acompañante Terapéutico

Documento de trabajo entre el **psicólogo/a** (criterio clínico) y la **parte técnica**
(quien implementa los cambios en ElevenLabs). El doctor **no necesita tocar nada técnico**:
solo lee, prueba y escribe sus correcciones en lenguaje normal. La parte técnica las
traduce a la configuración del agente.

> **Importante:** "entrenar" aquí NO es reentrenar un modelo de IA. Es afinar el
> **prompt** (instrucciones), la **base de conocimiento** (PDFs) y, por paciente, las
> **instrucciones de la próxima sesión**. Eso es lo que ajusta el comportamiento.

---

## 0. Datos del agente (referencia técnica)

| Campo | Valor |
|---|---|
| Nombre | Acompañante Terapéutico (Terapia IA) |
| Agent ID | `agent_8101kv2vkjnjf4f8rhcw4bz13x9v` |
| Voz | Maia (España, profesional) · `jipeLrCHZ6ByxrU2JP9i` |
| Modelo de voz | `eleven_flash_v2_5` (tiempo real) |
| Ajustes de voz | estabilidad 0.9 · similarity 0.7 · velocidad 0.9 |
| LLM | `qwen36-35b-a3b` (alternativa: `gemini-2.5-flash`) |
| Variables dinámicas | `{{patient_name}}`, `{{doctor_instructions}}`, `{{session_history}}` |
| Análisis por sesión | `risk_level`, `risk_rationale`, `topics` |

---

## 1. Cómo trabajamos: reparto de roles

| El **DOCTOR** (clínica) | La **PARTE TÉCNICA** (implementación) |
|---|---|
| Prueba el agente hablando con él (role-play) | Le da un enlace de prueba para usarlo solo |
| Revisa transcripciones reales en el panel del doctor | Garantiza que se guarden bien (ya funciona) |
| Anota en lenguaje normal qué está mal o falta | Traduce esas notas al **prompt** del agente |
| Define técnicas, límites y protocolo de crisis | Lo lleva al **prompt** y a los **PDFs** (base de conocimiento) |
| Da el visto bueno de cada versión | Versiona y publica el cambio (es inmediato) |

### El ciclo (una ronda, ~semanal)

```
1. El doctor PRUEBA      → habla con el agente / revisa sesiones reales
2. El doctor ANOTA       → escribe correcciones en la sección 4 de este doc
3. La técnica TRADUCE    → ajusta prompt / añade PDF / cambia config
4. La técnica PUBLICA    → el cambio es inmediato en ElevenLabs
5. El doctor RE-PRUEBA   → confirma que ya se comporta como quiere
   ↑ se repite hasta el OK del doctor
```

---

## 2. Prompt actual del agente (versión legible para el doctor)

Esto es, en cristiano, lo que el agente "tiene metido en la cabeza" hoy. **Doctor: léelo
y marca lo que cambiarías** (en la sección 4).

> **Quién es:** un acompañante emocional de IA, por voz, para personas que están *entre*
> sesiones con su psicólogo/a. Habla en español de España, con tono cálido, sereno y cercano.
>
> **Quién NO es:** no es un profesional sanitario, no sustituye al psicólogo, no
> diagnostica, no receta, no promete resultados. Si le piden eso, lo deriva al profesional.
>
> **Cómo acompaña:**
> - Escucha activa: deja hablar, no interrumpe, valida antes de responder.
> - Frases cortas y naturales (es voz), sin tecnicismos ni listas.
> - Preguntas abiertas para explorar ("¿cómo te hizo sentir eso?").
> - Refleja y resume lo que oye; no juzga nunca.
> - Sin prisa, permite silencios (la sesión no tiene límite).
>
> **Memoria:** recibe un resumen de las sesiones anteriores y lo usa para dar continuidad.
>
> **Indicaciones del psicólogo:** recibe las instrucciones que el doctor deja para esa
> sesión concreta y las sigue de forma sutil.
>
> **Seguridad / crisis:** ante ideas de suicidio, autolesión o peligro, mantiene la calma,
> se queda con la persona, valida su dolor y anima a buscar ayuda inmediata (024 / 112).
> No minimiza ni cambia de tema. Recuerda que el psicólogo revisará la sesión.
>
> **Cierre:** agradece la confianza, reconoce el paso dado y se despide con calidez.

### Primer mensaje (saludo)
> "Hola [nombre], soy tu acompañante. Me alegra que estés aquí. Este es un espacio
> tranquilo y solo para ti, así que tómate el tiempo que necesites. ¿Cómo te encuentras hoy?"

---

## 3. Anatomía de un buen prompt (los 6 bloques)

Cuando afinemos el prompt, lo construimos sobre estos 6 bloques (estándar de ElevenLabs
para agentes de voz). Sirve de checklist para no dejarnos nada:

1. **Personalidad** — quién es el agente y quién no.
2. **Entorno** — el contexto (persona entre sesiones, por voz, espacio seguro).
3. **Tono** — cómo habla (frases cortas, natural, silencios permitidos).
4. **Objetivo** — qué busca y en qué orden (escuchar → validar → explorar → cerrar).
5. **Límites (guardrails)** — lo que NUNCA hace (diagnosticar, recetar, sustituir…).
6. **Herramientas** — acciones externas (de momento, ninguna).

> **Truco que más mejora el resultado:** añadir **2-3 ejemplos reales** de intercambios
> buenos (paciente dice X → el agente responde Y). Enseñan más que veinte reglas. El doctor
> los aporta en la sección 4.

---

## 4. PLANTILLA QUE RELLENA EL DOCTOR

> Doctor: escribe aquí en lenguaje normal. No te preocupes por la forma técnica.

### 4.1 Enfoque terapéutico
¿Qué corriente/estilo debe reflejar el agente? (TCC, humanista, centrado en la persona…)

`...`

### 4.2 Tono y trato
¿Cómo debe sonar? ¿De usted o de tú? ¿Más contenido o más cercano?

`...`

### 4.3 Qué debe hacer SIEMPRE
- `...`
- `...`

### 4.4 Qué NO debe hacer NUNCA
- `...`
- `...`

### 4.5 Apertura y cierre de sesión
¿Cómo te gusta que empiece y termine una sesión?

`...`

### 4.6 Protocolo ante señales de riesgo (crisis)
Pasos EXACTOS que debe seguir. Recursos a mencionar.

`...`

### 4.7 Ejemplos de respuestas (lo más valioso)
**Buenos** (así sí):
- Paciente: "`...`" → Agente debería: "`...`"

**Malos** (así no):
- Paciente: "`...`" → Agente NO debería: "`...`" → Mejor: "`...`"

### 4.8 Correcciones sobre sesiones reales
(Doctor: tras revisar transcripciones, apunta aquí qué cambiarías)

- Sesión / fecha: `...` — problema: `...` — debería haber: `...`

---

## 5. Base de conocimiento (PDFs) — qué subir y qué no

El agente puede **consultar documentos** (RAG) para apoyarse en conocimiento del doctor.

**Regla de oro:** el **comportamiento** va en el PROMPT (sección 4); los **PDFs** son solo
para **conocimiento factual** que el agente deba manejar.

| ✅ Buen candidato a PDF | ❌ NO ponerlo en PDF |
|---|---|
| Guion detallado ante una crisis | La personalidad/tono (va en el prompt) |
| Psicoeducación (qué es la ansiedad, el insomnio…) | Manuales clínicos enteros (riesgo de "consejo médico") |
| Técnicas concretas (respiración, mindfulness…) | Datos de pacientes (privacidad) |
| Info de la clínica, recursos por zona, FAQs | |

**Avisos:**
- Documentos **cortos, curados y aprobados por el doctor**. Él es el responsable clínico.
- Pocos PDFs y bien hechos: RAG añade algo de latencia (se nota en voz).
- Empezar por el prompt (≈80% del resultado) y añadir PDFs solo cuando el doctor
  identifique conocimiento concreto que falte.

### Lista de PDFs a pedir al doctor (a rellenar)
- [ ] `...`
- [ ] `...`

---

## 6. Frase resumen para reuniones

> "El psicólogo aporta el criterio clínico revisando sesiones y probando el agente; la
> parte técnica lo traduce a las instrucciones y el conocimiento del agente. Es un ciclo
> de prueba → feedback → ajuste, con el doctor validando cada versión. No reentrenamos
> ningún modelo: afinamos prompt, base de conocimiento y métricas de calidad."
