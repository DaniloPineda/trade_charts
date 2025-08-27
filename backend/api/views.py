import math
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
import os
import yfinance as yf
import pandas as pd
from datetime import datetime
import locale

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
        
MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

def format_date_es(dt_object):
    """Formatea una fecha al estilo 'Julio 20 - 2025'."""
    if not isinstance(dt_object, (datetime, pd.Timestamp)):
        return None
    month_name = MESES_ES.get(dt_object.month, '')
    return f"{month_name} {dt_object.day} - {dt_object.year}"

def to_float_or_none(value):
    """Convierte un valor a float de forma segura, devolviendo None si falla o es NaN."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

class ReportsView(APIView):
    # Lista de compañías que generan reportes de ganancias
    STOCK_LIST = ['NVDA', 'AAPL', 'META', 'AMZN', 'TSLA', 'NFLX', 'PLTR', 'BAC', 'CVX', 'XOM']

    def get(self, request):
        all_reports_data = []
        hoy = datetime.now()

        for ticker_symbol in self.STOCK_LIST:
            try:
                print(f"Obteniendo datos de reportes para {ticker_symbol}...")
                ticker = yf.Ticker(ticker_symbol)

                if not isinstance(ticker.info, dict) or 'symbol' not in ticker.info:
                    print(f" --> No se pudo obtener información básica para {ticker_symbol}. Saltando.")
                    continue
                
                upcoming_report_date_obj = None
                
                # Intento #1: Usar ticker.calendar
                calendar = ticker.calendar
                if isinstance(calendar, pd.DataFrame) and not calendar.empty and 'Earnings Date' in calendar.columns:
                    earnings_date = calendar['Earnings Date'][0]
                    if isinstance(earnings_date, pd.Timestamp):
                        upcoming_report_date_obj = earnings_date.to_pydatetime()
                
                # Intento #2: Usar ticker.info como respaldo
                if not upcoming_report_date_obj and 'earningsTimestamp' in ticker.info:
                    timestamp = ticker.info['earningsTimestamp']
                    if timestamp:
                        upcoming_report_date_obj = datetime.fromtimestamp(timestamp)
                
                upcoming_report_str = None
                if upcoming_report_date_obj and upcoming_report_date_obj > hoy:
                    upcoming_report_str = format_date_es(upcoming_report_date_obj)

                # Obtener y formatear el historial de reportes
                earnings_history = ticker.earnings_dates
                past_reports = []
                if isinstance(earnings_history, pd.DataFrame) and not earnings_history.empty:
                    # Nos aseguramos de que las columnas clave existan antes de dropear NAs
                    required_cols = ['Reported EPS', 'EPS Estimate']
                    if all(col in earnings_history.columns for col in required_cols):
                        history_df = earnings_history.dropna(subset=required_cols, how='any').sort_index(ascending=False)
                        for date, row in history_df.head(10).iterrows():
                            eps_estimate = to_float_or_none(row.get('EPS Estimate'))
                            eps_actual = to_float_or_none(row.get('Reported EPS'))
                            surprise_percent = None
                            
                            if eps_estimate is not None and eps_actual is not None and eps_estimate != 0:
                                surprise_percent = ((eps_actual - eps_estimate) / abs(eps_estimate)) * 100

                            past_reports.append({
                                'date': format_date_es(date.to_pydatetime()),
                                'eps_estimate': eps_estimate,
                                'eps_actual': eps_actual,
                                'surprise_percent': surprise_percent
                            })
                
                if upcoming_report_str or past_reports:
                    all_reports_data.append({
                        'symbol': ticker_symbol,
                        'upcoming_report_date': upcoming_report_str,
                        'last_report': past_reports[0] if past_reports else None,
                        'previous_reports': past_reports[1:] if len(past_reports) > 1 else []
                    })

            except Exception as e:
                print(f"Error obteniendo datos para {ticker_symbol}: {e}")
        
        # Separamos los datos para la respuesta final
        upcoming_final = [report for report in all_reports_data if report['upcoming_report_date']]
        
        # Para ordenar, necesitamos convertir la fecha de string a objeto datetime de nuevo
        def sort_key_date(item):
            try:
                # El locale debe estar configurado para que '%B' funcione con nombres en español
                locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
                return datetime.strptime(item['upcoming_report_date'], '%B %d - %Y')
            except (ValueError, locale.Error):
                # Fallback por si el locale o el formato fallan
                return datetime.max

        upcoming_final.sort(key=sort_key_date)
        
        return Response({
            'upcoming_reports': upcoming_final,
            'past_reports': all_reports_data
        })