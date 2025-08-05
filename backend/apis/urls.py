from django.urls import path
from .views import MarketDataView

urlpatterns = [
    path('market-data', MarketDataView.as_view(), name='market-data'),
]