"use client";

import { useMemo, useState } from "react";
import {
  Activity, BarChart3, Bell, CalendarDays, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Download, Eye,
  FileText, LayoutDashboard, Menu, MoreHorizontal, Plus, Search, Settings,
  Sparkles, TrendingDown, TrendingUp, UserRound, UsersRound, Wrench, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

type Status = "Confirmado" | "Pendente" | "Em atendimento" | "Concluído" | "Cancelado";
type Appointment = {
  id: number; time: string; end: string; client: string; phone: string;
  service: string; professional: string; value: number; status: Status;
};

const initialAppointments: Appointment[] = [
  { id: 1, time: "09:00", end: "10:00", client: "Mariana Costa", phone: "(11) 98765-4321", service: "Coloração premium", professional: "Camila Alves", value: 280, status: "Confirmado" },
  { id: 2, time: "10:30", end: "11:15", client: "Lucas Mendes", phone: "(11) 99821-1170", service: "Corte masculino", professional: "Rafael Lima", value: 75, status: "Em atendimento" },
  { id: 3, time: "11:30", end: "12:30", client: "Sofia Rodrigues", phone: "(11) 99213-5520", service: "Manicure + pedicure", professional: "Julia Santos", value: 110, status: "Pendente" },
  { id: 4, time: "14:00", end: "15:30", client: "Beatriz Souza", phone: "(11) 98154-9902", service: "Mechas", professional: "Camila Alves", value: 390, status: "Confirmado" },
  { id: 5, time: "16:00", end: "16:45", client: "Ana Paula", phone: "(11) 99711-2408", service: "Escova", professional: "Camila Alves", value: 90, status: "Pendente" },
];

const trend = [
  { day: "01", total: 12 }, { day: "05", total: 18 }, { day: "09", total: 14 },
  { day: "13", total: 24 }, { day: "17", total: 20 }, { day: "21", total: 29 },
  { day: "25", total: 25 }, { day: "30", total: 34 },
];
const statusData = [
  { name: "Concluídos", value: 56, color: "#22b981" },
  { name: "Confirmados", value: 28, color: "#7757d9" },
  { name: "Pendentes", value: 12, color: "#efb83f" },
  { name: "Cancelados", value: 4, color: "#ef6464" },
];

const nav = [
  ["Dashboard", LayoutDashboard], ["Agenda", CalendarDays], ["Agendamentos", Clock3],
  ["Novo agendamento", Plus], ["Clientes", UsersRound], ["Serviços", Wrench],
  ["Profissionais", UserRound], ["Relatórios", BarChart3], ["Configurações", Settings],
] as const;

function StatusPill({ status }: { status: Status }) {
  return <span className={`status status-${status.toLowerCase().replace(" ", "-")}`}><i />{status}</span>;
}

function Metric({ icon: Icon, label, value, delta, color, down = false }: {
  icon: typeof Activity; label: string; value: string; delta: string; color: string; down?: boolean
}) {
  return <article className="metric">
    <div className="metric-top"><span className="metric-icon" style={{ background: `${color}18`, color }}><Icon size={20} /></span><MoreHorizontal size={18} /></div>
    <p>{label}</p><div className="metric-value">{value}</div>
    <span className={down ? "delta down" : "delta"}>{down ? <TrendingDown size={14} /> : <TrendingUp size={14} />}{delta} <small>vs. período anterior</small></span>
  </article>;
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ client: "", phone: "", service: "Corte feminino", professional: "Camila Alves", date: "2026-07-30", time: "17:00", duration: "60", value: "120", status: "Pendente" as Status });

  const filtered = useMemo(() => appointments.filter(a => `${a.client} ${a.service} ${a.professional}`.toLowerCase().includes(query.toLowerCase())), [appointments, query]);

  function notify(message: string) {
    setToast(message); window.setTimeout(() => setToast(""), 2600);
  }
  function updateStatus(id: number, status: Status) {
    setAppointments(a => a.map(item => item.id === id ? { ...item, status } : item));
    notify(`Agendamento marcado como ${status.toLowerCase()}.`);
  }
  function createAppointment(e: React.FormEvent) {
    e.preventDefault();
    const [h, m] = form.time.split(":").map(Number);
    const endMinutes = h * 60 + m + Number(form.duration);
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const conflict = appointments.some(a => a.professional === form.professional && form.time < a.end && end > a.time);
    if (conflict) { notify("Conflito: este profissional já possui um atendimento nesse horário."); return; }
    setAppointments(a => [...a, { id: Date.now(), time: form.time, end, client: form.client, phone: form.phone, service: form.service, professional: form.professional, value: Number(form.value), status: form.status }].sort((a,b) => a.time.localeCompare(b.time)));
    setModal(false); notify("Agendamento salvo com sucesso.");
  }

  function go(page: string) { setActive(page); setSidebar(false); if (page === "Novo agendamento") setModal(true); }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? "open" : ""}`}>
      <button className="close-mobile" onClick={() => setSidebar(false)} aria-label="Fechar menu"><X /></button>
      <div className="brand"><span><CalendarDays size={23} /></span><div>Agenda<b>Pro</b></div></div>
      <div className="company"><span className="avatar">BS</span><div><b>Beauty Studio</b><small>Unidade Jardins</small></div><ChevronDown size={15} /></div>
      <nav><small>MENU PRINCIPAL</small>{nav.map(([label, Icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => go(label)}><Icon size={19} />{label}{label === "Agendamentos" && <em>12</em>}</button>)}</nav>
      <div className="help"><Sparkles size={20} /><b>Precisa de ajuda?</b><small>Nossa equipe está online.</small><button onClick={() => notify("Conversa com o suporte iniciada.")}>Falar com suporte</button></div>
      <div className="profile"><span className="avatar photo">MC</span><div><b>Marina Costa</b><small>Administradora</small></div><MoreHorizontal size={18} /></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setSidebar(true)} aria-label="Abrir menu"><Menu /></button>
        <div className="global-search"><Search size={18} /><input aria-label="Buscar" placeholder="Buscar clientes, agendamentos..." /></div>
        <div className="top-actions"><button className="today"><CalendarDays size={17} /> Hoje, 30 de julho</button><button className="notification" onClick={() => notify("Você tem 3 notificações novas.")}><Bell size={20} /><i /></button><button className="primary" onClick={() => setModal(true)}><Plus size={18} /> Novo agendamento</button></div>
      </header>

      <div className="content">
        {active === "Dashboard" ? <>
          <section className="welcome"><div><p>QUINTA-FEIRA, 30 DE JULHO</p><h1>Bom dia, Marina! <span>👋</span></h1><h2>Veja o que está acontecendo no seu negócio hoje.</h2></div><button className="outline" onClick={() => go("Relatórios")}><FileText size={17} /> Ver relatório do dia</button></section>
          <section className="metrics">
            <Metric icon={CalendarDays} label="Agendamentos de hoje" value={String(appointments.length + 7)} delta="+12,5%" color="#3478f6" />
            <Metric icon={CheckCircle2} label="Concluídos hoje" value="5" delta="+8,2%" color="#22b981" />
            <Metric icon={Clock3} label="Pendentes" value={String(appointments.filter(a => a.status === "Pendente").length)} delta="-4,3%" color="#efb83f" down />
            <Metric icon={Activity} label="Taxa de comparecimento" value="92%" delta="+3,1%" color="#7757d9" />
          </section>

          <section className="chart-grid">
            <article className="panel chart-panel"><div className="panel-head"><div><h3>Visão geral dos agendamentos</h3><p>Últimos 30 dias</p></div><button className="select">Últimos 30 dias <ChevronDown size={15} /></button></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3478f6" stopOpacity={.25}/><stop offset="100%" stopColor="#3478f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#edf1f7"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="total" stroke="#3478f6" strokeWidth={3} fill="url(#fill)"/></AreaChart></ResponsiveContainer></div>
            </article>
            <article className="panel status-panel"><div className="panel-head"><div><h3>Status dos agendamentos</h3><p>Distribuição no mês</p></div><button className="icon-button"><MoreHorizontal /></button></div>
              <div className="donut"><ResponsiveContainer width="58%" height={190}><PieChart><Pie data={statusData} dataKey="value" innerRadius={58} outerRadius={78} paddingAngle={3}>{statusData.map(s => <Cell key={s.name} fill={s.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-label"><strong>248</strong><small>Total</small></div><div className="legend">{statusData.map(s => <div key={s.name}><i style={{background:s.color}}/><span>{s.name}</span><b>{s.value}%</b></div>)}</div></div>
            </article>
          </section>

          <AppointmentsPanel rows={appointments} updateStatus={updateStatus} notify={notify} onAll={() => go("Agendamentos")} />
        </> : active === "Agenda" ? <AgendaView appointments={appointments} onNew={() => setModal(true)} /> : active === "Relatórios" ? <Reports /> :
          <ListView title={active} rows={filtered} query={query} setQuery={setQuery} updateStatus={updateStatus} onNew={() => setModal(true)} />}
      </div>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><form className="modal" onSubmit={createAppointment} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-head"><div><span className="modal-icon"><CalendarDays /></span><div><h2>Novo agendamento</h2><p>Preencha os dados do novo atendimento.</p></div></div><button type="button" onClick={() => setModal(false)}><X /></button></div>
      <div className="form-grid"><label className="wide">Nome do cliente<input required value={form.client} onChange={e => setForm({...form, client:e.target.value})} placeholder="Digite ou selecione um cliente" /></label>
        <label>Telefone / WhatsApp<input required value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="(00) 00000-0000" /></label>
        <label>Serviço<select value={form.service} onChange={e => setForm({...form, service:e.target.value})}><option>Corte feminino</option><option>Coloração premium</option><option>Manicure + pedicure</option><option>Escova</option></select></label>
        <label>Profissional<select value={form.professional} onChange={e => setForm({...form, professional:e.target.value})}><option>Camila Alves</option><option>Rafael Lima</option><option>Julia Santos</option></select></label>
        <label>Data<input type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})}/></label>
        <label>Horário inicial<input type="time" value={form.time} onChange={e => setForm({...form, time:e.target.value})}/></label>
        <label>Duração<select value={form.duration} onChange={e => setForm({...form, duration:e.target.value})}><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1h30</option></select></label>
        <label>Valor (R$)<input type="number" value={form.value} onChange={e => setForm({...form, value:e.target.value})}/></label>
        <label>Status<select value={form.status} onChange={e => setForm({...form, status:e.target.value as Status})}><option>Pendente</option><option>Confirmado</option></select></label>
        <label className="wide">Observações<textarea placeholder="Adicione informações importantes..." /></label>
      </div>
      <div className="reminder"><input type="checkbox" defaultChecked id="reminder"/><label htmlFor="reminder"><b>Enviar lembrete pelo WhatsApp</b><small>O cliente será avisado 24 horas antes.</small></label></div>
      <div className="modal-actions"><button type="button" className="outline" onClick={() => setModal(false)}>Cancelar</button><button className="primary"><CheckCircle2 size={18}/> Salvar agendamento</button></div>
    </form></div>}
    {toast && <div className="toast"><CheckCircle2 size={19}/>{toast}</div>}
  </div>;
}

function AppointmentsPanel({ rows, updateStatus, notify, onAll }: { rows: Appointment[]; updateStatus:(id:number,s:Status)=>void; notify:(s:string)=>void; onAll:()=>void }) {
  return <section className="panel appointments"><div className="panel-head"><div><h3>Agendamentos de hoje</h3><p>{rows.length} atendimentos encontrados para hoje</p></div><button className="link-button" onClick={onAll}>Ver todos <ChevronRight size={16}/></button></div>
    <div className="table-wrap"><table><thead><tr><th>HORÁRIO</th><th>CLIENTE</th><th>SERVIÇO</th><th>PROFISSIONAL</th><th>VALOR</th><th>STATUS</th><th></th></tr></thead><tbody>{rows.slice(0,5).map(a => <tr key={a.id}><td><b className="time">{a.time}</b><small>{a.end}</small></td><td><div className="client"><span className="avatar small">{a.client.split(" ").map(n=>n[0]).join("").slice(0,2)}</span><div><b>{a.client}</b><small>{a.phone}</small></div></div></td><td>{a.service}</td><td><div className="professional"><span className="dot-avatar"/>{a.professional}</div></td><td><b>R$ {a.value.toFixed(2).replace(".",",")}</b></td><td><StatusPill status={a.status}/></td><td><div className="row-actions"><button title="Visualizar" onClick={() => notify(`Visualizando o agendamento de ${a.client}.`)}><Eye size={17}/></button>{a.status === "Pendente" && <button title="Confirmar" onClick={() => updateStatus(a.id,"Confirmado")}><CheckCircle2 size={17}/></button>}<button title="Mais ações" onClick={() => notify("Menu de ações aberto.")}><MoreHorizontal size={18}/></button></div></td></tr>)}</tbody></table></div>
  </section>;
}

function ListView({ title, rows, query, setQuery, updateStatus, onNew }: { title:string; rows:Appointment[]; query:string; setQuery:(s:string)=>void; updateStatus:(id:number,s:Status)=>void; onNew:()=>void }) {
  return <><section className="page-heading"><div><p>GESTÃO</p><h1>{title}</h1><h2>Organize e acompanhe todas as informações em um só lugar.</h2></div><button className="primary" onClick={onNew}><Plus size={18}/> Novo agendamento</button></section>
  <section className="panel management"><div className="filters"><label><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar por cliente, serviço ou profissional"/></label><button className="select">Todos os status <ChevronDown size={15}/></button><button className="select">Todos os profissionais <ChevronDown size={15}/></button><button className="outline"><Download size={17}/> Exportar CSV</button></div>
  <AppointmentsPanel rows={rows} updateStatus={updateStatus} notify={()=>{}} onAll={()=>{}} /></section></>;
}

function AgendaView({ appointments, onNew }: { appointments:Appointment[]; onNew:()=>void }) {
  const days = ["Seg 27","Ter 28","Qua 29","Qui 30","Sex 31","Sáb 01"];
  return <><section className="page-heading"><div><p>AGENDA</p><h1>Calendário de atendimentos</h1><h2>Visualize a disponibilidade da equipe em tempo real.</h2></div><button className="primary" onClick={onNew}><Plus size={18}/> Novo agendamento</button></section>
  <section className="panel calendar"><div className="calendar-tools"><div><button><ChevronLeft/></button><button className="today">Hoje</button><button><ChevronRight/></button><h3>27 de julho – 01 de agosto</h3></div><div><button className="active">Semana</button><button>Dia</button><button>Mês</button><button>Lista</button></div></div>
    <div className="calendar-grid"><div className="corner"/>{days.map(d=><div className={d.includes("30")?"day active": "day"} key={d}>{d}</div>)}{["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"].map((time,i)=><div className="calendar-row" key={time}><div className="hour">{time}</div>{days.map((d,j)=><button key={d} className="slot" onClick={onNew}>{j===3 && appointments.find(a=>a.time.startsWith(String(8+i).padStart(2,"0"))) ? <span className="event">{appointments.find(a=>a.time.startsWith(String(8+i).padStart(2,"0")))?.client}<small>{appointments.find(a=>a.time.startsWith(String(8+i).padStart(2,"0")))?.service}</small></span>:null}</button>)}</div>)}</div>
  </section></>;
}

function Reports() {
  return <><section className="page-heading"><div><p>ANÁLISES</p><h1>Relatórios</h1><h2>Indicadores para tomar decisões melhores.</h2></div><button className="outline"><Download size={17}/> Exportar relatório</button></section>
  <section className="metrics"><Metric icon={CircleDollarSign} label="Receita prevista" value="R$ 28,4 mil" delta="+16,8%" color="#22b981"/><Metric icon={CheckCircle2} label="Receita recebida" value="R$ 24,9 mil" delta="+12,1%" color="#3478f6"/><Metric icon={UsersRound} label="Ticket médio" value="R$ 142,80" delta="+5,4%" color="#7757d9"/><Metric icon={TrendingDown} label="Taxa de cancelamento" value="4,2%" delta="-1,8%" color="#ef6464" down/></section>
  <section className="chart-grid"><article className="panel report-card"><h3>Serviços mais procurados</h3>{[["Coloração premium",88],["Corte feminino",73],["Manicure + pedicure",61],["Escova",45]].map(([n,v])=><div className="bar-row" key={n}><span>{n}</span><div><i style={{width:`${v}%`}}/></div><b>{v}</b></div>)}</article><article className="panel report-card"><h3>Desempenho por profissional</h3>{[["Camila Alves",94],["Rafael Lima",82],["Julia Santos",76],["Paula Nunes",58]].map(([n,v])=><div className="bar-row" key={n}><span>{n}</span><div><i className="purple" style={{width:`${v}%`}}/></div><b>{v}</b></div>)}</article></section></>;
}
