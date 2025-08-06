# backend/api/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/ticks/(?P<ticker>\w+)/$', consumers.TickerConsumer.as_asgi()),
]