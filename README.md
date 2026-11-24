# Meu orçamento

Simulador mensal para planejar a reserva e a mudança para morar sozinho. Next.js App Router, TypeScript, Tailwind CSS e lucide-react. Valores iniciais conforme CODEX_SPEC.md.

## Executar

Use Node.js 24 LTS e npm. Dentro desta pasta:

```powershell
npm ci
npm run dev
```

Abra http://localhost:3000. Para produção local, execute `npm run build` e `npm start`.

## Verificações

```powershell
npm run lint
npm test
npm run build
```

Os testes cobrem cálculos, receita zero, déficit, centavos, importação inválida e backups com despesas personalizadas. O lint é executado separadamente do build.

## Dados e backup

Os valores são salvos na chave `plano_morar_sozinho_v1` do localStorage deste navegador. Não há conta, servidor de dados ou sincronização entre computadores. Use Exportar e Importar para transferir o arquivo JSON. Os backups contêm os valores financeiros sem criptografia: guarde-os em local privado. Resetar pede confirmação. Arquivos inválidos não substituem os dados salvos.

Valores positivos são despesas. A taxa de poupança fica indisponível quando a receita é zero. Em déficit, a barra mostra a composição das despesas; a falta de dinheiro aparece separadamente. Despesas personalizadas começam em zero, com limite de R$ 2.000. Para valores diferentes, ajuste os limites em src/lib/budget.ts.

## GitHub e Vercel

Crie um repositório vazio e, nesta pasta, execute:

```powershell
.\push-github.ps1 -RepoUrl 'https://github.com/SEU_USUARIO/meu-orcamento.git'
```

O script não é executado automaticamente, não força push e para se já houver outro origin. O Git precisa estar autenticado. Na Vercel, importe o repositório, selecione o preset Next.js e mantenha o build `npm run build`. Se importar o repositório da pasta pai, use `meu-orcamento` como Root Directory. Não são necessárias variáveis de ambiente.

Publicar uma nova URL não transfere o localStorage: exporte o orçamento antigo e importe no novo endereço. A planilha XLSX anterior não é importada automaticamente.

## Meses, receitas e categorias

Selecione o mês em **Mês do orçamento**. Cada mês guarda seu salário CLT, receita autônoma, categorias e contas separadamente. Ao abrir um mês ainda não cadastrado, o app copia o salário CLT e as contas do mês que estava aberto como previsão editável; a receita autônoma começa em zero. Meses já cadastrados não são alterados. Categorias novas pertencem ao mês selecionado e são copiadas junto das contas ao abrir novos meses.

Use **Nova categoria** para criar um grupo e **Adicionar conta** dentro dele. Por exemplo: Faturas e Compromissos é uma categoria; Faturas de cartão e Ajuda de casa são contas. A soma de CLT e autônomo alimenta a distribuição e a taxa de poupança.

Exportar guarda todos os meses. Importar substitui todos os meses após confirmação. **Resetar mês** restaura apenas o mês aberto. O formato anterior é migrado automaticamente para o mês atual; um backup antigo importado é associado ao mês selecionado. Nenhuma informação de mês é inventada para os dados antigos.

## Editar categorias e contas

Cada categoria tem um botão **Editar** ao lado do cabeçalho: altere nome e cor e clique em **Salvar categoria**. Cada conta, inclusive as iniciais, tem seu próprio **Editar**: altere nome e valor e clique em **Salvar conta**. **Cancelar** descarta o rascunho. As edições afetam somente o mês aberto e são preservadas nos backups.

## Digitação de valores e exclusão

Os campos de receita e de conta aceitam vazio enquanto você digita, removem zeros à esquerda e normalizam o valor ao sair do campo. Nos formulários Editar há **Excluir conta** (inclusive para contas iniciais) e **Excluir categoria**. A exclusão sempre pede confirmação e afeta somente o mês selecionado. Excluir uma categoria também exclui suas contas desse mês. Cancelar a confirmação mantém tudo intacto.

## VR e origem dos pagamentos

Informe **VR recebido no mês** no resumo. O saldo do VR é mostrado separadamente da sobra em dinheiro e da taxa de poupança. Em cada categoria, use **Pagar com** para escolher **Dinheiro (CLT + autônomo)**, **Salário CLT**, **Receita autônoma** ou **VR**. Todas as contas da categoria usam a mesma origem. A escolha também está disponível ao criar ou editar categorias.

O app avisa se as categorias vinculadas ao CLT/autônomo ultrapassam aquela receita. Se o VR for insuficiente, o saldo do benefício fica negativo; o valor faltante não é retirado automaticamente do salário. Para misturar origens, separe os gastos em categorias distintas. As categorias antigas continuam em Dinheiro e o VR começa em zero. Novos meses copiam o valor de VR como previsão, sem carregar automaticamente o saldo de meses anteriores.

Backups agora usam formato v3 e continuam aceitando v1 e v2, preservando contas e receitas anteriores. VR não é dinheiro disponível para reserva ou mudança.

Categorias sem origem de pagamento (campo ausente, nulo ou vazio) são recuperadas como Dinheiro (CLT + autônomo), preservando todas as contas e valores. Mesmo um estado antigo ainda aberto na tela é contabilizado como dinheiro, para que a categoria nunca desapareça da soma. Origens desconhecidas não vazias continuam sendo rejeitadas na importação.
