from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Configurações do Banco de Dados Microsoft SQL Server
# Ajuste 'localhost' se o nome do seu servidor for diferente (como 'Bruna\\bruna')
SERVER = 'localhost'
DATABASE = 'VenhaJunto'

# String de Conexão usando o driver ODBC Driver 17 for SQL Server.
# 'Trusted_Connection=yes' utiliza a autenticação do seu Windows.
SQLALCHEMY_DATABASE_URL = (
    f"mssql+pyodbc://@{SERVER}/{DATABASE}"
    f"?driver=ODBC+Driver+17+for+SQL+Server&Trusted_Connection=yes"
)

# Cria o "Engine" que gerencia a comunicação real com o banco de dados
engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)

# Sesssão para conversar com o banco
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para todas as nossas Classes (Models)
Base = declarative_base()

# Função auxiliar para pegar a sessão do banco em cada requisição
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
