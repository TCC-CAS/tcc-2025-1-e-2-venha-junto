from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, Float
from datetime import datetime
from sqlalchemy.orm import relationship
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
    role = Column(String(20), default="user") # 'user' ou 'admin'

class Parceiro(Base):
    __tablename__ = "parceiros"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    telefone = Column(String(20), nullable=True)
    senha_hash = Column(String(255), nullable=False)
    
    # Parceiros também possuem status ativo
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    estabelecimentos = relationship("Estabelecimento", back_populates="parceiro")

class Estabelecimento(Base):
    __tablename__ = "estabelecimentos"

    id = Column(Integer, primary_key=True, index=True)
    parceiro_id = Column(Integer, ForeignKey("parceiros.id"), nullable=False)
    
    # Passo 1: Responsável
    nome_responsavel = Column(String(100), nullable=False)
    email_responsavel = Column(String(100), nullable=False)
    telefone_responsavel = Column(String(20), nullable=True)
    
    # Passo 2: Estabelecimento (Dados base)
    nome = Column(String(150), nullable=False)
    tipo = Column(String(50), nullable=False)
    descricao = Column(Text, nullable=False)
    
    # Passo 2: Endereço
    cep = Column(String(20), nullable=False)
    endereco = Column(String(255), nullable=False)
    numero_apto = Column(String(50), nullable=True)
    bairro = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=False)
    estado = Column(String(50), nullable=False)
    mostrar_mapa = Column(Boolean, default=False)
    
    # Contatos locais
    telefone_local = Column(String(20), nullable=True)
    whatsapp_local = Column(String(20), nullable=True)
    email_local = Column(String(100), nullable=True)
    site_local = Column(String(150), nullable=True)
    horario_funcionamento = Column(String(255), nullable=True)
    
    # Campo para Geolocalização Dinâmica
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Campo para Métricas do Painel Analítico
    views_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    
    # Passo 3: Fotos & Acesso
    recursos_acessibilidade = Column(Text, nullable=True) # Como string de CSV ou JSON simulado
    
    # Passo 4: Plano
    plano_escolhido = Column(String(50), nullable=False)
    
    # Campo para Fotos
    foto_perfil = Column(String(255), nullable=True)
    fotos_galeria = Column(Text, nullable=True) # Lista de fotos separadas por vírgula
    
    # Campo para Aprovação Admin
    status = Column(String(30), default="PENDING_REVIEW") # PENDING_REVIEW, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    cnpj_cpf = Column(String(20), nullable=True)

    # Relacionamentos
    parceiro = relationship("Parceiro", back_populates="estabelecimentos")
    cupons = relationship("Cupom", back_populates="estabelecimento", cascade="all, delete-orphan")
    favoritado_por = relationship("Favorito", back_populates="estabelecimento", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="estabelecimento", cascade="all, delete-orphan")

    @property
    def features(self):
        if not self.recursos_acessibilidade:
            return []
        return [f.strip() for f in self.recursos_acessibilidade.split(",") if f.strip()]

class Cupom(Base):
    __tablename__ = "cupons"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False)
    
    titulo = Column(String(150), nullable=False)
    codigo = Column(String(50), nullable=False)
    descricao = Column(String(255), nullable=True)
    tipo_desconto = Column(String(50), nullable=False)
    valor = Column(Integer, nullable=False)  # simplificado como int para não ter float/decimal
    validade = Column(String(50), nullable=True)
    regras = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)

    estabelecimento = relationship("Estabelecimento", back_populates="cupons")

class Favorito(Base):
    __tablename__ = "favoritos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", backref="meus_favoritos")
    estabelecimento = relationship("Estabelecimento", back_populates="favoritado_por")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    rating = Column(Integer, nullable=False) # 1 a 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    estabelecimento = relationship("Estabelecimento", back_populates="reviews")
    usuario = relationship("Usuario", backref="minhas_avaliacoes")
