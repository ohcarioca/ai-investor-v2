# Debug: SIERRA → USDC Swap Failure

## Transação Falhada

- **Hash**: `0x14ccf7c4559837590ab94650b897156b7d88b7946d232c2feee82bf6251d3135`
- **Status**: FAIL (execution reverted)
- **Block**: 73538898
- **From**: `0xc90fC55C42Ed7A248a96F8E5737701ac05028a13`
- **To (Contract)**: `0x2E84246828ddae1850Bc0CF23d8d8a8d1Aa5f1f`

## Possíveis Causas

### 1. Amount em Base Units Incorreto

**Verificar**: O amount do SIERRA está sendo convertido corretamente?

- SIERRA tem 6 decimals
- Se usuário quer trocar "1.0 SIERRA", deveria ser "1000000" em base units
- Se estiver enviando "1.0" como string, vai falhar

### 2. Approval Insuficiente

**Verificar**: O approval do SIERRA token foi executado com sucesso?

- Verificar se `currentAllowance >= requiredAmount`
- O contrato `0x2E84246828ddae1850Bc0CF23d8d8a8d1Aa5f1f` precisa ter allowance do SIERRA

### 3. Balance Insuficiente

**Verificar**: A carteira tem SIERRA suficiente?

- Checar balance real de SIERRA na carteira
- Pode ter havido outra transação entre a cotação e a execução

### 4. Slippage Muito Baixo

**Verificar**: O slippage de 0.5% pode ser insuficiente para SIERRA

- SIERRA pode ser um token com baixa liquidez
- Preço pode ter mudado muito rapidamente
- Tentar com slippage de 1% ou 2%

### 5. Router Address Incorreto

**Verificar**: O endereço do router está correto para SIERRA?

- Linha 55 do `approval/route.ts`: `0x4a1a4e0a296e391ab60f49e35ee8bc3c16fe67b1`
- Verificar se este router suporta SIERRA token

### 6. Gas Limit Insuficiente

**Verificar**: O gas limit pode estar muito baixo

- Código adiciona 20% de margem
- Pode não ser suficiente para tokens mais complexos

## Ações Recomendadas

### Imediata

1. **Adicionar logs detalhados** antes de enviar transação:

   ```typescript
   console.log('Swap params:', {
     fromToken: token address,
     toToken: token address,
     amount: amount em base units,
     userAddress: wallet,
     currentAllowance: allowance value,
     balance: token balance
   });
   ```

2. **Verificar balance antes do swap**:

   ```typescript
   const balance = await publicClient.readContract({
     address: fromToken.address,
     abi: erc20Abi,
     functionName: 'balanceOf',
     args: [userAddress],
   });

   if (balance < amount) {
     throw new Error('Insufficient balance');
   }
   ```

3. **Aumentar slippage para SIERRA**:
   - Testar com 1%, 2%, ou 5%
   - Pode ser necessário slippage diferenciado por token

### Longo Prazo

1. Implementar validação de balance antes de executar swap
2. Adicionar validação de allowance após approval
3. Implementar retry com slippage aumentado automaticamente
4. Adicionar warnings sobre liquidez baixa
5. Implementar simulação da transação antes de enviar

## Como Testar

1. Fazer swap USDC → SIERRA pequeno (0.1 USDC)
2. Verificar balance de SIERRA na carteira
3. Fazer swap SIERRA → USDC com o mesmo amount
4. Verificar logs do console
5. Se falhar, tentar com slippage maior

## Links Úteis

- Transação falhada: https://snowtrace.io/tx/0x14ccf7c4559837590ab94650b897156b7d88b7946d232c2feee82bf6251d3135
- SIERRA Token: https://snowtrace.io/token/0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7
- Router Contract: https://snowtrace.io/address/0x2E84246828ddae1850Bc0CF23d8d8a8d1Aa5f1f
