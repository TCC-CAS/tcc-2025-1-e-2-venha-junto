import sqlite3
import os

db_path = "backend/vj_database.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role FROM usuarios")
    users = cursor.fetchall()
    print("USUÁRIOS NO BANCO:")
    for u in users:
        print(f"ID: {u[0]} | Email: {u[1]} | Role: {u[2]}")
    conn.close()
else:
    print(f"Banco não encontrado em: {db_path}")
