# Mi Cava 🍷

Aplicación para Android que lleva el inventario de una cava de vinos y licores.
Está completamente en español y funciona **sin internet**. Solo el conteo por foto necesita conexión.

Todo se guarda en el teléfono. No hay que crear cuentas ni pagar suscripciones.

---

## Índice

1. [Cómo se usa la app](#1-cómo-se-usa-la-app)
2. [Conteo por foto: tu clave de Anthropic y cuánto cuesta](#2-conteo-por-foto-tu-clave-de-anthropic-y-cuánto-cuesta)
3. [Cómo generar el APK la primera vez](#3-cómo-generar-el-apk-la-primera-vez-paso-a-paso)
4. [Cómo instalar el APK en tu Android](#4-cómo-instalar-el-apk-en-tu-android)
5. [Cómo generar un APK nuevo cuando hagamos cambios](#5-cómo-generar-un-apk-nuevo-cuando-hagamos-cambios)
6. [Copia de seguridad y cambio de teléfono](#6-copia-de-seguridad-y-cambio-de-teléfono)
7. [Preguntas frecuentes](#7-preguntas-frecuentes)
8. [Para programadores](#8-para-programadores)

---

## 1. Cómo se usa la app

### La primera vez
- Aparece un **recorrido de 5 pantallas** que explica cada sección. Puedes volver a verlo en **Más → Ver el recorrido de bienvenida**.
- La app trae **10 productos de ejemplo**, con movimientos y pedidos, para que veas cómo funciona.
  Cuando quieras empezar con tus datos reales, ve a **Más → Ajustes → Borrar datos de ejemplo**.
- Te pedirá permiso para enviar **notificaciones**. Di que **sí**, porque así te llegan las alertas.

### Las 5 pestañas de abajo

| Pestaña | Para qué sirve |
|---|---|
| **Inicio** | Muestra el resumen: productos por reponer, agotados, pedidos en camino, total de unidades y valor del inventario. También tiene botones rápidos para Entrada, Salida, Transferencia y Conteo por foto. |
| **Inventario** | Lista de productos con buscador, filtros y lector de código de barras. Toca un producto para ver cuánto hay en cada ubicación. |
| **Movimientos** | Aquí registras todo lo que pasa con las botellas: entradas, ventas, transferencias, pedidos, decomisos, pruebas de boda y ajustes. |
| **Reposición** | Lo que hay que pedir, agrupado por proveedor, con la cantidad sugerida y el costo. |
| **Más** | Pedidos, conteo, historial, reportes, ajustes y las guías "¿Cómo se hace?". |

### Los colores
- 🔴 **Rojo**: el producto está agotado (quedan 0).
- 🟠 **Naranja**: está bajo el mínimo, hay que reponer.
- 🔵 **Azul**: está bajo el mínimo, pero ya viene un pedido que lo cubre.
- 🟢 **Verde**: todo bien.

### Reglas importantes
- **La existencia nunca se cambia a mano.** Siempre se registra un movimiento, así queda en el historial quién hizo qué y cuándo.
- **No se puede sacar más de lo que hay.** Por ejemplo, si intentas transferir 10 botellas del Bar y solo hay 4, la app muestra: *"No puedes transferir 10 si solo hay 4 en Bar"*.
- **¿Te equivocaste?** Justo después de guardar aparece abajo un aviso con el botón **DESHACER**.
- **Cantidad sugerida a pedir** = máximo − (existencia + lo que viene en camino). Si no pusiste máximo, la app usa 2 × mínimo.

### Ejemplos rápidos
- **Transferencia:** pasaste 6 botellas de Marqués de Riscal de la Cava principal al Bar.
  Toca **Movimientos → Transferencia** → elige el producto → Origen: **Cava principal** → Destino: **Bar** → Cantidad: **6** → **Guardar**.
- **Prueba de boda:** la pareja Pérez-Gómez probó 1 Moët.
  Toca **Movimientos → Prueba de boda** → elige el producto → Cantidad: **1** → Cliente o evento: **Boda Pérez-Gómez** → Fecha del evento → Responsable → **Guardar**.
- **Recibir un pedido incompleto:** pediste 24 cervezas y llegaron 18.
  Toca **Más → Pedidos en tránsito** → abre el pedido → **Recibir pedido** → cambia el 24 por **18** → **Guardar recepción**.

Todas las guías paso a paso están en **Más → ¿Cómo se hace?** y en el botón **?** de cada pantalla.

### Modo práctica
En **Más → Ajustes → Modo práctica** puedes activar una copia con datos de ejemplo.
Ahí puedes practicar todo lo que quieras sin tocar tu inventario real. Mientras está activo, arriba dice **MODO PRÁCTICA**.

### Alertas
1. **Aviso inmediato:** cuando un movimiento deja un producto bajo su mínimo te llega *"Reponer: [producto] – quedan X, mínimo Y"*.
2. **Resumen diario:** te llega a las 9:00 a. m. Puedes cambiar la hora en Ajustes.
3. **Pedido atrasado:** te avisa si un pedido pasa su fecha estimada de llegada sin recibirse.
4. **Contador:** la pestaña Reposición muestra un número naranja con los productos por reponer.

---

## 2. Conteo por foto: tu clave de Anthropic y cuánto cuesta

El conteo por foto envía la foto a la inteligencia artificial **Claude**, de la empresa Anthropic, para que cuente las botellas.
Para eso necesitas una **clave de API** propia. La clave se guarda cifrada en tu teléfono y **nunca** está escrita en el código de la app.

### Cómo obtener la clave
1. En la computadora o el teléfono, abre el navegador y entra a **https://console.anthropic.com**.
2. Crea una cuenta con tu correo, o inicia sesión si ya tienes una.
3. Ve a **Billing** (Facturación). Agrega una tarjeta y compra crédito; con **US$5** es suficiente para empezar.
4. Ve a **API Keys** y toca **Create Key**. Ponle un nombre, por ejemplo *Mi Cava*.
5. **Copia la clave**. Empieza con `sk-ant-` y solo se muestra **una vez**.
6. En la app ve a **Más → Ajustes → Clave de API**, pega la clave y toca **Guardar clave**.

### ¿Cuánto cuesta?
- Cada foto cuesta entre **US$0.05 y US$0.15**, es decir, unos **RD$3 a RD$9**. El precio depende del tamaño de la foto y de cuántos productos tengas registrados.
- Con US$5 alcanza para unas **50 a 100 fotos**.
- Solo pagas las fotos que envías. Si no usas el conteo por foto, no pagas nada.
- La app usa el modelo **Claude Opus 5.5**. Si ese modelo no puede responder, la API usa otro automáticamente.

### Cómo funciona
1. Toca **Conteo por foto** (en Inicio) y elige la ubicación que estás contando.
2. Toma una foto o elige una de la galería.
3. La IA devuelve los productos que reconoció, cuántos contó de cada uno, su nivel de confianza (alto, medio o bajo) y una nota si algo no se ve bien.
4. En la pantalla de revisión ves tres números: lo que contó la IA, lo que dice el sistema y la diferencia. **Puedes corregir cada número a mano.**
5. Al tocar **Aceptar y guardar**, la app te pide confirmar una vez más. Luego se crea un **Ajuste por conteo físico** con la foto como evidencia.

> ⚠️ El conteo por foto es una ayuda y puede equivocarse. Revisa las cantidades antes de guardar.

**Sin internet:** la foto queda guardada en una cola y se procesa cuando vuelva la conexión.
También puedes procesarla tú desde **Más → Conteo → Procesar fotos pendientes ahora**.

**Consejos para una buena foto:** busca buena luz, toma la foto de frente (estante) o desde arriba (caja abierta), y asegúrate de que se vean todas las botellas. Pon un solo producto o un solo estante por foto.

---

## 3. Cómo generar el APK la primera vez (paso a paso)

El **APK** es el archivo que se instala en Android. Lo fabrica gratis el servicio **EAS Build** de Expo, en la nube.
Tu computadora solo envía el proyecto y descarga el resultado.

Necesitas una **computadora** (Windows o Mac) con internet. Solo hay que preparar todo una vez.

### Paso 1: Crear tu cuenta gratuita de Expo
1. Entra a **https://expo.dev/signup**.
2. Escribe tu correo, un nombre de usuario y una contraseña. Toca **Sign up**.
3. Confirma tu correo con el enlace que te llega.

### Paso 2: Instalar Node.js en la computadora
1. Entra a **https://nodejs.org** y descarga la versión que dice **LTS**.
2. Ábrela e instálala con **Siguiente → Siguiente → Instalar**, dejando todo como viene.

### Paso 3: Descargar el proyecto
1. Entra a la página del proyecto en GitHub: **https://github.com/dominisommelier-beep/inventario-vinos**.
2. Arriba a la izquierda, en el selector de ramas, elige la rama donde está la app (por ahora `claude/sweet-cannon-cydy9l`, o `main` cuando la unamos).
3. Toca el botón verde **Code → Download ZIP**.
4. Descomprime el ZIP, por ejemplo en el Escritorio. Queda una carpeta que se llama algo como `inventario-vinos-...`.

### Paso 4: Abrir la terminal en esa carpeta
- **Windows:** abre la carpeta, haz clic en la barra de dirección de arriba, escribe `cmd` y presiona **Enter**.
- **Mac:** abre la app **Terminal**, escribe `cd ` (con un espacio al final), arrastra la carpeta a la ventana y presiona **Enter**.

### Paso 5: Escribir estos comandos
Escribe cada línea en la terminal y presiona **Enter**. Espera a que termine antes de escribir la siguiente.

```
npm install
```
Esto descarga lo que necesita el proyecto y tarda unos minutos. Es normal que aparezcan avisos en amarillo.

```
npm install -g eas-cli
```
Esto instala la herramienta de Expo. Si en Mac sale un error de permisos, escribe `sudo npm install -g eas-cli` y luego la contraseña de tu computadora.

```
eas login
```
Escribe el correo (o usuario) y la contraseña de tu cuenta de Expo. Al escribir la contraseña no se ven las letras, y eso es normal.

```
eas build -p android --profile preview
```
Esto genera el APK. La primera vez te hará algunas preguntas:
- *"Would you like to automatically create an EAS project…?"* → escribe **Y** y presiona **Enter**.
- *"Generate a new Android Keystore?"* → escribe **Y** y presiona **Enter**. Expo guarda la "firma" de tu app; **no la borres nunca**.

Luego verás *"Build queued…"*. La app se fabrica en la nube y tarda entre **10 y 30 minutos**; en la cuenta gratuita a veces hay fila.
Puedes cerrar la terminal; el proceso sigue en la nube.

### Paso 6: Descargar el APK
- Cuando termine, en la terminal aparece un **enlace** y un **código QR**.
- También lo encuentras en **https://expo.dev** → inicia sesión → tu proyecto **mi-cava** → **Builds** → el más reciente → botón **Install** o **Download**.

---

## 4. Cómo instalar el APK en tu Android

1. **En el teléfono**, abre el enlace del APK o escanea el código QR con la cámara. Toca **Descargar**.
2. Cuando termine, toca la notificación de descarga, o ve a la app **Archivos** → **Descargas** y toca el archivo `.apk`.
3. Android dirá que no permite instalar apps de **origen desconocido**. Para permitirlo:
   - Toca **Configuración** en el mensaje que aparece.
   - Activa **Permitir de esta fuente** (o *Permitir desde esta fuente*) para la app con la que lo abriste, por ejemplo Chrome o Archivos.
   - Toca la flecha de **atrás**.
   - Si no aparece el mensaje, ve a **Ajustes del teléfono → Aplicaciones → Acceso especial → Instalar apps desconocidas**, elige **Chrome** (o **Archivos**) y activa **Permitir**. El nombre exacto cambia un poco según la marca del teléfono.
4. Toca **Instalar**.
5. Si aparece **Google Play Protect** diciendo que no conoce la app, toca **Más detalles → Instalar de todas formas**. Es normal con apps que no vienen de la Play Store.
6. Abre **Mi Cava** y acepta los permisos de **notificaciones** y, cuando los pida, de **cámara**.

---

## 5. Cómo generar un APK nuevo cuando hagamos cambios

1. Descarga otra vez el proyecto actualizado de GitHub (Paso 3), o reemplaza la carpeta vieja.
2. Abre el archivo **`app.json`** con el Bloc de notas (Windows) o TextEdit (Mac) y sube estos dos números:
   - `"version": "1.0.0"` → `"1.0.1"` (luego `"1.0.2"`, y así).
   - `"versionCode": 1` → `2` (luego `3`, y así). **Este número siempre tiene que subir.**
3. Guarda el archivo, abre la terminal en la carpeta (Paso 4) y escribe:
   ```
   npm install
   eas build -p android --profile preview
   ```
4. Descarga el nuevo APK e instálalo **encima** de la app que ya tienes. **No la desinstales:** si instalas encima, **tus datos se conservan**.

> Si algún día tienes que desinstalar la app, primero haz una **copia de seguridad** (ver abajo). Al desinstalar, Android borra todos los datos de la app.

---

## 6. Copia de seguridad y cambio de teléfono

- **Para guardar una copia:** ve a **Más → Ajustes → Exportar copia de seguridad**. Se abre el menú de compartir; guárdala en Google Drive o envíatela por correo o WhatsApp.
  Te recomendamos hacerlo **cada semana**.
- **Para pasar los datos a un teléfono nuevo:** instala Mi Cava en el teléfono nuevo y descarga ahí el archivo de la copia. Luego ve a **Más → Ajustes → Restaurar desde un archivo** y elígelo.
  Esto **reemplaza** todo lo que haya en ese teléfono.
- La copia **no incluye** las fotos ni la clave de API. La clave tendrás que pegarla otra vez en el teléfono nuevo.
- **Para Excel:** en **Reportes** puedes exportar el inventario, los movimientos y la reposición como archivos **CSV**, que Excel abre directamente.

---

## 7. Preguntas frecuentes

**¿Necesito internet?**
No. Solo para el conteo por foto y para compartir archivos o pedidos.

**¿Qué pasa si cierro la app o apago el teléfono?**
No pasa nada. Todo queda guardado en el teléfono en el momento en que tocas **Guardar**.

**No me llegan las notificaciones.**
Ve a **Más → Ajustes → Alertas** y toca **Probar una notificación**. Si no llega, revisa **Ajustes del teléfono → Aplicaciones → Mi Cava → Notificaciones** y actívalas.
Algunas marcas, como Xiaomi, Huawei o Samsung, tienen "ahorro de batería" que bloquea los avisos programados. En ese caso pon Mi Cava como **"Sin restricciones"** en la batería.

**El conteo por foto dice "Falta tu clave de API".**
Sigue los pasos de la [sección 2](#2-conteo-por-foto-tu-clave-de-anthropic-y-cuánto-cuesta).

**El conteo por foto dice "Tu cuenta de Anthropic no tiene saldo".**
Entra a console.anthropic.com → **Billing** y agrega crédito.

**¿Puedo usar la app en dos teléfonos al mismo tiempo?**
Cada teléfono tiene su propio inventario y no se sincronizan solos. Para pasar los datos de uno a otro, usa la copia de seguridad.

---

## 8. Para programadores

- **Tecnología:** Expo SDK 57 (React Native 0.86), TypeScript y expo-router.
  Datos en `expo-sqlite`, alertas con `expo-notifications`, cámara y códigos de barras con `expo-camera`, fotos con `expo-image-picker` y `expo-image-manipulator`, la clave en `expo-secure-store`, y el SDK oficial `@anthropic-ai/sdk`.
- **Estructura:**
  - `src/app/` → pantallas (cada archivo es una ruta).
  - `src/logic/` → reglas del negocio, sin interfaz: existencias, movimientos, pedidos, reposición, reportes, respaldo y conteo por IA.
  - `src/db/` → esquema SQLite y conexión. La interfaz `DB` permite probar la lógica con `node:sqlite`.
  - `src/services/` → notificaciones, fotos, archivos, clave de API y llamada a la IA.
  - `tests/` → pruebas automáticas.
- **Comandos:**
  ```
  npm test            # pruebas automáticas
  npm run typecheck   # revisión de tipos
  npx expo start      # servidor de desarrollo (requiere una "development build", no Expo Go, por los módulos nativos)
  ```
- **Base de datos:** `micava.db` guarda los datos reales y `micava-practica.db` los del modo práctica.
  Las existencias tienen `CHECK (cantidad >= 0)` y cada movimiento se guarda en una transacción.
- **`metro.config.js`:** obliga a usar la versión CommonJS de `@anthropic-ai/sdk`, porque la versión ESM tiene importaciones circulares que fallan al cargar en React Native.
