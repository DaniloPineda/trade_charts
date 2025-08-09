import asyncio
import random
import time
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Inicia el simulador de ticks de precios'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando simulador de velas...'))
        asyncio.run(self.start_simulation())

    async def start_simulation(self):
        channel_layer = get_channel_layer()
        price = 150.0
        # This will hold the current candle being built
        current_candle = None
        # We'll send a new candle every 5 seconds for this simulation
        candle_interval_seconds = 5 

        while True:
            now = datetime.utcnow()
            timestamp = int(now.timestamp())

            # Generate a random price move
            price_change = random.uniform(-0.25, 0.25)
            new_price = round(price + price_change, 2)
            
            # If there is no current candle or the interval has passed, start a new one
            if current_candle is None or timestamp >= current_candle['time'] + candle_interval_seconds:
                # If there was a previous candle, send it first
                if current_candle:
                    await channel_layer.group_send('ticker_AAPL', {
                        'type': 'ticker_update',
                        'message': current_candle
                    })
                    print(f"Sent complete candle: {current_candle}")
                
                # Start a new candle
                current_candle = {
                    'time': timestamp,
                    'open': new_price,
                    'high': new_price,
                    'low': new_price,
                    'close': new_price
                }
            else: # Otherwise, update the current candle
                current_candle['high'] = max(current_candle['high'], new_price)
                current_candle['low'] = min(current_candle['low'], new_price)
                current_candle['close'] = new_price

            price = new_price
            await asyncio.sleep(1) # Send a new tick every second