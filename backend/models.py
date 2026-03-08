from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    telefone = Column(String(20), nullable=True)
    senha_hash = Column(String(255), nullable=False)
    
    # Marcador de verificação do usuário ou status ativo
    is_active = Column(Boolean, default=True)

class Parceiro(Base):
    __tablename__ = "parceiros"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    telefone = Column(String(20), nullable=True)
    senha_hash = Column(String(255), nullable=False)
    
    # Parceiros também possuem status ativo
    is_active = Column(Boolean, default=True)

