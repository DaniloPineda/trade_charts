from django.urls import path
from .views import MarketDataView, SymbolSearchView

urlpatterns = [
    path("market-data", MarketDataView.as_view(), name="market-data"),
    path("symbol-search", SymbolSearchView.as_view(), name="symbol-search"),
]
