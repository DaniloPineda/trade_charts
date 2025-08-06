# backend/api/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TickerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Obtiene el ticker de la URL, ej: ws/ticks/AAPL/
        self.ticker = self.scope['url_route']['kwargs']['ticker']
        self.room_group_name = f'ticker_{self.ticker}'

        # Unirse al grupo de la sala
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Salir del grupo de la sala
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Esta función se llama cuando el grupo envía un mensaje
    async def ticker_update(self, event):
        # Envía el mensaje al WebSocket
        await self.send(text_data=json.dumps({
            'type': 'ticker.update',
            'payload': event['message']
        }))