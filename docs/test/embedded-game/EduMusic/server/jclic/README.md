# JClic endpoint (EduMúsic)

Este endpoint recibe los resultados JClic (XML del reporter) y los guarda en `server/jclic/data/jclic-results.json`.

## Estructura

- `beans.php`: endpoint compatible con el reporter JClic.
- `data/jclic-results.json`: histórico de resultados recibidos.

## Cómo usarlo

1. Sube la carpeta `server/jclic` a tu VPS (por ejemplo, `/var/www/edumusic/server/jclic`).
2. Asegúrate de que PHP está activo en el servidor.
3. Configura JClic para enviar los resultados a:

```
https://tu-dominio.com/server/jclic/beans.php
```

El reporter de JClic usa POST con XML. Este endpoint lo procesa y lo guarda.

## Probar rápidamente

Puedes enviar un XML de ejemplo con `curl`:

```
curl -X POST https://tu-dominio.com/server/jclic/beans.php \
  -H "Content-Type: text/xml" \
  -d '<bean id="multiple"><bean id="add activity"><param name="num" value="0"/><param name="session" value="test_123"/><activity name="demo" start="123" time="3212" solved="true" score="5" minActions="1" actions="11"/></bean></bean>'
```

## Siguiente paso (integración con rankings)

Cuando tengas datos en `data/jclic-results.json`, podemos:
- mapearlos al formato de `score-service.js`,
- y guardarlos en Firebase para que aparezcan en los rankings.
