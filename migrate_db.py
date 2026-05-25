import sqlite3

def upgrade_database():
    print("Iniciando atualização do banco de dados...")
    conn = sqlite3.connect('backend/vj_database.db')
    cursor = conn.cursor()
    
    try:
        # Verifica se a coluna resposta_admin existe na tabela denuncias
        cursor.execute("PRAGMA table_info(denuncias)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "resposta_admin" not in columns:
            print("Adicionando coluna 'resposta_admin' na tabela 'denuncias'...")
            cursor.execute("ALTER TABLE denuncias ADD COLUMN resposta_admin TEXT")
            print("Coluna adicionada com sucesso!")
        else:
            print("A coluna 'resposta_admin' já existe.")
            
        conn.commit()
        print("Atualização concluída com sucesso!")
        
    except Exception as e:
        print(f"Erro ao atualizar o banco: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade_database()
