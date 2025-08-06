# backend/api/management/commands/start_ticker.py
import asyncio
import random
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
import time

class Command(BaseCommand):
    help = 'Inicia el simulador de ticks de precios'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando simulador de ticks...'))
        asyncio.run(self.start_simulation())

    async def start_simulation(self):
        channel_layer = get_channel_layer()
        last_price = 150.00

        while True:
            # Simula un nuevo precio
            change = random.uniform(-0.15, 0.15)
            last_price += change

            # Prepara el dato del tick
            tick_data = {
                'time': int(time.time()),
                'close': round(last_price, 2)
            }

            # Envía el mensaje al grupo del ticker 'AAPL'
            await channel_layer.group_send(
                'ticker_AAPL',
                {
                    'type': 'ticker_update',
                    'message': tick_data
                }
            )

            # Espera un tiempo aleatorio entre 0.5 y 2 segundos
            await asyncio.sleep(random.uniform(0.5, 2))