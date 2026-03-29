import pyodbc
conn_str = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=localhost;"
    "Database=VenhaJunto;"
    "Trusted_Connection=yes;"
)
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, status FROM estabelecimentos")
    rows = cursor.fetchall()
    print(f"Total: {len(rows)}")
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
