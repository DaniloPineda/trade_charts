from django.urls import path
from .views import MarketDataView, SymbolSearchView, ReportsView

urlpatterns = [
    path("market-data", MarketDataView.as_view(), name="market-data"),
    path("symbol-search", SymbolSearchView.as_view(), name="symbol-search"),
    path('reports/', ReportsView.as_view(), name='reports'), 
]
