import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
import time
import os
import random
from datetime import datetime, timedelta

FINNHUB_API_TOKEN = os.environ.get(
    "FINNHUB_API_TOKEN", "d292e3pr01qhoen9cd70d292e3pr01qhoen9cd7g"
)

# --- Generador de Datos Dinámico (reemplaza tu generador estático) ---
def generate_dynamic_mock_data(ticker, period='1d'):
    now = datetime.utcnow()
    data = []
    base_price = 150.0
    
    # Define la cantidad de velas y el intervalo de tiempo
    if period == '1m':
        points = 1440  # 4 velas por hora, 24 horas
        delta = timedelta(minutes=1)
    elif period == '15m':
        points = 96  # 4 velas por hora, 24 horas
        delta = timedelta(minutes=15)
    elif period == '1h':
        points = 72  # 72 horas (3 días)
        delta = timedelta(hours=1)
    elif period == '1d':
        points = 252 # 1 año de días de trading
        delta = timedelta(days=1)
    elif period == '1w':
        points = 156 # 3 años de datos semanales
        delta = timedelta(weeks=1)
    else: # Por defecto, si el periodo es '1m', '3m', '1y', etc.
        points = 252
        delta = timedelta(days=1)

    current_time = now - (points * delta)
    price = base_price

    for _ in range(points):
        # Avanza el tiempo, saltando fines de semana para datos diarios y semanales
        current_time += delta
        if delta >= timedelta(days=1) and current_time.weekday() >= 5:
            continue

        open_price = round(price + random.uniform(-0.5, 0.5), 2)
        volatility = random.uniform(0.01, 0.04)
        price_change = random.gauss(0.0005, 0.015)
        close_price = round(open_price * (1 + price_change), 2)
        
        high_price = round(max(open_price, close_price) * (1 + volatility), 2)
        low_price = round(min(open_price, close_price) * (1 - volatility), 2)

        timestamp = int(current_time.replace(microsecond=0).timestamp())

        data.append({
            "time": timestamp,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price
        })
        price = close_price
        
    return data
class MarketDataView(APIView):
    def get(self, request):
        ticker = request.query_params.get("ticker")
        period = request.query_params.get('period')

        if not ticker:
            return Response({"error": "Ticker symbol is required"}, status=400)

        try:
            # Llama a la nueva función para generar datos dinámicamente
            mock_data = generate_dynamic_mock_data(ticker, period)
            return Response(mock_data)

            end_time = int(time.time())
            start_time = end_time - (90 * 24 * 60 * 60)  # Últimos 90 días

            # Endpoint gratuito: quote en lugar de candle
            url = "https://finnhub.io/api/v1/quote"

            # ----- CAMBIO IMPORTANTE -----
            # 1. El token ya NO va en los parámetros (params)
            params = {
                "symbol": ticker,
            }

            # 2. El token ahora se envía en los encabezados (headers)
            headers = {"X-Finnhub-Token": FINNHUB_API_TOKEN}

            # Debug: Imprimir información para troubleshooting
            print(f"URL: {url}")
            print(f"Params: {params}")
            print(f"Headers: {headers}")
            print(f"Token: {FINNHUB_API_TOKEN}")

            # 3. La petición ahora incluye los headers
            response = requests.get(url, params=params, headers=headers)

            # Debug: Imprimir respuesta para troubleshooting
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            print(f"Response content: {response.text[:500]}...")

            # Esta línea lanzará un error para códigos 4xx o 5xx, como el 403
            response.raise_for_status()

            data = response.json()

            # El endpoint quote devuelve datos diferentes
            formatted_data = {
                "symbol": data.get("symbol", ticker),
                "current_price": data.get("c", 0),
                "change": data.get("d", 0),
                "percent_change": data.get("dp", 0),
                "high_price": data.get("h", 0),
                "low_price": data.get("l", 0),
                "open_price": data.get("o", 0),
                "previous_close": data.get("pc", 0),
                "timestamp": data.get("t", 0),
            }

            return Response(formatted_data)

        except requests.exceptions.RequestException as e:
            # Intentar con token como parámetro de query como fallback
            print(f"ERROR AL LLAMAR A LA API DE FINNHUB CON HEADER: {e}")
            print("Intentando con token como parámetro de query...")

            try:
                params_with_token = {
                    "symbol": ticker,
                    "token": FINNHUB_API_TOKEN,  # Token como parámetro
                }

                response = requests.get(url, params=params_with_token)
                response.raise_for_status()

                data = response.json()

                # El endpoint quote devuelve datos diferentes
                formatted_data = {
                    "symbol": data.get("symbol", ticker),
                    "current_price": data.get("c", 0),
                    "change": data.get("d", 0),
                    "percent_change": data.get("dp", 0),
                    "high_price": data.get("h", 0),
                    "low_price": data.get("l", 0),
                    "open_price": data.get("o", 0),
                    "previous_close": data.get("pc", 0),
                    "timestamp": data.get("t", 0),
                }

                return Response(formatted_data)

            except requests.exceptions.RequestException as e2:
                print(f"ERROR AL LLAMAR A LA API DE FINNHUB CON PARÁMETRO: {e2}")
                return Response(
                    {"error": f"Failed to fetch data from Finnhub: {e2}"}, status=500
                )


# VISTA NUEVA PARA BÚSQUEDA DE SÍMBOLOS
class SymbolSearchView(APIView):
    def get(self, request):
        # 1. Obtener el término de búsqueda de la URL (?q=...)
        query = request.query_params.get("q", "")

        # 2. Validar que la búsqueda tiene al menos 2 caracteres
        if len(query) < 2:
            # Devolvemos una lista vacía para no hacer llamadas innecesarias a la API
            return Response({"result": []})

        print(f"Buscando símbolos para: '{query}'")

        try:
            url = "https://finnhub.io/api/v1/search"
            params = {"q": query}
            headers = {"X-Finnhub-Token": FINNHUB_API_TOKEN}

            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()  # Lanza un error para códigos 4xx/5xx

            # La API de Finnhub devuelve un objeto con una clave 'result' que contiene la lista
            data = response.json()

            # Filtramos para devolver solo los símbolos de acciones comunes para limpiar los resultados
            filtered_results = [
                item
                for item in data.get("result", [])
                if "." not in item.get("symbol", "")
                and item.get("type") != "Crypto"
                and item.get("symbol") != "APP"
            ]

            return Response(
                {"count": len(filtered_results), "result": filtered_results}
            )

        except requests.exceptions.RequestException as e:
            print(f"ERROR al buscar en Finnhub: {e}")
            # Devolvemos un error 500 si la llamada a Finnhub falla
            return Response(
                {"error": f"Error al contactar la API de Finnhub: {e}"}, status=500
            )
