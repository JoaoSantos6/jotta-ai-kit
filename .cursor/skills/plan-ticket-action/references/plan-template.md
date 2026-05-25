# Plan Document Template

Use this template for every planning document. All sections marked [MANDATORY] must be present.
Sections marked [OPTIONAL] should be included when relevant.

---

```markdown
# Plan: [Título descritivo da alteração]

> **Ticket:** [ID do ticket ou "N/A"]
> **Data:** [YYYY-MM-DD]
> **Autor:** [quem solicitou ou "via LLM planning"]
> **Status:** Planejado

---

## 1. Contexto do Problema [MANDATORY]

### 1.1 O que está acontecendo hoje?
[Descreva o estado atual do sistema relevante para esta mudança]

### 1.2 Por que precisa mudar?
[Motivação clara — business reason, bug, tech debt, feature request]

### 1.3 Qual o resultado esperado?
[O que o sistema deve fazer depois da alteração]

---

## 2. Análise Técnica [MANDATORY]

### 2.1 Componentes Afetados
[Liste módulos, serviços, camadas que serão impactados]

| Camada | Arquivo/Módulo | Tipo de Alteração |
|--------|---------------|-------------------|
| [ex: Controller] | [ex: src/controllers/UserController.ts] | [Modificação/Criação/Remoção] |

### 2.2 Padrões Identificados no Projeto
[Descreva os padrões arquiteturais, de código e convenções encontrados no projeto que devem ser respeitados]

### 2.3 Dependências
[Bibliotecas, serviços externos, módulos internos que esta alteração depende ou impacta]

---

## 3. Trade-offs [MANDATORY]

| Decisão | Alternativa Considerada | Por que esta abordagem | Risco |
|---------|------------------------|----------------------|-------|
| [ex: Usar event-driven] | [ex: Chamada síncrona direta] | [ex: Desacoplamento entre módulos] | [ex: Complexidade adicional no debug] |

---

## 4. Plano de Alterações (TO-DOs) [MANDATORY]

### 4.1 [Nome do módulo/camada]

- [ ] **[Arquivo]**: [Descrição da alteração]
  - Justificativa: [Por que esta alteração é necessária, com referência ao código atual]
  - Detalhes: [Como implementar — abordagem, não código completo]

- [ ] **[Arquivo]**: [Descrição da alteração]
  - Justificativa: [...]
  - Detalhes: [...]

### 4.2 [Nome do módulo/camada]

- [ ] ...

### 4.3 Migrations / Config [OPTIONAL]

- [ ] [Descreva migrations de banco, variáveis de ambiente, ou config necessárias]

---

## 5. Testes [MANDATORY]

### 5.1 Testes Unitários

| Cenário | Arquivo de Teste | O que validar |
|---------|-----------------|---------------|
| [ex: Criar usuário com dados válidos] | [ex: __tests__/CreateUser.spec.ts] | [ex: Retorna 201 e persiste no banco] |
| [ex: Criar usuário com email duplicado] | [ex: __tests__/CreateUser.spec.ts] | [ex: Retorna 409 e não duplica] |

### 5.2 Como Testar via API [MANDATORY]

```bash
# [Descreva o endpoint, método, headers e body para testar]
curl -X POST http://localhost:3000/api/v1/example \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "field": "value"
  }'

# Resposta esperada (sucesso):
# HTTP 200
# { "id": "...", "status": "created" }

# Resposta esperada (erro):
# HTTP 422
# { "error": "validation_error", "details": [...] }
```

---

## 6. Observações [OPTIONAL]

[Qualquer nota adicional relevante: riscos conhecidos, débitos técnicos introduzidos,
sugestões de melhoria futura, pontos de atenção para code review]

---

## 7. Checklist de Validação [MANDATORY]

- [ ] Contexto do problema está claro
- [ ] Trade-offs foram documentados
- [ ] TO-DOs estão estruturados por módulo/camada
- [ ] Cada alteração tem justificativa com referência ao código
- [ ] Testes unitários estão planejados
- [ ] Testes via API estão documentados com curl/exemplos
- [ ] Padrões do projeto foram respeitados
- [ ] Impacto em outros módulos foi avaliado
```

---

## Title Examples

Good titles are descriptive and specific:

- `Plan: Adicionar autenticação JWT ao módulo de usuários`
- `Plan: Refatorar serviço de pagamentos para suportar PIX`
- `Plan: Migrar queries raw SQL para ORM no módulo de relatórios`
- `Plan: Corrigir race condition no processamento de webhooks`
- `Plan: Implementar cache Redis para listagem de produtos`

Bad titles are vague:

- `Plan: Alteração no backend` (o quê?)
- `Plan: Fix bug` (qual bug?)
- `Plan: Nova feature` (qual feature?)
