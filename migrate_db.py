import sys
import os

# Adiciona o diretório atual ao path para poder importar o backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import engine
from sqlalchemy import text

def upgrade_database():
    print("Iniciando atualização do banco de dados via SQLAlchemy...")
    
    with engine.connect() as conn:
        try:
            # Verifica colunas dependendo do banco (SQLite vs SQL Server)
            if engine.url.drivername.startswith('sqlite'):
                result = conn.execute(text("PRAGMA table_info(denuncias)"))
                columns = [row[1] for row in result.fetchall()]
            else:
                result = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'denuncias'"))
                columns = [row[0] for row in result.fetchall()]
            
            if "resposta_admin" not in columns:
                print("Adicionando coluna 'resposta_admin' na tabela 'denuncias'...")
                conn.execute(text("ALTER TABLE denuncias ADD COLUMN resposta_admin TEXT"))
                conn.commit()
                print("Coluna adicionada com sucesso!")
            else:
                print("A coluna 'resposta_admin' já existe.")
                
            print("Atualização concluída com sucesso!")
            
        except Exception as e:
            print(f"Erro ao atualizar o banco: {e}")

if __name__ == "__main__":
    upgrade_database()
