# Documentação da finalidade de cada endpoint

> Leia este arquivo sempre que for documentar um request. Ele define o que escrever
> no campo `description` de cada request da collection.

## Princípio

Todo request documentado deve responder, para quem nunca viu o código: **para que
serve este endpoint?** A descrição sai da leitura do código que implementa a rota
(controller/handler, service, validações, respostas possíveis) — nunca de suposição
pelo nome da rota.

## O que a descrição deve conter

No campo `request.description` (markdown é suportado pelo Postman):

1. **Finalidade** (obrigatório): 1–3 frases dizendo o que o endpoint faz e quando
   usá-lo, em linguagem de negócio. Ex.: "Busca um usuário pelo id. Usado pela tela
   de perfil e por integrações que precisam validar cadastro."
2. **Entradas** (quando houver): path params, query params e campos relevantes do
   body — o que significam e quais são obrigatórios. Params simples já descritos em
   `url.variable`/`url.query` não precisam repetir aqui.
3. **Autenticação**: se a rota exige token/perfil específico, ou se é pública.
4. **Respostas relevantes**: status de sucesso e os erros de negócio que o código
   trata (ex.: "404 se o usuário não existe; 422 se o cadastro está inativo").
   Uma linha por status basta — detalhe vira exemplo salvo (ver `examples.md`).
5. **Observações** (opcional): efeitos colaterais (dispara e-mail, publica evento),
   idempotência, paginação, rota deprecada, rota que só existe em um ambiente.

## Modelo

```markdown
Busca um usuário pelo id. Usado pela tela de perfil e por integrações que precisam
validar cadastro.

**Auth**: Bearer token (qualquer usuário autenticado).

**Respostas**: 200 com os dados do usuário; 404 se não existir; 401 sem token.

**Obs.**: não retorna usuários com cadastro excluído (soft delete).
```

## Regras

- **Mesma descrição nos três ambientes** (local/hml/prd): escreva uma vez e
  replique. Diferenças por ambiente entram como "Obs." apenas onde se aplicam.
- **Curta e útil**: 3 a 10 linhas. Descrição que repete o óbvio ("GET que retorna
  users") é pior que nenhuma — diga o que o nome da rota NÃO diz.
- **Fiel ao código**: se ao ler o código a finalidade não ficar clara (regra de
  negócio ambígua, rota aparentemente morta), pergunte ao desenvolvedor em vez de
  chutar — e registre a resposta na descrição.
- Termos do domínio do projeto, sem sinônimos inventados.
