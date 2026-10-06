# Exemplos antes/depois

Testes fracos reescritos com oráculo forte. Os exemplos alternam entre Go, Python e PHP
para mostrar que o padrão independe da linguagem. Adapte ao framework do repositório.

**Atenção:** os valores dos exemplos são placeholders (`<VALOR_DA_FONTE>`, `RC-xxx`).
Não são regras de negócio. Em um teste real, cada valor esperado vem de uma fonte de
autoridade citada no comentário.

---

## 1. Print em vez de assert (Python / pytest)

Antes:

```python
def test_simulacao():
    resultado = simular(valor=10_000, prazo_meses=12)
    print(resultado)            # observação, não verificação
    assert resultado is not None  # C1
```

Depois:

```python
# Fonte: critério de aceite <TICKET-123>, tabela de exemplos
def test_simulacao_valor_e_prazo_da_tabela_de_aceite():
    resultado = simular(valor=10_000, prazo_meses=12)
    assert resultado.prazo_meses == 12                       # C4: eco da entrada
    assert resultado.parcela == Decimal("<VALOR_DA_FONTE>")  # C4: tabela do aceite
    assert resultado.valor_total >= Decimal("10000")         # C3: confirmado com o dev
```

---

## 2. Assert copiado da saída atual (Go / testify)

Antes:

```go
func TestCalculaParcela(t *testing.T) {
    p := CalculaParcela(5000, 24)
    assert.Equal(t, 251.37, p) // valor copiado de uma execução; sem fonte
}
```

Depois, sem fonte para o valor exato (metamórfico confirmado pelo dev, mais regressão marcada):

```go
// Relação confirmada por <dev> em <data>: mais valor, mesmo prazo → parcela não diminui.
func TestCalculaParcela_MaisValorNaoDiminuiParcela(t *testing.T) {
    for _, v := range []float64{1000, 5000, 9999.99, 10000} {
        require.GreaterOrEqual(t, CalculaParcela(v*2, 24), CalculaParcela(v, 24), "valor=%v", v)
    }
}

// oráculo de regressão: valor capturado do código em <data>, sem fonte. Ver pendência no relatório.
func TestCalculaParcela_Regressao(t *testing.T) {
    require.InDelta(t, 251.37, CalculaParcela(5000, 24), 0.005)
}
```

---

## 3. Erro genérico e try/except que engole falha (PHP / PHPUnit)

Antes:

```php
public function testPerguntaObrigatoria(): void
{
    try {
        $this->service->enviarPedido($pedidoSemResposta);
    } catch (\Exception $e) {
        // ok
    }
    $this->assertTrue(true);
}
```

Depois:

```php
// Fonte: especificação do parceiro <PARCEIRO>, seção <x>: pergunta <id> é obrigatória.
public function testPedidoSemPerguntaObrigatoriaFalhaComErroEspecifico(): void
{
    $this->expectException(PerguntaObrigatoriaException::class);
    $this->expectExceptionMessageMatches('/<id-da-pergunta>/');

    $this->service->enviarPedido($pedidoSemResposta);
}
```

---

## 4. Mock tautológico (Python)

Antes:

```python
def test_oferta(mocker):
    mocker.patch("ofertas.calcular_taxa", return_value=Decimal("1.99"))
    oferta = montar_oferta(cliente)
    assert oferta.taxa == Decimal("1.99")  # verifica o mock, não o código
```

Depois: mocke só a fronteira externa e verifique o que o código **faz** com o valor.

```python
# Fonte: RC-xxx (como a taxa do parceiro compõe a oferta)
def test_oferta_usa_taxa_do_parceiro_e_aplica_regra(mocker):
    mocker.patch("ofertas.cliente_parceiro.obter_taxa", return_value=Decimal("<TAXA_ENTRADA>"))
    oferta = montar_oferta(cliente)
    assert oferta.taxa == Decimal("<VALOR_DA_FONTE>")  # resultado da regra RC-xxx
    assert oferta.parceiro == "<PARCEIRO>"             # C4
```

---

## 5. Snapshot como oráculo de regra de negócio

Antes: o snapshot da resposta inteira da simulação, com 80 campos, é usado como único
oráculo.

Depois:

- mantenha o snapshot, se o time quiser, marcado como **regressão de formato**;
- extraia os 2 a 5 campos que a regra de negócio define e escreva asserts explícitos
  (C3 ou C4) com a fonte;
- para formato entre serviços, use contrato Pact (`qa-pact`), não snapshot.

---

## 6. Idempotência (qualquer linguagem)

```
DADO um pedido P enviado com sucesso, com chave de idempotência K
QUANDO P é reenviado com a mesma K
ENTÃO a resposta referencia o mesmo id de pedido     (C4 relacional: id1 == id2)
E existe exatamente 1 pedido com K no repositório    (C4: count == 1)
```

Use só se a fonte confirmar que o fluxo é idempotente e qual é a chave.

---

## 7. LLM como juiz

Antes: `assert juiz_llm(texto) == "ok"`.

Depois: mantenha o juiz como sinal auxiliar e adicione asserts determinísticos:

```python
assert "<CAMPO_OBRIGATORIO>" in texto
assert not any(t in texto.lower() for t in TERMOS_PROIBIDOS)  # lista vinda da fonte
assert len(texto) <= LIMITE_DA_FONTE
```
