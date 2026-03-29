import sqlalchemy as sa
from database import engine

def migrate():
    # Conecta ao banco de dados e executa os comandos de ALTER TABLE
    with engine.connect() as conn:
        print("Iniciando migração do banco de dados...")
        
        # Colunas para 'estabelecimentos' (se não existirem)
        check_cols_estab = [
            ("status", "NVARCHAR(30) DEFAULT 'PENDING_REVIEW'"),
            ("created_at", "DATETIME DEFAULT GETUTCDATE()"),
            ("cnpj_cpf", "NVARCHAR(20) NULL")
        ]
        
        for col, definition in check_cols_estab:
            try:
                print(f"Adicionando coluna {col} à tabela estabelecimentos...")
                conn.execute(sa.text(f"ALTER TABLE estabelecimentos ADD {col} {definition}"))
                conn.commit()
                print(f"Coluna {col} adicionada com sucesso.")
            except Exception as e:
                if "already exists" in str(e).lower() or "207" in str(e) or "column" in str(e).lower():
                     print(f"Nota: Coluna {col} possivelmente já existe ou erro ignorado: {e}")
                else:
                    print(f"Erro ao adicionar {col}: {e}")

        # Colunas para 'usuarios'
        try:
            print("Adicionando coluna role à tabela usuarios...")
            conn.execute(sa.text("ALTER TABLE usuarios ADD role NVARCHAR(20) DEFAULT 'user'"))
            conn.commit()
            print("Coluna role adicionada com sucesso.")
        except Exception as e:
             print(f"Nota: Coluna role possivelmente já existe ou erro ignorado: {e}")

        print("Migração concluída.")

if __name__ == "__main__":
    migrate()
