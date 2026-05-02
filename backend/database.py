import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Garante que o .env seja lido antes de tentar pegar as variáveis
load_dotenv()

# Configurações do Banco de Dados Microsoft SQL Server
# Ajuste 'localhost' se o nome do seu servidor for diferente (como 'Bruna\\bruna')
SERVER = 'localhost'
DATABASE = 'VenhaJunto'

# String de Conexão Local usando o driver ODBC Driver 17 for SQL Server.
# 'Trusted_Connection=yes' utiliza a autenticação do seu Windows.
LOCAL_DB_URL = "mssql+pyodbc:///?odbc_connect=Driver%3D%7BODBC+Driver+17+for+SQL+Server%7D%3BServer%3Dlocalhost%3BDatabase%3DVenhaJunto%3BTrusted_Connection%3Dyes%3B"

# Tenta ler a variável de ambiente DATABASE_URL (necessário para a AWS).
# Se não encontrar, usa o banco local.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", LOCAL_DB_URL)

# Se for SQLite (na nuvem), precisamos de parâmetros diferentes
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True, connect_args={'timeout': 10})

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
