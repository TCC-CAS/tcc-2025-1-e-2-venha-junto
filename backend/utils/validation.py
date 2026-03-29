import httpx
from validate_docbr import CNPJ, CPF
from fastapi import HTTPException, status

cnpj_validator = CNPJ()
cpf_validator = CPF()

async def validar_documento_com_receita(documento: str):
    """
    Valida se o documento (CNPJ ou CPF) é matematicamente válido e, 
    no caso do CNPJ, consulta a BrasilAPI para verificar se é REAL e ATIVO.
    """
    # Remove pontuação
    doc_clean = "".join(filter(str.isdigit, documento))
    
    # Se for CNPJ (14 dígitos)
    if len(doc_clean) == 14:
        if not cnpj_validator.validate(doc_clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O formato do CNPJ informado é inválido."
            )
        
        # Consulta BrasilAPI (CNPJ Real)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{doc_clean}")
                
                if response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="CNPJ não encontrado na base de dados da Receita Federal."
                    )
                
                if response.status_code != 200:
                    # Se a API estiver fora do ar, podemos deixar passar se o formato for válido, 
                    # ou ser rigoroso. O usuário quer "como o Airbnb", então vamos ser rigorosos.
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Serviço de validação de CNPJ temporariamente indisponível. Tente novamente em instantes."
                    )
                
                dados = response.json()
                # Verifica a situação cadastral
                situacao = dados.get("descricao_situacao_cadastral", "").upper()
                if situacao != "ATIVA":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Este CNPJ não está ATIVO (Situação: {situacao}). Apenas empresas ativas podem se cadastrar."
                    )
                
                return True # Válido e Real
                
        except httpx.RequestError:
            # Fallback em caso de erro de rede: avisar o usuário
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Erro ao conectar com o serviço de validação. Verifique sua conexão."
            )

    # Se for CPF (11 dígitos)
    elif len(doc_clean) == 11:
        if not cpf_validator.validate(doc_clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O formato do CPF informado é inválido."
            )
        # CPF costuma não ter API pública gratuita tão simples quanto CNPJ, 
        # então validamos apenas o formato matemático por enquanto.
        return True
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido."
        )
