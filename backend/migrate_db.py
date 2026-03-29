from sqlalchemy import create_engine, text
import random
from database import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        print("--- INICIANDO MIGRAÇÃO (MS SQL SERVER) ---")
        
        # 1. Adicionar colunas se não existirem
        cols_to_add = [
            ("views_count", "INT DEFAULT 0"),
            ("clicks_count", "INT DEFAULT 0"),
            ("latitude", "FLOAT"),
            ("longitude", "FLOAT")
        ]
        
        for col_name, col_type in cols_to_add:
            try:
                # MS SQL syntax for adding column
                conn.execute(text(f"ALTER TABLE estabelecimentos ADD {col_name} {col_type}"))
                print(f"✅ Coluna {col_name} adicionada.")
            except Exception as e:
                if "already exists" in str(e).lower() or "Duplicate column name" in str(e) or "42S21" in str(e):
                    print(f"⚠️ Coluna {col_name} já existe.")
                else:
                    print(f"❌ Erro ao adicionar {col_name}: {e}")
        
        conn.commit()

        # 2. Popular dados fictícios
        result = conn.execute(text("SELECT id FROM estabelecimentos"))
        estab_ids = [row[0] for row in result]
        
        print(f"Populando {len(estab_ids)} estabelecimentos...")
        for eid in estab_ids:
            # Centro de SP: Lat ~ -23.5505, Long ~ -46.6333
            lat = -23.5505 + random.uniform(-0.06, 0.06)
            lng = -46.6333 + random.uniform(-0.06, 0.06)
            views = random.randint(200, 600)
            clicks = random.randint(30, 120)
            
            conn.execute(
                text("UPDATE estabelecimentos SET latitude=:lat, longitude=:lng, views_count=:v, clicks_count=:c WHERE id=:id"),
                {"lat": round(lat, 5), "lng": round(lng, 5), "v": views, "c": clicks, "id": eid}
            )
        
        conn.commit()
        print("🚀 Migração concluída com sucesso no SQL Server!")

if __name__ == "__main__":
    migrate()
