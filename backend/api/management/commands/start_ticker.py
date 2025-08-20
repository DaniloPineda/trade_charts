import asyncio
import os
import random
import time
import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer


class Command(BaseCommand):
    help = 'Inicia un simulador de mercado realista basado en datos históricos de ticker seleccionado.'

    def handle(self, *args, **options):
        ticker = os.environ.get("TICKER_SYMBOL", "SPY")
        self.stdout.write(self.style.SUCCESS('Iniciando simulador de mercado realista...'))
        asyncio.run(self.start_simulation(ticker))

    async def start_simulation(self, ticker: str):
        channel_layer = get_channel_layer()

        while True:  # Loop infinito de simulación
            self.stdout.write(self.style.HTTP_INFO(f'Descargando datos históricos de {ticker} (último año)...'))

            # 1. Descargar datos históricos reales de ticker para el último año
            spy_data = yf.download(ticker, period='1y', interval='1d')

            if spy_data.empty:
                self.stdout.write(self.style.ERROR('No se pudieron descargar los datos. Reintentando en 30 segundos...'))
                await asyncio.sleep(30)
                continue

            # 2. Preparar los datos
            spy_data.reset_index(inplace=True)

            # Aplanar columnas si es MultiIndex
            if isinstance(spy_data.columns, pd.MultiIndex):
                spy_data.columns = spy_data.columns.get_level_values(0)

            # Pasar nombres a minúsculas
            spy_data.columns = spy_data.columns.str.lower()

            # Asegurar numéricos en OHLC
            for col in ['open', 'high', 'low', 'close']:
                if col in spy_data.columns:
                    spy_data[col] = pd.to_numeric(spy_data[col], errors='coerce')

            # Convertir fecha a timestamp (UTC en segundos)
            spy_data['timestamp'] = spy_data['date'].apply(lambda date: int(time.mktime(date.timetuple())))

            self.stdout.write(self.style.SUCCESS(f'Datos descargados. Iniciando replay de {len(spy_data)} velas...'))

            # 3. Iterar sobre los datos históricos y enviarlos
            for _, row in spy_data.iterrows():
                # Simular "jitter" sobre el precio de cierre
                jitter = random.uniform(-0.0005, 0.0005)
                live_close_price = round(row['close'] * (1 + jitter), 2)

                # Construir objeto de la vela
                candle_data = {
                    'time': row['timestamp'],
                    'open': round(row['open'], 2),
                    'high': round(max(row['high'], live_close_price), 2),
                    'low': round(min(row['low'], live_close_price), 2),
                    'close': live_close_price,
                    'volume': int(row['volume']) if 'volume' in row else 0
                }

                # Enviar al grupo del ticker
                await channel_layer.group_send(
                    f'ticker_{ticker}',
                    {
                        'type': 'ticker_update',
                        'message': candle_data
                    }
                )

                #print(f"Sent candle: {candle_data}")

                # Esperar 1 segundo antes de la siguiente vela
                await asyncio.sleep(1)

            self.stdout.write(self.style.WARNING('Replay del año completado. Reiniciando...'))
