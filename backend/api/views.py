import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
import os
import yfinance as yf
import pandas as pd
import time

FINNHUB_API_TOKEN = os.environ.get(
    "FINNHUB_API_TOKEN", "d292e3pr01qhoen9cd70d292e3pr01qhoen9cd7g"
)

def get_yfinance_params(period):
    """
    Translates our simple period string into the parameters
    that the yfinance library expects.
    """
    if period == '1m':
        return {'period': '7d', 'interval': '1m'}
    elif period == '15m':
        return {'period': '60d', 'interval': '15m'}
    elif period == '1h':
        return {'period': '730d', 'interval': '1h'}
    elif period == '1d':
        return {'period': '5y', 'interval': '1d'}
    elif period == '1w':
        return {'period': 'max', 'interval': '1wk'}
    else:
        # Default to 1 day if the period is unknown
        return {'period': '5y', 'interval': '1d'}

class MarketDataView(APIView):
    def get(self, request):
        ticker = request.query_params.get("ticker", "SPY").upper()
        period_str = request.query_params.get('period', '1d')
        
        # Get the correct parameters for the yfinance call
        yf_params = get_yfinance_params(period_str)

        print(f"Fetching data for Ticker: {ticker}, Period: {period_str}...")

        try:
            data = yf.download(
                ticker,
                period=yf_params['period'],
                interval=yf_params['interval'],
            )

            if data.empty:
                return Response(
                    {"error": f"No data found for ticker: {ticker} with specified period."},
                    status=404
                )
            
            # --- Data Processing (same as your download script) ---
            data.reset_index(inplace=True)

            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)

            data.columns = data.columns.str.lower()

            if 'datetime' in data.columns:
                data['time'] = pd.to_datetime(data['datetime']).apply(
                    lambda d: int(d.timestamp())
                )
            elif 'date' in data.columns:
                data['time'] = pd.to_datetime(data['date']).apply(
                    lambda d: d.strftime('%Y-%m-%d')
                )

            # for col in ['open', 'high', 'low', 'close']:
            #     data[col] = pd.to_numeric(data[col], errors='coerce')
            # data.dropna(inplace=True)

            historical_data = data[['time', 'open', 'high', 'low', 'close']]
            
            return Response(historical_data.to_dict('records'))

        except Exception as e:
            print(f"ERROR: An error occurred while fetching from yfinance: {e}")
            return Response({"error": "An unexpected server error occurred."}, status=500)

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
