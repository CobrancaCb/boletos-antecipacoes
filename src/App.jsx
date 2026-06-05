import { useState, useEffect } from "react";

const TIPOS = ["Antecipação Lira", "Antecipação Inter"];

const USERS = [
  { username: "cobranca", password: "cob@2025", role: "cobranca", label: "Cobrança" },
  { username: "contaspagar", password: "cap@2025", role: "contas", label: "Contas a Pagar" },
];

const STORAGE_KEY = "boletos_sistema_v2";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function today() {
  return new Date().toISOString().split("T")[0];
}
function isVencido(vencimento, status) {
  if (status === "Pago") return false;
  return vencimento < today();
}
function isHoje(vencimento, status) {
  if (status === "Pago") return false;
  return vencimento === today();
}

const initialForm = { nf: "", cliente: "", valor: "", vencimento: "", descricao: "", tipo: TIPOS[0] };

export default function App() {
  const [user, setUser] = useState(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [boletos, setBoletos] = useState([]);
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState(initialForm);
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmPag, setConfirmPag] = useState(null);
  const [dataPag, setDataPag] = useState(today());
  const [activeTab, setActiveTab] = useState(TIPOS[0]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setBoletos(JSON.parse(saved));
    const savedUser = sessionStorage.getItem("boletos_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  function handleLogin() {
    const found = USERS.find(u => u.username === loginUser && u.password === loginPass);
    if (found) {
      setUser(found);
      sessionStorage.setItem("boletos_user", JSON.stringify(found));
      setLoginError("");
    } else {
      setLoginError("Usuário ou senha incorretos.");
    }
  }

  function handleLogout() {
    setUser(null);
    sessionStorage.removeItem("boletos_user");
    setLoginUser("");
    setLoginPass("");
    setView("dashboard");
  }

  function save(newBoletos) {
    setBoletos(newBoletos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoletos));
  }

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function handleSubmit() {
    if (!form.nf || !form.cliente || !form.valor || !form.vencimento) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    const novo = {
      id: Date.now(),
      ...form,
      valor: parseFloat(form.valor.replace(",", ".")),
      status: "Pendente",
      dataCadastro: today(),
      dataPagamento: null,
      cadastradoPor: user.label,
    };
    save([...boletos, novo]);
    setForm(initialForm);
    showSuccess("Boleto cadastrado com sucesso!");
  }

  function handlePagar(id) {
    const b = boletos.find(x => x.id === id);
    setConfirmPag(b);
    setDataPag(today());
  }

  function confirmarPagamento() {
    const updated = boletos.map(b =>
      b.id === confirmPag.id ? { ...b, status: "Pago", dataPagamento: dataPag, pagoPor: user.label } : b
    );
    save(updated);
    setConfirmPag(null);
    showSuccess("Pagamento registrado com sucesso!");
  }

  const allBoletos = boletos
    .filter(b => filterTipo === "Todos" || b.tipo === filterTipo)
    .filter(b => filterStatus === "Todos" || b.status === filterStatus)
    .filter(b => !searchTerm || b.nf.includes(searchTerm) || b.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPendente = boletos.filter(b => b.status === "Pendente").reduce((s, b) => s + b.valor, 0);
  const totalPago = boletos.filter(b => b.status === "Pago").reduce((s, b) => s + b.valor, 0);
  const vencidos = boletos.filter(b => isVencido(b.vencimento, b.status)).length;

  // LOGIN SCREEN
  if (!user) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={styles.loginLogo}>
            <div style={styles.loginLogoIcon}>A</div>
          </div>
          <div style={styles.loginTitle}>Boletos Antecipações</div>
          <div style={styles.loginSub}>Sistema de Controle de Cobranças</div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Usuário</label>
            <input
              style={styles.input}
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              placeholder="Digite seu usuário"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoComplete="username"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Senha</label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...styles.input, paddingRight: 40 }}
                type={showPass ? "text" : "password"}
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                placeholder="Digite sua senha"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoComplete="current-password"
              />
              <button
                style={styles.eyeBtn}
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {loginError && <div style={styles.loginError}>{loginError}</div>}

          <button style={styles.btnLogin} onClick={handleLogin}>
            Entrar
          </button>

          <div style={styles.loginHint}>
            <div style={styles.hintRow}><span style={styles.hintBadge}>Cobrança</span> usuário: <b>cobranca</b></div>
            <div style={styles.hintRow}><span style={styles.hintBadge}>Contas a Pagar</span> usuário: <b>contaspagar</b></div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP
  const isCobranca = user.role === "cobranca";
  const isContas = user.role === "contas";

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    ...(isCobranca ? [{ id: "cobranca", icon: "⊕", label: "Cobrança" }] : []),
    ...(isContas ? [{ id: "contas", icon: "✓", label: "Contas a Pagar" }] : []),
    { id: "lista", icon: "≡", label: "Todos os Boletos" },
  ];

  return (
    <div style={styles.root}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>A</div>
          <div>
            <div style={styles.logoTitle}>Boletos Antecipações</div>
            <div style={styles.logoSub}>Gestão de Cobranças</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{ ...styles.navBtn, ...(view === item.id ? styles.navBtnActive : {}) }}
              onClick={() => setView(item.id)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.userBox}>
          <div style={styles.userAvatar}>{user.label[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={styles.userName}>{user.label}</div>
            <div style={styles.userRole}>{user.username}</div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout} title="Sair">⏻</button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.headerTitle}>
              {view === "dashboard" && "Visão Geral"}
              {view === "cobranca" && "Cobrança — Envio de Boletos"}
              {view === "contas" && "Contas a Pagar — Registrar Pagamentos"}
              {view === "lista" && "Todos os Boletos"}
            </div>
            <div style={styles.headerSub}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {successMsg && <div style={styles.successBanner}>{successMsg}</div>}
            <div style={styles.headerBadge}>{user.label}</div>
          </div>
        </header>

        <div style={styles.content}>
          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div>
              <div style={styles.cards}>
                <StatCard label="Total Pendente" value={formatCurrency(totalPendente)} color="#f59e0b" icon="⏳" />
                <StatCard label="Total Pago" value={formatCurrency(totalPago)} color="#10b981" icon="✔" />
                <StatCard label="Vencidos" value={vencidos} color="#ef4444" icon="⚠" />
                <StatCard label="Total de NFs" value={boletos.length} color="#6366f1" icon="📄" />
              </div>
              {TIPOS.map(tipo => {
                const lista = boletos.filter(b => b.tipo === tipo);
                const pend = lista.filter(b => b.status === "Pendente");
                const pago = lista.filter(b => b.status === "Pago");
                return (
                  <div key={tipo} style={styles.tipoSection}>
                    <div style={styles.tipoHeader}>
                      <span style={styles.tipoBadge}>{tipo}</span>
                      <span style={styles.tipoCount}>{pend.length} pendente(s) · {pago.length} pago(s)</span>
                    </div>
                    {lista.length === 0
                      ? <div style={styles.empty}>Nenhum boleto cadastrado.</div>
                      : <BoletoTable boletos={lista} onPagar={null} showPagar={false} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* COBRANÇA */}
          {view === "cobranca" && isCobranca && (
            <div style={styles.twoCol}>
              <div style={styles.formCard}>
                <div style={styles.formTitle}>Cadastrar Novo Boleto</div>
                <FormField label="Número da NF *" value={form.nf} onChange={v => setForm({ ...form, nf: v })} placeholder="Ex: 001234" />
                <FormField label="Nome do Cliente *" value={form.cliente} onChange={v => setForm({ ...form, cliente: v })} placeholder="Razão social ou nome" />
                <FormField label="Valor (R$) *" value={form.valor} onChange={v => setForm({ ...form, valor: v })} placeholder="Ex: 1500,00" />
                <FormField label="Vencimento *" value={form.vencimento} onChange={v => setForm({ ...form, vencimento: v })} type="date" />
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Tipo *</label>
                  <select style={styles.select} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Descrição da NF</label>
                  <textarea style={styles.textarea} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do serviço ou produto..." rows={3} />
                </div>
                <button style={styles.btnPrimary} onClick={handleSubmit}>⊕ Cadastrar Boleto</button>
              </div>

              <div style={{ flex: 1 }}>
                <div style={styles.formTitle}>Boletos Cadastrados por Tipo</div>
                {TIPOS.map(tipo => (
                  <div key={tipo} style={{ marginBottom: 28 }}>
                    <div style={styles.tipoBadge}>{tipo}</div>
                    <div style={{ marginTop: 10 }}>
                      {boletos.filter(b => b.tipo === tipo).length === 0
                        ? <div style={styles.empty}>Nenhum boleto.</div>
                        : <BoletoTable boletos={boletos.filter(b => b.tipo === tipo)} onPagar={null} showPagar={false} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTAS A PAGAR */}
          {view === "contas" && isContas && (
            <div>
              <div style={styles.tabs}>
                {TIPOS.map(t => (
                  <button
                    key={t}
                    style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}
                    onClick={() => setActiveTab(t)}
                  >
                    {t}
                    <span style={styles.tabBadge}>
                      {boletos.filter(b => b.tipo === t && b.status === "Pendente").length}
                    </span>
                  </button>
                ))}
              </div>
              {boletos.filter(b => b.tipo === activeTab && b.status === "Pendente").length === 0
                ? <div style={styles.empty}>Nenhum boleto pendente nesta categoria.</div>
                : <BoletoTable boletos={boletos.filter(b => b.tipo === activeTab)} onPagar={handlePagar} showPagar={true} />}
            </div>
          )}

          {/* LISTA GERAL */}
          {view === "lista" && (
            <div>
              <div style={styles.filters}>
                <input style={{ ...styles.input, maxWidth: 260 }} placeholder="🔍 Buscar por NF ou cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <select style={{ ...styles.select, width: "auto" }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                  <option value="Todos">Todos os tipos</option>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
                <select style={{ ...styles.select, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="Todos">Todos os status</option>
                  <option>Pendente</option>
                  <option>Pago</option>
                </select>
              </div>
              {allBoletos.length === 0
                ? <div style={styles.empty}>Nenhum boleto encontrado.</div>
                : <BoletoTable boletos={allBoletos} onPagar={isContas ? handlePagar : null} showPagar={isContas} showTipo={true} />}
            </div>
          )}
        </div>
      </main>

      {/* MODAL PAGAMENTO */}
      {confirmPag && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>Confirmar Pagamento</div>
            <div style={styles.modalInfo}><b>NF:</b> {confirmPag.nf}</div>
            <div style={styles.modalInfo}><b>Cliente:</b> {confirmPag.cliente}</div>
            <div style={styles.modalInfo}><b>Valor:</b> {formatCurrency(confirmPag.valor)}</div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Data do Pagamento</label>
              <input type="date" style={styles.input} value={dataPag} onChange={e => setDataPag(e.target.value)} />
            </div>
            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={() => setConfirmPag(null)}>Cancelar</button>
              <button style={styles.btnSuccess} onClick={confirmarPagamento}>✔ Confirmar Pagamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <div style={{ ...styles.statIcon, color }}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input type={type} style={styles.input} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function BoletoTable({ boletos, onPagar, showPagar, showTipo = false }) {
  function rowStyle(b) {
    if (b.status === "Pago") return { background: "#f0fdf4" };
    if (isVencido(b.vencimento, b.status)) return { background: "#fff1f2" };
    if (isHoje(b.vencimento, b.status)) return { background: "#fffbeb" };
    return {};
  }
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>NF</th>
            <th style={styles.th}>Cliente</th>
            <th style={styles.th}>Valor</th>
            <th style={styles.th}>Vencimento</th>
            {showTipo && <th style={styles.th}>Tipo</th>}
            <th style={styles.th}>Descrição</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Dt. Pagamento</th>
            {showPagar && <th style={styles.th}>Ação</th>}
          </tr>
        </thead>
        <tbody>
          {boletos.map(b => (
            <tr key={b.id} style={rowStyle(b)}>
              <td style={styles.td}><b>{b.nf}</b></td>
              <td style={styles.td}>{b.cliente}</td>
              <td style={styles.td}><b>{formatCurrency(b.valor)}</b></td>
              <td style={styles.td}>
                <span style={{ ...styles.dateChip, ...(isVencido(b.vencimento, b.status) ? styles.chipVencido : isHoje(b.vencimento, b.status) ? styles.chipHoje : {}) }}>
                  {formatDate(b.vencimento)}
                  {isVencido(b.vencimento, b.status) && " ⚠"}
                  {isHoje(b.vencimento, b.status) && " ●"}
                </span>
              </td>
              {showTipo && <td style={styles.td}><span style={styles.tipoBadgeSm}>{b.tipo}</span></td>}
              <td style={{ ...styles.td, color: "#6b7280", fontSize: 12 }}>{b.descricao || "-"}</td>
              <td style={styles.td}>
                <span style={{ ...styles.statusChip, ...(b.status === "Pago" ? styles.chipPago : styles.chipPendente) }}>
                  {b.status}
                </span>
              </td>
              <td style={styles.td}>{b.dataPagamento ? formatDate(b.dataPagamento) : "-"}</td>
              {showPagar && (
                <td style={styles.td}>
                  {b.status === "Pendente" && (
                    <button style={styles.btnPagarSm} onClick={() => onPagar(b.id)}>Pagar</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  // LOGIN
  loginBg: { minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" },
  loginCard: { background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 380, boxShadow: "0 4px 32px #0002" },
  loginLogo: { display: "flex", justifyContent: "center", marginBottom: 16 },
  loginLogoIcon: { width: 56, height: 56, background: "#1c2333", color: "#f59e0b", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900 },
  loginTitle: { textAlign: "center", fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 },
  loginSub: { textAlign: "center", fontSize: 12, color: "#9ca3af", marginBottom: 28 },
  loginError: { background: "#fee2e2", color: "#991b1b", borderRadius: 7, padding: "9px 14px", fontSize: 13, marginBottom: 14, textAlign: "center" },
  btnLogin: { width: "100%", background: "#1c2333", color: "#f59e0b", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif", marginTop: 4, letterSpacing: 0.5 },
  eyeBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0 },
  loginHint: { marginTop: 24, padding: "14px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280" },
  hintRow: { marginBottom: 6 },
  hintBadge: { background: "#1c2333", color: "#f59e0b", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, marginRight: 6 },
  // LAYOUT
  root: { display: "flex", minHeight: "100vh", fontFamily: "Georgia, serif", background: "#f8f7f4", color: "#1a1a1a" },
  sidebar: { width: 230, background: "#1c2333", display: "flex", flexDirection: "column", padding: "28px 0 0", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10 },
  logo: { display: "flex", alignItems: "center", gap: 12, padding: "0 18px 24px", borderBottom: "1px solid #2d3748" },
  logoIcon: { width: 36, height: 36, background: "#f59e0b", color: "#1c2333", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, flexShrink: 0 },
  logoTitle: { color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 0.3 },
  logoSub: { color: "#94a3b8", fontSize: 10, marginTop: 1 },
  nav: { padding: "18px 0", flex: 1 },
  navBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", color: "#94a3b8", padding: "11px 22px", fontSize: 13.5, cursor: "pointer", textAlign: "left", fontFamily: "Georgia, serif", borderLeft: "3px solid transparent" },
  navBtnActive: { color: "#f59e0b", background: "#ffffff0d", borderLeft: "3px solid #f59e0b" },
  navIcon: { fontSize: 16, width: 20, textAlign: "center" },
  userBox: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderTop: "1px solid #2d3748", marginTop: "auto" },
  userAvatar: { width: 32, height: 32, background: "#f59e0b", color: "#1c2333", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 },
  userName: { color: "#e2e8f0", fontSize: 12, fontWeight: 700 },
  userRole: { color: "#64748b", fontSize: 10 },
  logoutBtn: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 },
  main: { marginLeft: 230, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" },
  header: { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 5 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: "#111827" },
  headerSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  headerBadge: { background: "#1c2333", color: "#f59e0b", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700 },
  successBanner: { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7", borderRadius: 8, padding: "10px 18px", fontSize: 13 },
  content: { padding: "28px 32px", flex: 1 },
  cards: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 30 },
  statCard: { background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px #0001" },
  statIcon: { fontSize: 22, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: 700, color: "#111827" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  tipoSection: { marginBottom: 28 },
  tipoHeader: { display: "flex", alignItems: "center", gap: 14, marginBottom: 12 },
  tipoBadge: { background: "#1c2333", color: "#f59e0b", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, display: "inline-block" },
  tipoBadgeSm: { background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" },
  tipoCount: { color: "#6b7280", fontSize: 13 },
  tableWrap: { background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px #0001", overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { background: "#f9fafb", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", fontFamily: "Georgia, serif", letterSpacing: 0.3 },
  td: { padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  statusChip: { borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 },
  chipPago: { background: "#d1fae5", color: "#065f46" },
  chipPendente: { background: "#fef3c7", color: "#92400e" },
  dateChip: { borderRadius: 5, padding: "2px 7px", fontSize: 12 },
  chipVencido: { background: "#fee2e2", color: "#991b1b", fontWeight: 700 },
  chipHoje: { background: "#fef3c7", color: "#92400e", fontWeight: 700 },
  btnPagarSm: { background: "#1c2333", color: "#f59e0b", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 700 },
  twoCol: { display: "flex", gap: 28, alignItems: "flex-start" },
  formCard: { background: "#fff", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px #0001", minWidth: 320, maxWidth: 360 },
  formTitle: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 18, paddingBottom: 10, borderBottom: "2px solid #f59e0b" },
  fieldGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, fontFamily: "Georgia, serif", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fafafa" },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, fontFamily: "Georgia, serif", color: "#111827", background: "#fafafa", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, fontFamily: "Georgia, serif", color: "#111827", resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fafafa" },
  btnPrimary: { width: "100%", background: "#1c2333", color: "#f59e0b", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif", letterSpacing: 0.5, marginTop: 4 },
  tabs: { display: "flex", gap: 8, marginBottom: 22, borderBottom: "2px solid #e5e7eb", paddingBottom: 0 },
  tab: { background: "none", border: "none", padding: "10px 20px", fontSize: 13.5, fontFamily: "Georgia, serif", cursor: "pointer", color: "#6b7280", borderBottom: "3px solid transparent", marginBottom: -2, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 },
  tabActive: { color: "#f59e0b", borderBottom: "3px solid #f59e0b" },
  tabBadge: { background: "#fef3c7", color: "#92400e", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 },
  filters: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  empty: { color: "#9ca3af", fontStyle: "italic", padding: "18px 0", fontSize: 13 },
  overlay: { position: "fixed", inset: 0, background: "#0007", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 14, padding: "30px 32px", minWidth: 340, boxShadow: "0 8px 40px #0003" },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, borderBottom: "2px solid #f59e0b", paddingBottom: 10 },
  modalInfo: { fontSize: 13, marginBottom: 8, color: "#374151" },
  modalBtns: { display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" },
  btnSecondary: { background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" },
  btnSuccess: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" },
};
