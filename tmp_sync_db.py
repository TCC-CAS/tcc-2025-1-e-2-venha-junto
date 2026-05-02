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
    
    # Adicionar colunas se não existirem
    columns_to_add = [
        ("ai_status", "NVARCHAR(30) DEFAULT 'PENDING'"),
        ("ai_score", "FLOAT DEFAULT 0.0"),
        ("ai_justification", "NVARCHAR(MAX)")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE estabelecimentos ADD {col_name} {col_type}")
            print(f"Coluna {col_name} adicionada.")
        except Exception as e:
            if "already exists" in str(e) or "existem" in str(e).lower():
                print(f"Coluna {col_name} já existe.")
            else:
                print(f"Erro ao adicionar {col_name}: {e}")
    
    conn.commit()
    conn.close()
    print("Sincronização do banco finalizada.")
except Exception as e:
    print(f"Erro ao conectar ao banco: {e}")
