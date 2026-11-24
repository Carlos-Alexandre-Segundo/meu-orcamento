# Especificação — Orçamento Mensal (Plano Morar Sozinho)

Next.js App Router, TypeScript, Tailwind CSS, lucide-react. Tema escuro bg-zinc-950/text-zinc-100. Moeda em pt-BR.

## Dados iniciais
- Salário líquido: R$ 1.889.
- Faturas e Compromissos (#2563eb, aberta): cartões 0 (0–2000); ajuda de casa/dízimo/fixos 400 (0–1500).
- Transporte e Rotina (#0d9488, aberta): moto 250 (0–1000); academia/cuidados pessoais 150 (0–800).
- Gastos Pessoais e Lazer (#f59e0b, aberta): alimentação fora/saídas 350 (0–1500).
- Sliders com passo 1.

## Funções
Salário editável; sobra = receita − despesas; taxa de poupança = sobra / receita × 100, com meta 20%+. Receita zero deve apresentar taxa indisponível. Sobra positiva verde, negativa vermelha.

Barra proporcional com categorias e sobra positiva. Categorias recolhíveis com subtotal. Sliders e inputs numéricos sincronizados. Adicionar/remover despesas customizadas por categoria.

Salvar automaticamente na chave localStorage plano_morar_sozinho_v1. Exportar/importar JSON para portabilidade e resetar para os valores iniciais. Validar arquivos e proteger contra perda acidental de dados.

## Entrega
Sem erros TypeScript ou ESLint; build de produção validado. Pronto para GitHub e Vercel, sem publicação automática neste trabalho.

## Evolução mensal

Orçamentos independentes por mês, com salário CLT e receita autônoma separados. Categorias são grupos; contas são os itens dentro delas. Criação livre de categorias com cor e contas próprias. Um mês novo copia a previsão de contas do mês aberto e zera a receita autônoma. Formato de armazenamento v2 com migração de backups v1. Exportar inclui todos os meses; resetar afeta somente o mês aberto.

## Edição

Botões Editar visíveis nas categorias e contas iniciais/personalizadas. Categorias: nome e cor. Contas: nome e valor, respeitando limites existentes. Salvar/Cancelar explícitos, com edições restritas ao mês aberto e preservadas no JSON.

## Ajustes de entrada e exclusão

Campos monetários devem aceitar vazio durante edição, sem reintroduzir zero à esquerda. Edição de contas e categorias inclui exclusão com confirmação. Exclusão de categoria remove suas contas apenas do mês aberto. O backup continua válido mesmo após excluir contas iniciais ou todas as categorias de um mês.

## VR e fontes de receita

Recebimento de VR independente por mês. Categoria escolhe origem: Dinheiro (CLT + autônomo), Salário CLT, Receita autônoma ou VR. Contas herdam a origem da categoria. VR separado da reserva/taxa de poupança; saldo insuficiente explícito, sem cobrir automaticamente com dinheiro. Avisos para categorias vinculadas a receitas CLT/autônoma insuficientes. Migração v1/v2 para v3 mantém dados e assume VR zero e origem Dinheiro quando ausente.
