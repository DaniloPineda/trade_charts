import json
import os
import random
from datetime import datetime, timedelta

def generate_candlestick_data(days=252, start_price=150.0):
    """
    Genera datos de velas simulados para un número determinado de días.
    """
    # Empezamos desde hace 'days' días atrás
    current_time = datetime.now() - timedelta(days=days)
    price = start_price
    data = []

    for _ in range(days):
        # Avanzamos un día (saltando fines de semana)
        current_time += timedelta(days=1)
        if current_time.weekday() >= 5: # 5 = Sábado, 6 = Domingo
            continue

        open_price = round(price + random.uniform(-0.5, 0.5), 2)
        
        # Simula la volatilidad del día
        volatility = random.uniform(0.01, 0.04)
        
        # El precio de cierre se mueve en una dirección general con algo de ruido
        price_change = random.gauss(0.0005, 0.015)
        close_price = round(open_price * (1 + price_change), 2)
        
        # El 'high' y 'low' se basan en el open y close
        high_price = round(max(open_price, close_price) * (1 + volatility), 2)
        low_price = round(min(open_price, close_price) * (1 - volatility), 2)
        
        # Aseguramos que los valores sean lógicos
        if open_price > close_price:
            high_price = max(high_price, open_price)
            low_price = min(low_price, close_price)
        else:
            high_price = max(high_price, close_price)
            low_price = min(low_price, open_price)

        # Convertimos la fecha a timestamp UTC, como lo espera la librería de gráficos
        # Nos aseguramos de que sea a medianoche para representar datos diarios
        timestamp = int(current_time.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())

        data.append({
            "time": timestamp,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price
        })
        
        # El precio del día siguiente empieza cerca del cierre de hoy
        price = close_price

    return data

def save_to_json(data, path):
    """
    Guarda los datos generados en un archivo JSON.
    """
    # Asegura que la ruta de destino exista
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Datos generados exitosamente en: {path}")

# --- Script Principal ---
if __name__ == "__main__":
    print("Generando datos de velas simulados...")
    
    # Generamos datos para 252 días (aprox. 1 año de trading)
    # con un precio inicial de 175
    candlestick_data = generate_candlestick_data(days=252, start_price=175.0)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Definimos dónde se guardará el archivo JSON
    output_path = os.path.join(script_dir, 'mock_data.json')
    
    # Guardamos los datos
    save_to_json(candlestick_data, output_path)