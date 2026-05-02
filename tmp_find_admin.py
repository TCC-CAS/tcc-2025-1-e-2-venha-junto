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
    cursor.execute("SELECT id, email, role FROM usuarios WHERE role = 'admin'")
    users = cursor.fetchall()
    if not users:
        print("NENHUM ADMIN ENCONTRADO!")
    else:
        print("ADMINS ENCONTRADOS:")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role}")
    conn.close()
except Exception as e:
    print(f"Erro ao conectar ao banco: {e}")
