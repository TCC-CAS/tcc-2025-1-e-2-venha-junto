from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ---------------------------------------------
# DADOS RECEBIDOS DO FRONTEND ("CRIAR CONTA")
# ---------------------------------------------
class UsuarioCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: EmailStr  # Exige que seja um formato válido de E-mail
    senha: str
    
    class Config:
        # Exemplo que aparece na documentação do Swagger
        json_schema_extra = {
            "example": {
                "nome": "Bruna Silva",
                "telefone": "11999999999",
                "email": "bruna@exemplo.com",
                "senha": "SenhaForte123@"
            }
        }


# ---------------------------------------------
# DADOS DEVOLVIDOS PELA API AO FRONTEND
# ---------------------------------------------
class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    is_active: bool
    role: str

    class Config:
        from_attributes = True  # Permite ler dados do modelo SQLAlchemy internamente

# ---------------------------------------------
# DADOS RECEBIDOS DO FRONTEND ("LOGIN")
# ---------------------------------------------
class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str

# ---------------------------------------------
# DADOS PARA ATUALIZAR O PERFIL (FRONTEND -> API)
# ---------------------------------------------
class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None

# =============================================
# SCHEMAS PARA PARCEIROS
# =============================================

class ParceiroCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: EmailStr
    senha: str

class ParceiroResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class ParceiroLogin(BaseModel):
    email: EmailStr
    senha: str

class ParceiroUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None

# =============================================
# SCHEMAS PARA ESTABELECIMENTOS & CUPONS
# =============================================

class CupomBase(BaseModel):
    titulo: str
    codigo: str
    descricao: Optional[str] = None
    tipo_desconto: str
    valor: int
    validade: Optional[str] = None
    regras: Optional[str] = None

class CupomCreate(CupomBase):
    pass

class CupomResponse(CupomBase):
    id: int
    estabelecimento_id: int
    ativo: bool

    class Config:
        from_attributes = True

class CupomUpdate(BaseModel):
    titulo: Optional[str] = None
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    tipo_desconto: Optional[str] = None
    valor: Optional[int] = None
    validade: Optional[str] = None
    regras: Optional[str] = None
    ativo: Optional[bool] = None

class EstabelecimentoBase(BaseModel):
    # Passo 1
    nome_responsavel: str
    email_responsavel: str
    telefone_responsavel: Optional[str] = None
    
    # Passo 2
    nome: str
    tipo: str
    descricao: str
    cep: str
    endereco: str
    numero_apto: Optional[str] = None
    bairro: Optional[str] = None
    cidade: str
    estado: str
    mostrar_mapa: bool = False
    
    telefone_local: Optional[str] = None
    whatsapp_local: Optional[str] = None
    email_local: Optional[str] = None
    site_local: Optional[str] = None
    horario_funcionamento: Optional[str] = None
    
    # Passo 3
    recursos_acessibilidade: Optional[str] = None
    
    # Passo 4
    plano_escolhido: str
    
    # Fotos
    foto_perfil: Optional[str] = None
    fotos_galeria: Optional[str] = None
    
    # Novos campos
    cnpj_cpf: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    views_count: Optional[int] = 0
    clicks_count: Optional[int] = 0

class EstabelecimentoUpdate(BaseModel):
    # Passo 1
    nome_responsavel: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone_responsavel: Optional[str] = None
    
    # Passo 2
    nome: Optional[str] = None
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero_apto: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    mostrar_mapa: Optional[bool] = None
    
    telefone_local: Optional[str] = None
    whatsapp_local: Optional[str] = None
    email_local: Optional[str] = None
    site_local: Optional[str] = None
    horario_funcionamento: Optional[str] = None
    
    # Passo 3
    recursos_acessibilidade: Optional[str] = None
    
    # Passo 4
    plano_escolhido: Optional[str] = None
    
    # Fotos
    foto_perfil: Optional[str] = None
    fotos_galeria: Optional[str] = None

class EstabelecimentoCreate(EstabelecimentoBase):
    cupom: Optional[CupomCreate] = None  # Opcional, caso tenha ativado o cupom no fluxo

class EstabelecimentoResponse(EstabelecimentoBase):
    id: int
    parceiro_id: int
    status: str
    created_at: datetime
    cupons: List[CupomResponse] = []
    features: List[str] = []
    avg_rating: Optional[float] = 0.0
    reviews_count: Optional[int] = 0
    favorites_count: Optional[int] = 0

    class Config:
        from_attributes = True

class FavoritoResponse(BaseModel):
    id: int
    usuario_id: int
    estabelecimento_id: int
    created_at: datetime
    estabelecimento: Optional[EstabelecimentoResponse] = None

    class Config:
        from_attributes = True

# =============================================
# SCHEMAS PARA AVALIAÇÕES (REVIEWS)
# =============================================

class ReviewBase(BaseModel):
    rating: int # 1 a 5
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    id: int
    estabelecimento_id: int
    usuario_id: int
    created_at: datetime
    # Incluir nome do usuário para exibir no front
    usuario_nome: Optional[str] = None

    class Config:
        from_attributes = True
