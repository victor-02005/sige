# SIGE

SIGE, Sistema Integral de Gestión Educativa, es una aplicación web para la gestión académica y financiera de colegios privados. El frontend reúne las tareas de secretaría, tesorería y administración.

El [frontend](frontend/) usa React, TypeScript en modo estricto, Vite, React Router, Tailwind CSS y CSS. El [backend](backend/) conserva su base en FastAPI. Los módulos empiezan vacíos y las cuatro cuentas de acceso siguen disponibles. Al recargar se reinician la sesión y los registros agregados.

## Ejecutar en local

Se requiere Node.js 20.19 o posterior dentro de la rama 20, o Node.js 22.12 o posterior. Desde la raíz del repositorio que contiene `frontend/` y `backend/`:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Abre [SIGE en Chrome](http://127.0.0.1:5187/). Si abriste la carpeta exterior que contiene el repositorio `sige/`, usa `cd .\sige\frontend` en el primer paso. En PowerShell, `npm.cmd` permite ejecutar npm cuando la política del equipo bloquea `npm.ps1`. En macOS y Linux usa `npm`.

Dentro de `frontend/`, ejecuta `npm.cmd run typecheck` para comprobar TypeScript o `npm.cmd run build` para comprobar tipos y generar la compilación en `dist/`. `npm.cmd run preview` sirve esa compilación en local.

## Cuentas de acceso

La portada abre el [formulario de inicio de sesión](http://127.0.0.1:5187/acceso). Cada correo tiene una clave obligatoria. El formulario también muestra estas parejas en **Correos y claves de prueba**.

| Perfil | Correo de prueba | Clave de prueba | Acceso |
|---|---|---|---|
| Secretaría | `secretaria@example.com` | `SigeSec2027!` | Estudiantes, acudientes, configuración académica, matrículas y estadísticas académicas. |
| Tesorería | `tesoreria@example.com` | `SigeTes2027!` | Consulta de estudiantes y acudientes, cobros, cartera, pagos, recibos, finanzas y estadísticas financieras. |
| Administración | `administracion@example.com` | `SigeAdm2027!` | Módulos académicos y financieros, reversión de pagos, institución, usuarios y auditoría. |
| Acceso completo | `completo@example.com` | `SigeTotal2027!` | Todos los módulos y acciones disponibles. |

**Cerrar sesión** devuelve a la portada. **Cambiar cuenta** abre el formulario de ingreso. En **Administración → Usuarios y roles → Agregar usuario** puedes crear una cuenta local con correo, clave, rol y estado. Las cuentas activas pueden iniciar sesión en la misma pestaña hasta que se recargue.

## Etapas implementadas

| Etapa | Resultado |
|---|---|
| 1. Tareas y navegación | Recorridos de secretaría, tesorería y administración definidos alrededor de las tareas frecuentes. |
| 2. Base técnica | Proyecto en `frontend/` con dependencias, configuración de Vite y compilación con TypeScript estricto. |
| 3. Diseño visual | Paleta del plan y componentes para campos, tablas, botones y mensajes. |
| 4. Estructura | Encabezado, rutas y menú adaptado a escritorio y móvil, con navegación por teclado. |
| 5. Inicio y acceso | Accesos rápidos según el perfil y formulario de ingreso. |
| 6. Configuración académica | Creación de años escolares y grupos, con filtros por año y grado desde Prejardín hasta Undécimo. |
| 7. Estudiantes | Listado paginado, búsqueda por nombre o código, fichas, alta, edición y archivo con confirmación. |
| 8. Acudientes | Directorio y fichas, creación o vínculo desde el estudiante y asignación de un responsable de pago por estudiante. |
| 9. Matrículas | Búsqueda o alta del estudiante, selección de año, grado y grupo, revisión e historial. Cada matrícula requiere un acudiente vinculado y se admite una matrícula por estudiante y año. |
| 10. Cobros y cartera | Conceptos con importe y vigencia, generación de cargos y filtros por estudiante, vencimiento y estado. |
| 11. Pagos y recibos | Abonos parciales o completos a un cargo, recibo interno imprimible y reversión con motivo que restaura el saldo y conserva el historial. |
| 12. Finanzas y tablero | Ingresos, egresos y transferencias entre Caja y Banco, totales por mes y flujo neto. Los pagos vigentes se suman a los ingresos. |
| 13. Administración y auditoría | Edición de institución y sede, gestión de usuarios e historial de operaciones filtrable por perfil. |
| 14. Ajustes de interfaz | Navegación entre perfiles, uso móvil y por teclado, búsqueda y paginación. |

## Cambios posteriores

- Se añadió una portada pública y se sustituyó la elección directa de perfil por un formulario con correo y clave. Se incorporó el perfil **Acceso completo**.
- El código de estudiante se genera al guardar y se conserva al editar. El grado y el año escolar indicados en la ficha son opcionales. La matrícula se registra en su módulo.
- Inicio incorpora gráficas financieras. **Estadísticas** reúne actividad académica, cobros, cartera, pagos y finanzas según los permisos del perfil.
- El comparador admite dos años y hasta dos indicadores del área seleccionada. Agrupa las cifras académicas por año escolar y las financieras por mes. Los periodos sin registros aparecen en cero.
- Cada gráfica permite elegir líneas con puntos, solo puntos o barras. Las líneas con puntos son la vista predeterminada y **Ver datos de la gráfica** muestra los valores exactos.
- Los módulos empiezan vacíos. Las cuentas iniciales permiten ingresar y crear registros desde cero.

## Uso de los módulos

1. Entra como **Secretaría**. Crea un año escolar y un grupo. Crea un estudiante, vincula un acudiente y registra una matrícula desde la ficha.
2. Cambia a **Tesorería** para configurar un concepto y generar un cargo. Abre el cargo en **Cartera** para registrar un abono y consultar su recibo.
3. Si debes revertir un pago, abre su detalle con **Administración** o **Acceso completo**. Registra el motivo y consulta la operación en **Auditoría**.
4. Abre **Estadísticas**, elige dos años y cambia el tipo de gráfica. Los datos de la comparación deben conservarse al cambiar la presentación.

5. En **Usuarios y roles**, puedes crear una cuenta con el rol y estado requeridos.

## Alcance

El plan general se definió en **SIGE-Documentacion-y-Planes.pdf**. Este README documenta la implementación del frontend. La integración con la API y la base de datos, la autenticación real, los permisos del servidor y la persistencia quedan para una etapa posterior.
