import pyodbc
import sys

try:
    conn_str = 'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=VenhaJunto;Trusted_Connection=yes;'
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, nome, views_count, clicks_count FROM estabelecimentos")
    rows = cursor.fetchall()
    
    print("--- DADOS DO BANCO (SQL SERVER) ---")
    if not rows:
        print("Nenhum estabelecimento encontrado.")
    for row in rows:
        print(f"ID: {row.id} | Nome: {row.nome} | Views: {row.views_count} | Clicks: {row.clicks_count}")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"ERRO: {e}")
