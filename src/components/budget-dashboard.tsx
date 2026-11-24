"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import { Download, Upload, Check, Pencil, ChevronDown, CircleHelp, House, Plus, RotateCcw, ShieldCheck, Trash2, Wallet, X } from "lucide-react";
import { CATEGORY_COLORS, SOURCE_LABELS, isFundingSource, fundingSource, categoryTotal, createBudgetBook, createMonthlyBudget, currentMonth, isMonth, money, parseBudget, selectMonth, STORAGE_KEY, totals, type BudgetBook, type MonthlyBudget } from "@/lib/budget";

import MoneyInput from "@/components/money-input";

const icons = { compromissos: Wallet, transporte_saude: ShieldCheck, pessoal: House };
const percentage = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);

export default function BudgetDashboard() {
  const [book, setBook] = useState<BudgetBook | null>(null);
  const budget = book?.months[book.selectedMonth] ?? createMonthlyBudget();
  const [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [editing, setEditing] = useState<{ categoryId: string; itemId?: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Browser-only storage is restored after hydration, before autosave is enabled.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setBook(saved !== null ? parseBudget(saved) : createBudgetBook(currentMonth()));
    } catch {
      setBook(createBudgetBook(currentMonth()));
      setCanSave(false);
      setError("Não foi possível ler o orçamento salvo. Importe um backup ou use Resetar. Os dados antigos não serão sobrescritos automaticamente.");
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready || !canSave || !book) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(book)); }
    catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Report an external storage failure.
      setCanSave(false);
      setError("O navegador não permitiu salvar. Exporte um backup JSON para guardar suas alterações.");
    }
  }, [book, ready, canSave]);

  const { income: totalIncome, expenses, remaining, rate, vrExpenses, vrRemaining, totalExpenses, cltExpenses, freelanceExpenses } = totals(budget);
  const goalMet = rate !== null && rate >= 20;
  const distributionTotal = Math.max(totalIncome, expenses) + Math.max(budget.vrIncome, vrExpenses);
  const categories = budget.categories.map(category => ({ ...category, source: fundingSource(category.source), total: categoryTotal(category) }));

  function setBudget(update: (current: MonthlyBudget) => MonthlyBudget) {
    setBook(current => current ? { ...current, months: { ...current.months, [current.selectedMonth]: update(current.months[current.selectedMonth]) } } : current);
  }
  function changeMonth(month: string) {
    if (!book || !isMonth(month)) return;
    const exists = Boolean(book.months[month]);
    setBook(current => current ? selectMonth(current, month) : current);
    setAdding(null); setAddingCategory(false); setEditing(null);
    setNotice(exists ? "Orçamento do mês carregado." : "Novo mês criado: contas, salário CLT e VR copiados como previsão; receita autônoma zerada. Revise os valores.");
  }
  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = String(data.get("category-name") ?? "").trim();
    const color = String(data.get("category-color") ?? "");
    const source = data.get("source");
    if (!label || label.length > 80 || !/^#[\da-fA-F]{6}$/.test(color) || !isFundingSource(source) || budget.categories.length >= 50) return;
    const category = { id: `category-${crypto.randomUUID()}`, label, color, source, open: true, items: [] };
    setBudget(current => ({ ...current, categories: [...current.categories, category] }));
    setAddingCategory(false); setAdding(category.id);
    setNotice(`Categoria “${label}” criada. Adicione a primeira conta.`);
  }
  function startEditing(categoryId: string, itemId?: string) {
    setEditing({ categoryId, itemId }); setAdding(null); setAddingCategory(false); setNotice("");
  }
  function saveCategory(event: FormEvent<HTMLFormElement>, categoryId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label") ?? "").trim();
    const color = String(data.get("color") ?? "");
    const source = data.get("source");
    if (!label || label.length > 80 || !/^#[\da-fA-F]{6}$/.test(color) || !isFundingSource(source)) {
      setError("Informe um nome de categoria de até 80 caracteres e uma cor válida."); return;
    }
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id === categoryId ? { ...category, label, color, source } : category) }));
    setEditing(null); setError(""); setNotice("Categoria atualizada neste mês.");
  }
  function updateCategorySource(categoryId: string, source: string) {
    if (!isFundingSource(source)) return;
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id === categoryId ? { ...category, source } : category) }));
    setNotice("Origem de pagamento atualizada neste mês.");
  }
  function saveAccount(event: FormEvent<HTMLFormElement>, categoryId: string, itemId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label") ?? "").trim();
    const value = Number(data.get("value"));
    const item = budget.categories.find(category => category.id === categoryId)?.items.find(item => item.id === itemId);
    if (!item || !label || label.length > 80 || !Number.isFinite(value) || value < item.min || value > item.max) {
      setError("Confira o nome da conta e digite um valor dentro do limite indicado."); return;
    }
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id !== categoryId ? category : { ...category, items: category.items.map(item => item.id === itemId ? { ...item, label, value: Math.round(value * 100) / 100 } : item) }) }));
    setEditing(null); setError(""); setNotice("Conta atualizada neste mês.");
  }
  function updateExpense(categoryId: string, itemId: string, raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id !== categoryId ? category : {
      ...category, items: category.items.map(item => item.id !== itemId ? item : { ...item, value: Math.round(Math.max(item.min, Math.min(item.max, value)) * 100) / 100 }),
    }) }));
    setNotice("");
  }
  function toggleCategory(id: string) {
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id === id ? { ...category, open: !category.open } : category) }));
  }
  function addExpense(event: FormEvent<HTMLFormElement>, categoryId: string) {
    event.preventDefault();
    const label = String(new FormData(event.currentTarget).get("expense-name") ?? "").trim();
    if (!label || label.length > 80) return;
    const id = `custom-${crypto.randomUUID()}`;
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id === categoryId ? {
      ...category, items: [...category.items, { id, label, value: 0, min: 0, max: 2000, step: 1, custom: true }],
    } : category) }));
    setAdding(null);
    setNotice(`Conta “${label}” adicionada.`);
  }
  function removeExpense(categoryId: string, itemId: string) {
    const item = budget.categories.find(category => category.id === categoryId)?.items.find(item => item.id === itemId);
    if (!item || !window.confirm(`Excluir a conta “${item.label}” somente deste mês?`)) return;
    setBudget(current => ({ ...current, categories: current.categories.map(category => category.id === categoryId ? { ...category, items: category.items.filter(item => item.id !== itemId) } : category) }));
    setEditing(null); setNotice("Conta excluída deste mês.");
  }
  function removeCategory(categoryId: string) {
    const category = budget.categories.find(category => category.id === categoryId);
    if (!category || !window.confirm(`Excluir a categoria “${category.label}” e suas ${category.items.length} conta(s) somente deste mês?`)) return;
    setBudget(current => ({ ...current, categories: current.categories.filter(category => category.id !== categoryId) }));
    setEditing(null); setAdding(null); setNotice("Categoria e suas contas excluídas deste mês.");
  }
  function exportBudget() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(book, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `meu-orcamento-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Backup de todos os meses exportado. Importe este arquivo no outro computador.");
  }
  async function importBudget(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("O arquivo é grande demais. Escolha um backup JSON de até 5 MB.");
      const imported = parseBudget(await file.text(), book?.selectedMonth ?? currentMonth());
      if (!window.confirm("Importar este arquivo substituirá todos os meses salvos. Deseja continuar?")) return;
      setBook(imported); setError(""); setCanSave(true); setAdding(null); setAddingCategory(false); setEditing(null);
      setNotice("Meses do orçamento importados com sucesso.");
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith("O arquivo") ? cause.message : "Não foi possível importar. Escolha um JSON exportado por este app. Seu orçamento atual foi mantido.");
    }
  }
  function resetBudget() {
    if (!window.confirm("Restaurar os valores iniciais somente do mês selecionado? As categorias e contas personalizadas deste mês serão removidas. Os outros meses serão mantidos.")) return;
    setBudget(() => createMonthlyBudget()); setCanSave(true); setError(""); setAdding(null); setAddingCategory(false); setEditing(null);
    setNotice("Valores iniciais do mês selecionado restaurados.");
  }

  return <div className="app-shell bg-zinc-950 text-zinc-100">
    <header className="topbar">
      <a className="brand" href="#conteudo"><span className="brand-icon"><Wallet size={21} /></span>Meu orçamento</a>
      <nav className="actions" aria-label="Backup e configurações">
        <button className="button" onClick={exportBudget} disabled={!ready}><Download size={16} />Exportar</button>
        <button className="button" onClick={() => fileInput.current?.click()} disabled={!ready}><Upload size={16} />Importar</button>
        <button className="button button-reset" onClick={resetBudget} disabled={!ready}><RotateCcw size={15} />Resetar mês</button>
        <input ref={fileInput} type="file" accept=".json,application/json" onChange={importBudget} className="sr-only" aria-label="Selecionar backup JSON" tabIndex={-1} />
      </nav>
    </header>
    <main id="conteudo">
      <div className="page-heading"><div><h1>Seu plano para morar sozinho<span>.</span></h1><p>Ajuste os gastos de hoje. Veja o que fica para a sua próxima fase.</p></div><span className="save-status"><Check size={14} />{!ready ? "Carregando orçamento…" : canSave ? "Salvamento automático" : "Use Exportar para salvar"}</span></div>
      <div className="month-toolbar">
        <label htmlFor="budget-month">Mês do orçamento<input id="budget-month" type="month" min="1000-01" max="9999-12" value={book?.selectedMonth ?? ""} disabled={!ready} onChange={event => changeMonth(event.target.value)} /></label>
        <p>Receitas e contas independentes por mês. Um mês novo usa as contas atuais como previsão.</p>
      </div>
      {error && <div className="message error" role="alert"><CircleHelp size={18} /><p>{error}</p><button onClick={() => setError("")} aria-label="Fechar aviso"><X size={16} /></button></div>}
      <p className={`notice${notice ? " visible" : ""}`} role="status" aria-live="polite">{notice || "\u00a0"}</p>
      <section className="summary-grid" aria-label="Resumo do orçamento">
        <div className="summary-card"><label htmlFor="income" className="metric-label">Salário CLT líquido</label><div className="income-field"><span>R$</span><MoneyInput id="income" min={0} max={1_000_000_000} step="0.01" value={budget.income} disabled={!ready} onValueChange={income => setBudget(current => ({ ...current, income }))} /></div><div className="freelance-field"><label htmlFor="freelance-income">Receita autônoma</label><div><span>R$</span><MoneyInput id="freelance-income" min={0} max={1_000_000_000} step="0.01" value={budget.freelanceIncome} disabled={!ready} onValueChange={freelanceIncome => setBudget(current => ({ ...current, freelanceIncome }))} /></div></div><p className="metric-foot">Receita em dinheiro: <strong data-testid="income-total">{money(totalIncome)}</strong></p></div>
        <div className={`summary-card reserve-card ${remaining < 0 ? "negative" : remaining === 0 ? "at-limit" : "positive"}`}><h2 className="metric-label">Sobra para reserva / mudança</h2><p className="metric-value" data-testid="remaining">{money(remaining)}</p><p className="metric-foot">Despesas em dinheiro: <strong data-testid="expenses">{money(expenses)}</strong></p></div>
        <div className="summary-card"><div className="metric-label-row"><h2 className="metric-label">Taxa de poupança</h2><span className={`goal-badge ${goalMet ? "met" : ""}`}>Meta: 20%+</span></div><p className={`metric-value ${rate !== null && rate < 0 ? "text-negative" : ""}`} data-testid="rate">{rate === null ? "—" : `${percentage(rate)}%`}</p><p className="metric-foot">{rate === null ? "Informe uma receita para calcular." : goalMet ? "Sua projeção está acima da meta." : "Espaço para construir sua reserva."}</p></div>
        <div className={`summary-card vr-card ${vrRemaining < 0 ? "negative" : ""}`}>
          <label htmlFor="vr-income" className="metric-label">VR recebido no mês</label>
          <div className="income-field vr-income-field"><span>R$</span><MoneyInput id="vr-income" min={0} max={1_000_000_000} step="0.01" value={budget.vrIncome} disabled={!ready} onValueChange={vrIncome => setBudget(current => ({ ...current, vrIncome }))} /></div>
          <p className="metric-foot">Gastos no VR: <strong data-testid="vr-expenses">{money(vrExpenses)}</strong></p>
          <p className={`vr-balance ${vrRemaining < 0 ? "text-negative" : ""}`}>Saldo do VR: <strong data-testid="vr-remaining">{money(vrRemaining)}</strong></p>
          <p className="metric-foot">{vrRemaining < 0 ? "VR insuficiente para as categorias vinculadas." : "Benefício separado da reserva em dinheiro."}</p>
        </div>
      </section>
      {(cltExpenses > budget.income || freelanceExpenses > budget.freelanceIncome) && <div className="source-warning" role="status">
        {cltExpenses > budget.income && <p>As categorias vinculadas ao salário CLT excedem essa receita em {money(cltExpenses - budget.income)}.</p>}
        {freelanceExpenses > budget.freelanceIncome && <p>As categorias vinculadas à receita autônoma excedem essa receita em {money(freelanceExpenses - budget.freelanceIncome)}.</p>}
        <p>Revise os valores ou escolha Dinheiro (CLT + autônomo) para usar as receitas em conjunto.</p>
      </div>}
      <section className="distribution" aria-labelledby="distribution-title">
        <div className="section-heading"><h2 id="distribution-title">Para onde vai seu dinheiro</h2><span>{remaining < 0 ? "As despesas em dinheiro ultrapassam a receita" : "Distribuição do dinheiro e do VR"}</span></div>
        <div className="distribution-bar" role="img" aria-label={categories.map(category => `${category.label}: ${money(category.total)}`).join("; ") + `; ${remaining < 0 ? "Déficit" : "Sobra"}: ${money(Math.abs(remaining))}; Saldo do VR: ${money(vrRemaining)}`}>
          {distributionTotal > 0 && categories.map(category => <div key={category.id} style={{ width: `${category.total / distributionTotal * 100}%`, backgroundColor: category.color }} title={`${category.label}: ${money(category.total)}`} />)}
          {remaining > 0 && <div style={{ width: `${remaining / distributionTotal * 100}%`, backgroundColor: "var(--reserve)" }} title={`Reserva / mudança: ${money(remaining)}`} />}
          {vrRemaining > 0 && <div style={{ width: `${vrRemaining / distributionTotal * 100}%`, backgroundColor: "#7dd3fc" }} title={`Saldo do VR: ${money(vrRemaining)}`} />}
        </div>
        <div className="distribution-legend">{categories.map(category => <div key={category.id}><span className="legend-dot" style={{ backgroundColor: category.color }} /><span>{category.label}<small>{SOURCE_LABELS[category.source]}</small></span><strong>{money(category.total)}</strong></div>)}<div><span className={`legend-dot ${remaining < 0 ? "deficit-dot" : "reserve-dot"}`} /><span>{remaining < 0 ? "Falta cobrir" : "Reserva / mudança"}</span><strong className={remaining < 0 ? "text-negative" : "text-reserve"}>{money(Math.abs(remaining))}</strong></div><div><span className="legend-dot" style={{ backgroundColor: vrRemaining < 0 ? "var(--danger)" : "#7dd3fc" }} /><span>{vrRemaining < 0 ? "Falta cobrir no VR" : "Saldo do VR"}</span><strong className={vrRemaining < 0 ? "text-negative" : ""}>{money(Math.abs(vrRemaining))}</strong></div></div>
        <p className="distribution-note">Despesas totais (dinheiro + VR): <strong data-testid="all-expenses">{money(totalExpenses)}</strong>. A reserva e a taxa de poupança consideram somente dinheiro.</p>
      </section>
      <div className="workspace">
        <section className="categories" aria-labelledby="expenses-title"><div className="expenses-heading"><h2 id="expenses-title">Categorias e contas</h2><span>Arraste ou digite o valor de cada conta</span></div>
          {categories.length === 0 && <p className="empty-category">Nenhuma categoria neste mês. Use Nova categoria para adicionar suas contas.</p>}
          {categories.map(category => {
            const Icon = icons[category.id as keyof typeof icons] ?? Wallet;
            return <section className="category" key={category.id} style={{ "--category-color": category.color } as CSSProperties}>
              <div className="category-header">
                <button className="category-toggle" onClick={() => toggleCategory(category.id)} aria-expanded={category.open} aria-controls={`items-${category.id}`}><span className="category-name"><span className="category-icon"><Icon size={19} /></span><span>{category.label}</span></span><span className="category-subtotal">{money(category.total)}<ChevronDown className={category.open ? "chevron open" : "chevron"} size={18} /></span></button>
                <button className="edit-button category-edit-button" onClick={() => startEditing(category.id)} disabled={!ready} aria-label={`Editar categoria ${category.label}`}><Pencil size={14} />Editar</button>
              </div>
              <div className="category-source"><label htmlFor={`source-${category.id}`}>Pagar com</label><select id={`source-${category.id}`} value={category.source} disabled={!ready} onChange={event => updateCategorySource(category.id, event.target.value)}>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              {editing?.categoryId === category.id && !editing.itemId && <form className="edit-form category-edit-form" onSubmit={event => saveCategory(event, category.id)}>
                <h3>Editar categoria</h3>
                <label htmlFor={`edit-category-${category.id}`}>Nome da categoria<input id={`edit-category-${category.id}`} name="label" defaultValue={category.label} required maxLength={80} autoFocus /></label>
                <label className="edit-color" htmlFor={`edit-color-${category.id}`}>Cor da categoria<input id={`edit-color-${category.id}`} name="color" type="color" defaultValue={category.color} /></label>
                <label htmlFor={`edit-source-${category.id}`}>Receita usada</label><select id={`edit-source-${category.id}`} name="source" defaultValue={category.source}>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <div className="edit-actions"><button className="button primary" type="submit">Salvar categoria</button><button className="button" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="button danger-button" type="button" onClick={() => removeCategory(category.id)}><Trash2 size={15} />Excluir categoria</button></div>
              </form>}
              {category.open && <div className="category-content" id={`items-${category.id}`}>
                {category.items.length === 0 && <p className="empty-category">Nenhuma conta nesta categoria. Adicione a primeira abaixo.</p>}
                {category.items.map(item => <div className="expense" key={item.id}>
                  {editing?.categoryId === category.id && editing.itemId === item.id ? <form className="edit-form" onSubmit={event => saveAccount(event, category.id, item.id)}>
                    <h3>Editar conta</h3>
                    <label htmlFor={`edit-account-${item.id}`}>Nome da conta<input id={`edit-account-${item.id}`} name="label" defaultValue={item.label} required maxLength={80} autoFocus /></label>
                    <label htmlFor={`edit-value-${item.id}`}>Valor da conta (R$)<input id={`edit-value-${item.id}`} name="value" type="number" inputMode="decimal" min={item.min} max={item.max} step="0.01" defaultValue={item.value} onFocus={event => { if (event.currentTarget.value === "0") event.currentTarget.select(); }} required /></label>
                    <p>Limite desta conta: {money(item.min)} a {money(item.max)}.</p>
                    <div className="edit-actions"><button className="button primary" type="submit">Salvar conta</button><button className="button" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="button danger-button" type="button" onClick={() => removeExpense(category.id, item.id)}><Trash2 size={15} />Excluir conta</button></div>
                  </form> : <><div className="expense-top"><label htmlFor={`value-${item.id}`}>{item.label}</label><div className="expense-value"><span>R$</span><MoneyInput id={`value-${item.id}`} min={item.min} max={item.max} step="0.01" value={item.value} disabled={!ready} onValueChange={value => updateExpense(category.id, item.id, String(value))} /><button className="edit-button" onClick={() => startEditing(category.id, item.id)} disabled={!ready} aria-label={`Editar conta ${item.label}`}><Pencil size={14} />Editar</button>{item.custom && <button className="delete-expense" onClick={() => removeExpense(category.id, item.id)} aria-label={`Remover ${item.label}`}><Trash2 size={16} /></button>}</div></div>
                  <input className="expense-slider" aria-label={`Ajustar ${item.label}`} type="range" min={item.min} max={item.max} step={item.step} value={item.value} disabled={!ready} onChange={event => updateExpense(category.id, item.id, event.target.value)} style={{ "--progress": `${(item.value - item.min) / (item.max - item.min) * 100}%` } as CSSProperties} />
                  <div className="range-limits"><span>{money(item.min)}</span><span>{money(item.max)}</span></div></>}
                </div>)}
                {adding === category.id ? <form className="add-form" onSubmit={event => addExpense(event, category.id)}><label htmlFor={`new-${category.id}`}>Nome da nova conta</label><div><input id={`new-${category.id}`} name="expense-name" placeholder="Ex.: remédios, internet, comida extra" maxLength={80} required autoFocus /><button className="button primary" type="submit">Adicionar</button><button className="button" type="button" onClick={() => setAdding(null)} aria-label="Cancelar nova conta"><X size={16} /></button></div><p>Valor inicial de R$ 0; ajuste até R$ 2.000 após adicionar.</p></form> : <button className="add-expense" disabled={!ready || category.items.length >= 100} onClick={() => { setAdding(category.id); setEditing(null); }}><Plus size={16} />Adicionar conta</button>}
              </div>}
            </section>;
          })}
          {addingCategory ? <form className="category-create add-form" onSubmit={addCategory}>
            <h3>Nova categoria</h3><label htmlFor="category-name">Nome da categoria</label>
            <input id="category-name" name="category-name" placeholder="Ex.: Moradia, Trabalho, Saúde" maxLength={80} required autoFocus />
            <label htmlFor="category-source">Receita usada</label><select id="category-source" name="source" defaultValue="cash">{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <div className="category-create-actions"><label htmlFor="category-color">Cor<input id="category-color" name="category-color" type="color" defaultValue={CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]} /></label><button className="button primary" type="submit">Criar categoria</button><button className="button" type="button" onClick={() => setAddingCategory(false)}>Cancelar</button></div>
          </form> : <button className="button new-category" disabled={!ready || categories.length >= 50} onClick={() => { setAddingCategory(true); setAdding(null); setEditing(null); }}><Plus size={17} />Nova categoria</button>}
        </section>
        <aside className="guidance" aria-labelledby="guidance-title"><div className="guidance-heading"><House size={21} /><h2 id="guidance-title">Um passo mais perto<br />da sua casa</h2></div><p>A sobra em dinheiro é o ponto de partida para a mudança. O saldo do VR fica separado e não entra na reserva.</p><div className={`health-line ${remaining < 0 ? "health-negative" : goalMet ? "health-positive" : "health-warning"}`}><strong>{remaining < 0 ? "O mês não fecha" : goalMet ? "Há espaço para guardar" : "A margem está apertada"}</strong><p>{remaining < 0 ? `Reduza ${money(-remaining)} em despesas ou aumente a receita para equilibrar o mês.` : rate === null ? "Informe quanto você recebe para avaliar seu orçamento." : goalMet ? `Você projeta guardar ${money(remaining)} neste mês. Separe esse valor antes de gastar.` : `Faltam ${money(Math.max(0, totalIncome * .2 - remaining))} de folga para chegar à meta de 20%.`}</p></div><div className="guidance-note"><ShieldCheck size={18} /><p>Cada mês guarda suas receitas, categorias e contas neste navegador. O backup JSON inclui todos os meses.</p></div></aside>
      </div>
      <footer><span>Meu orçamento · Plano morar sozinho</span><span>Uma projeção mensal, no seu ritmo.</span></footer>
    </main>
  </div>;
}
