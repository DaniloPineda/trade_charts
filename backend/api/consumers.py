import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class TickerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            logger.info("--- WebSocket CONNECTING... ---")
            self.ticker = self.scope['url_route']['kwargs']['ticker']
            self.room_group_name = f'ticker_{self.ticker}'
            logger.info(f"Ticker: {self.ticker}, Group: {self.room_group_name}")

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            logger.info("--- WebSocket CONNECTED successfully ---")

        except Exception as e:
            logger.error(f"!!! WebSocket connect FAILED: {e}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        logger.warning(f"--- WebSocket DISCONNECTED, code: {close_code} ---")
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def ticker_update(self, event):
        logger.info(f"Sending message to group {self.room_group_name}")
        await self.send(text_data=json.dumps({
            'type': 'ticker.update',
            'payload': event['message']
        }))