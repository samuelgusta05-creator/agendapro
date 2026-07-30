"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Building2, CalendarDays, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, Eye, EyeOff, LayoutDashboard, LoaderCircle,
  LockKeyhole, LogOut, Menu, Plus, Search, ShieldCheck, Sparkles,
  UserPlus, UserRound, UsersRound, X,
} from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SESSION_KEY = "agendapro-auth";
const HUBLA_CHECKOUT_URL = "https://pay.hub.la/Gg7nKJa9s4MozUavPXZr";

type Session = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };
type Profile = { id: string; organization_id: string; full_name: string; email: string; role: string; is_platform_admin: boolean };
type Organization = { id: string; name: string; slug: string; owner_id: string; created_at: string };
type Client = { id: string; organization_id: string; name: string; email?: string; phone?: string; created_at: string };
type Appointment = {
  id: string; organization_id: string; client_id?: string; client_name: string;
  service: string; professional: string; starts_at: string; duration_minutes: number;
  value: number; status: string; created_at: string;
};

async function supabaseFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.msg || body.message || body.error_description || body.error || "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("Visão geral");
  const [sidebar, setSidebar] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [appointmentModal, setAppointmentModal] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return setLoading(false);
    try {
      const parsed = JSON.parse(stored) as Session;
      if (parsed.expires_at && parsed.expires_at * 1000 < Date.now() + 60_000) {
        supabaseFetch<Session>("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: parsed.refresh_token }) }).then(saveSession).catch(logout);
      } else { setSession(parsed); loadWorkspace(parsed); }
    } catch { localStorage.removeItem(SESSION_KEY); setLoading(false); }
  }, []);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 3000); }
  function saveSession(next: Session) { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setSession(next); loadWorkspace(next); }

  async function loadWorkspace(auth: Session) {
    setLoading(true);
    try {
      const profileRows = await supabaseFetch<Profile[]>(`/rest/v1/profiles?id=eq.${auth.user.id}&select=*`, {}, auth.access_token);
      const currentProfile = profileRows[0];
      if (!currentProfile) throw new Error("Seu perfil ainda está sendo preparado. Entre novamente em alguns segundos.");
      setProfile(currentProfile);
      const [orgRows, clientRows, appointmentRows] = await Promise.all([
        supabaseFetch<Organization[]>(`/rest/v1/organizations?id=eq.${currentProfile.organization_id}&select=*`, {}, auth.access_token),
        supabaseFetch<Client[]>("/rest/v1/clients?select=*&order=created_at.desc", {}, auth.access_token),
        supabaseFetch<Appointment[]>("/rest/v1/appointments?select=*&order=starts_at.asc", {}, auth.access_token),
      ]);
      setOrganization(orgRows[0] || null); setClients(clientRows); setAppointments(appointmentRows);
      if (currentProfile.is_platform_admin) {
        const [orgList, clientList, profileList] = await Promise.all([
          supabaseFetch<Organization[]>("/rest/v1/organizations?select=*&order=created_at.desc", {}, auth.access_token),
          supabaseFetch<Client[]>("/rest/v1/clients?select=*", {}, auth.access_token),
          supabaseFetch<Profile[]>("/rest/v1/profiles?select=*", {}, auth.access_token),
        ]);
        setOrganizations(orgList); setAllClients(clientList); setAllProfiles(profileList);
      }
    } catch (error) { notify(error instanceof Error ? error.message : "Falha ao carregar sua conta."); }
    finally { setLoading(false); }
  }

  function logout() { localStorage.removeItem(SESSION_KEY); setSession(null); setProfile(null); setOrganization(null); setLoading(false); }

  if (!SUPABASE_URL || !SUPABASE_KEY) return <Fatal message="A conexão com o banco ainda não foi configurada." />;
  if (loading) return <Loading />;
  if (!session) return <AuthScreen onSession={saveSession} />;

  const confirmed = appointments.filter(item => item.status === "Confirmado").length;
  const pending = appointments.filter(item => item.status === "Pendente").length;
  const revenue = appointments.filter(item => item.status !== "Cancelado").reduce((sum, item) => sum + Number(item.value), 0);
  const nav = [
    { label: "Visão geral", icon: LayoutDashboard },
    { label: "Agendamentos", icon: CalendarDays },
    { label: "Clientes", icon: UsersRound },
    ...(profile?.is_platform_admin ? [{ label: "Painel mestre", icon: ShieldCheck }] : []),
  ];

  return <div className="app">
    <aside className={sidebar ? "sidebar open" : "sidebar"}>
      <button className="mobile-close" onClick={() => setSidebar(false)} aria-label="Fechar menu"><X /></button>
      <Logo />
      <div className="workspace"><span>{organization?.name?.slice(0, 1).toUpperCase() || "A"}</span><div><strong>{organization?.name || "Minha empresa"}</strong><small>Conta profissional</small></div></div>
      <nav><small>MENU PRINCIPAL</small>{nav.map(({ label, icon: Icon }) => <button key={label} className={active === label ? "active" : ""} onClick={() => { setActive(label); setSidebar(false); }}><Icon size={19} />{label}</button>)}</nav>
      <div className="support"><Sparkles size={20} /><strong>AgendaPro para negócios</strong><small>Seus dados ficam separados e protegidos.</small></div>
      <div className="user"><span>{profile?.full_name?.slice(0, 2).toUpperCase() || "US"}</span><div><strong>{profile?.full_name}</strong><small>{profile?.is_platform_admin ? "Administrador da plataforma" : "Proprietário"}</small></div><button onClick={logout} title="Sair"><LogOut size={18} /></button></div>
    </aside>

    <main className="main">
      <header><button className="mobile-menu" onClick={() => setSidebar(true)}><Menu /></button><div className="search"><Search size={18} /><input placeholder="Buscar no AgendaPro" /></div><button className="primary" onClick={() => setAppointmentModal(true)}><Plus size={18} /> Novo agendamento</button></header>
      <div className="content">
        {active === "Visão geral" && <>
          <div className="heading"><div><small>PAINEL DA EMPRESA</small><h1>Olá, {profile?.full_name?.split(" ")[0]}!</h1><p>Acompanhe o movimento da sua empresa em tempo real.</p></div><button className="secondary" onClick={() => setClientModal(true)}><UserPlus size={17} /> Novo cliente</button></div>
          <section className="metrics"><Metric icon={CalendarDays} label="Agendamentos" value={String(appointments.length)} accent="blue" /><Metric icon={CheckCircle2} label="Confirmados" value={String(confirmed)} accent="green" /><Metric icon={Clock3} label="Pendentes" value={String(pending)} accent="amber" /><Metric icon={CircleDollarSign} label="Receita prevista" value={revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} accent="purple" /></section>
          <section className="two-columns"><Panel title="Próximos agendamentos" action="Ver todos" onAction={() => setActive("Agendamentos")}><AppointmentList items={appointments.slice(0, 5)} /></Panel><Panel title="Clientes recentes" action="Ver clientes" onAction={() => setActive("Clientes")}><ClientList items={clients.slice(0, 5)} /></Panel></section>
        </>}
        {active === "Clientes" && <ClientsPage clients={clients} onNew={() => setClientModal(true)} />}
        {active === "Agendamentos" && <AppointmentsPage appointments={appointments} onNew={() => setAppointmentModal(true)} />}
        {active === "Painel mestre" && profile?.is_platform_admin && <MasterDashboard organizations={organizations} clients={allClients} profiles={allProfiles} />}
      </div>
    </main>
    {clientModal && profile && session && <ClientModal organizationId={profile.organization_id} token={session.access_token} onClose={() => setClientModal(false)} onCreated={(client) => { setClients(items => [client, ...items]); setAllClients(items => [client, ...items]); setClientModal(false); notify("Cliente cadastrado com sucesso."); }} />}
    {appointmentModal && profile && session && <AppointmentModal organizationId={profile.organization_id} token={session.access_token} clients={clients} onClose={() => setAppointmentModal(false)} onCreated={(item) => { setAppointments(items => [...items, item].sort((a, b) => a.starts_at.localeCompare(b.starts_at))); setAppointmentModal(false); notify("Agendamento criado com sucesso."); }} />}
    {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
  </div>;
}

function AuthScreen({ onSession }: { onSession: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" });

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      if (mode === "login") {
        const result = await supabaseFetch<Session>("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
        onSession(result);
      } else {
        await supabaseFetch<Session>("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password, data: { full_name: form.name, company_name: form.company } }) });
        window.location.assign(HUBLA_CHECKOUT_URL);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível continuar.";
      setError(message === "Invalid login credentials" ? "E-mail ou senha inválidos." : message);
    } finally { setBusy(false); }
  }
  async function recover() {
    if (!form.email) return setError("Digite seu e-mail primeiro.");
    setBusy(true); setError("");
    try { await supabaseFetch("/auth/v1/recover", { method: "POST", body: JSON.stringify({ email: form.email, redirect_to: window.location.origin }) }); setSuccess("Enviamos as instruções de recuperação para seu e-mail."); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar o e-mail."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-brand"><Logo /><div><span className="eyebrow"><ShieldCheck size={15} /> GESTÃO INTELIGENTE</span><h1>Sua agenda.<br />Seu negócio.<br /><em>Tudo sob controle.</em></h1><p>Tenha clientes, agendamentos e resultados em um sistema profissional, seguro e feito para crescer com sua empresa.</p></div><div className="auth-proof"><CheckCircle2 size={20} /><span><strong>Uma conta por empresa</strong><small>Dados protegidos e separados automaticamente</small></span></div></section>
    <section className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><div className="mobile-logo"><Logo /></div>
      <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>Entrar</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}>Cadastre-se</button></div>
      <div className="auth-title"><span><LockKeyhole size={21} /></span><h2>{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h2><p>{mode === "login" ? "Acesse sua empresa para continuar." : "Comece agora com seu espaço exclusivo."}</p></div>
      {mode === "signup" && <div className="signup-plan">
        <div className="signup-plan-head"><span>PLANO ÚNICO</span><strong>AgendaPro Completo</strong></div>
        <div className="signup-plan-price"><span>Adesão</span><strong>R$ 99,99</strong></div>
        <div className="signup-plan-renewal"><CheckCircle2 size={15} /><span>Depois, <strong>R$ 29,99/mês</strong> a partir de 30 dias</span></div>
        <ul><li><CheckCircle2 size={14} />Agenda e clientes ilimitados</li><li><CheckCircle2 size={14} />Painel completo da empresa</li><li><ShieldCheck size={14} />Pagamento seguro pela Hubla</li></ul>
      </div>}
      {mode === "signup" && <><Field label="Seu nome"><UserRound size={18} /><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" /></Field><Field label="Nome da empresa"><Building2 size={18} /><input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Ex.: Studio Bella" /></Field></>}
      <Field label="E-mail"><UserRound size={18} /><input type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="voce@empresa.com" /></Field>
      <Field label="Senha"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo de 8 caracteres" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></Field>
      {mode === "login" && <button className="forgot" type="button" onClick={recover}>Esqueci minha senha</button>}
      {error && <div className="message error">{error}</div>}{success && <div className="message success">{success}</div>}
      <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={19} /> : mode === "login" ? <LockKeyhole size={18} /> : <UserPlus size={18} />}{busy ? "Aguarde..." : mode === "login" ? "Entrar no AgendaPro" : "Criar conta e ir para pagamento"}</button>
      <p className="terms"><ShieldCheck size={14} /> {mode === "login" ? "Seus dados estão protegidos." : "Ao continuar, você cria sua conta e segue para o pagamento seguro."}</p>
    </form></section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span><div>{children}</div></label>; }
function Logo() { return <div className="logo"><span><CalendarDays size={23} /></span><strong>Agenda<b>Pro</b></strong></div>; }
function Loading() { return <div className="loading"><span><LoaderCircle className="spin" size={28} /></span><strong>Carregando seu AgendaPro...</strong></div>; }
function Fatal({ message }: { message: string }) { return <div className="loading"><span><X size={28} /></span><strong>{message}</strong></div>; }
function Metric({ icon: Icon, label, value, accent }: { icon: typeof CalendarDays; label: string; value: string; accent: string }) { return <article className="metric"><span className={`metric-icon ${accent}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong></div></article>; }
function Panel({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) { return <section className="panel"><div className="panel-head"><h2>{title}</h2><button onClick={onAction}>{action}<ChevronRight size={15} /></button></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <div className="empty"><CalendarDays size={29} /><strong>{text}</strong><small>Cadastre o primeiro item para começar.</small></div>; }
function AppointmentList({ items }: { items: Appointment[] }) {
  if (!items.length) return <Empty text="Nenhum agendamento ainda" />;
  return <div className="list">{items.map(item => <div className="list-row" key={item.id}><span className="list-avatar calendar"><CalendarDays size={18} /></span><div><strong>{item.client_name}</strong><small>{item.service} · {item.professional}</small></div><div className="list-side"><strong>{formatDate(item.starts_at)}</strong><small className={`pill ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</small></div></div>)}</div>;
}
function ClientList({ items }: { items: Client[] }) {
  if (!items.length) return <Empty text="Nenhum cliente cadastrado" />;
  return <div className="list">{items.map(item => <div className="list-row" key={item.id}><span className="list-avatar">{item.name.slice(0, 2).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.email || item.phone || "Sem contato informado"}</small></div><div className="list-side"><small>{formatDate(item.created_at)}</small></div></div>)}</div>;
}
function PageTitle({ eyebrow, title, description, button, onClick }: { eyebrow: string; title: string; description: string; button: string; onClick: () => void }) { return <div className="heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div><button className="primary" onClick={onClick}><Plus size={18} />{button}</button></div>; }
function ClientsPage({ clients, onNew }: { clients: Client[]; onNew: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => clients.filter(item => `${item.name} ${item.email} ${item.phone}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  return <><PageTitle eyebrow="RELACIONAMENTO" title="Clientes" description={`${clients.length} cliente${clients.length === 1 ? "" : "s"} na sua base`} button="Novo cliente" onClick={onNew} /><section className="panel table-panel"><div className="table-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" /></div>{filtered.length ? <table><thead><tr><th>CLIENTE</th><th>CONTATO</th><th>CADASTRO</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.email || "—"}<small>{item.phone || ""}</small></td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table> : <Empty text="Nenhum cliente encontrado" />}</section></>;
}
function AppointmentsPage({ appointments, onNew }: { appointments: Appointment[]; onNew: () => void }) {
  return <><PageTitle eyebrow="OPERAÇÃO" title="Agendamentos" description={`${appointments.length} atendimento${appointments.length === 1 ? "" : "s"} registrado${appointments.length === 1 ? "" : "s"}`} button="Novo agendamento" onClick={onNew} /><section className="panel">{appointments.length ? <div className="appointment-grid">{appointments.map(item => <article key={item.id}><div className="date-badge"><strong>{new Date(item.starts_at).getDate()}</strong><small>{new Date(item.starts_at).toLocaleDateString("pt-BR", { month: "short" })}</small></div><div><h3>{item.client_name}</h3><p>{item.service} com {item.professional}</p><small>{formatDate(item.starts_at)} · {item.duration_minutes} min</small></div><span className={`pill ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></article>)}</div> : <Empty text="Nenhum agendamento registrado" />}</section></>;
}
function MasterDashboard({ organizations, clients, profiles }: { organizations: Organization[]; clients: Client[]; profiles: Profile[] }) {
  return <><div className="heading master-heading"><div><small>ADMINISTRAÇÃO DA PLATAFORMA</small><h1>Painel mestre</h1><p>Visão consolidada de todas as empresas cadastradas.</p></div><span><ShieldCheck size={18} /> Acesso exclusivo</span></div><section className="metrics master-metrics"><Metric icon={Building2} label="Empresas clientes" value={String(organizations.length)} accent="blue" /><Metric icon={UserRound} label="Usuários cadastrados" value={String(profiles.length)} accent="purple" /><Metric icon={UsersRound} label="Clientes das empresas" value={String(clients.length)} accent="green" /><Metric icon={BarChart3} label="Média por empresa" value={organizations.length ? (clients.length / organizations.length).toFixed(1) : "0"} accent="amber" /></section><section className="panel table-panel"><div className="panel-head"><h2>Clientes da plataforma</h2><small>Atualizado em tempo real</small></div>{organizations.length ? <table><thead><tr><th>EMPRESA</th><th>USUÁRIOS</th><th>CLIENTES CADASTRADOS</th><th>CRIADA EM</th></tr></thead><tbody>{organizations.map(org => <tr key={org.id}><td><strong>{org.name}</strong><small>{org.slug}</small></td><td>{profiles.filter(item => item.organization_id === org.id).length}</td><td><b className="count">{clients.filter(item => item.organization_id === org.id).length}</b></td><td>{formatDate(org.created_at)}</td></tr>)}</tbody></table> : <Empty text="Nenhuma empresa cadastrada" />}</section></>;
}

function ClientModal({ organizationId, token, onClose, onCreated }: { organizationId: string; token: string; onClose: () => void; onCreated: (client: Client) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const rows = await supabaseFetch<Client[]>("/rest/v1/clients", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...form, organization_id: organizationId }) }, token); onCreated(rows[0]); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível cadastrar."); setBusy(false); } }
  return <Modal title="Novo cliente" subtitle="Adicione uma pessoa à base da sua empresa." onClose={onClose}><form onSubmit={submit}><div className="modal-fields"><label className="wide">Nome completo<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>E-mail<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Telefone / WhatsApp<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label></div>{error && <div className="message error">{error}</div>}<ModalActions busy={busy} onClose={onClose} label="Salvar cliente" /></form></Modal>;
}
function AppointmentModal({ organizationId, token, clients, onClose, onCreated }: { organizationId: string; token: string; clients: Client[]; onClose: () => void; onCreated: (item: Appointment) => void }) {
  const [form, setForm] = useState({ client_id: "", client_name: "", service: "", professional: "", starts_at: "", duration_minutes: "60", value: "", status: "Pendente" }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function selectClient(id: string) { const client = clients.find(item => item.id === id); setForm({ ...form, client_id: id, client_name: client?.name || "" }); }
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const payload = { ...form, client_id: form.client_id || null, organization_id: organizationId, duration_minutes: Number(form.duration_minutes), value: Number(form.value || 0), starts_at: new Date(form.starts_at).toISOString() }; const rows = await supabaseFetch<Appointment[]>("/rest/v1/appointments", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }, token); onCreated(rows[0]); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível agendar."); setBusy(false); } }
  return <Modal title="Novo agendamento" subtitle="Registre um atendimento na agenda da empresa." onClose={onClose}><form onSubmit={submit}><div className="modal-fields"><label>Cliente<select required value={form.client_id} onChange={e => selectClient(e.target.value)}><option value="">Selecione</option>{clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Serviço<input required value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="Ex.: Corte e escova" /></label><label>Profissional<input required value={form.professional} onChange={e => setForm({ ...form, professional: e.target.value })} /></label><label>Data e horário<input type="datetime-local" required value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></label><label>Duração<select value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })}><option value="30">30 minutos</option><option value="60">1 hora</option><option value="90">1h30</option></select></label><label>Valor (R$)<input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></label></div>{error && <div className="message error">{error}</div>}<ModalActions busy={busy} onClose={onClose} label="Criar agendamento" /></form></Modal>;
}
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span><CalendarDays size={21} /></span><div><h2>{title}</h2><p>{subtitle}</p></div></div><button onClick={onClose}><X /></button></div>{children}</section></div>; }
function ModalActions({ busy, onClose, label }: { busy: boolean; onClose: () => void; label: string }) { return <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />}{busy ? "Salvando..." : label}</button></div>; }
