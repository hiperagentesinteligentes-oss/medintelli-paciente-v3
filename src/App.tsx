// src/App.tsx – MedIntelli Paciente V3
// ------------------------------------------------------
// Funcionalidades:
// - Login por CPF + Data de Nascimento
// - Dashboard do paciente
// - Minhas Consultas (próximas / passadas)
// - Agendar consulta (inserindo em appointments com status 'solicitado')
// - Reagendar / cancelar consulta futura
// - Documentos (exames, receitas, PDFs)
// - Chat IA do paciente (OpenAI) + registro em messages_center
// - Layout simples, moderno, alinhado ao App da Clínica
// ------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// =============================
//  SUPABASE CLIENT
// =============================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// =============================
//  TIPOS
// =============================

type View =
  | "dashboard"
  | "consultas"
  | "agenda"
  | "documentos"
  | "chat";

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  document: string | null;
  email: string | null;
  notes: string | null;
};

type Appointment = {
  id: string;
  patient_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  reason: string | null;
};

type DocumentItem = {
  id: string;
  patient_id: string;
  type: string;
  title: string;
  url: string | null;
  notes: string | null;
  created_at: string;
};

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

// =============================
//  LAYOUT BASE
// =============================

function AppShell(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">MedIntelli Paciente</span>
            <span className="text-xs text-slate-500">
              Portal do paciente conectado à clínica
            </span>
          </div>
        </div>
      </header>
      <div className="flex-1 flex flex-col">{props.children}</div>
    </div>
  );
}

// =============================
//  LOGIN
// =============================

function LoginScreen(props: { onLogin: (p: Patient) => void }) {
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function formatCpf(value: string) {
    return value
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Configuração do Supabase ausente.");
      return;
    }
    if (!cpf.trim() || !birth.trim()) {
      setError("Preencha CPF e Data de Nascimento.");
      return;
    }

    setLoading(true);
    setError("");

    // CPF salvo em 'document'
    const documentClean = cpf.replace(/\D/g, "");

    const { data, error } = await supabase
      .from("patients")
      .select("id,name,phone,birth_date,document,email,notes")
      .eq("document", documentClean)
      .eq("birth_date", birth)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error(error);
      setError("Paciente não encontrado. Verifique os dados.");
      setLoading(false);
      return;
    }

    props.onLogin(data as Patient);
    setLoading(false);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-md p-6">
        <h1 className="text-lg font-semibold mb-1 text-center">
          Acesso ao Portal do Paciente
        </h1>
        <p className="text-xs text-slate-500 mb-4 text-center">
          Informe seu CPF e sua data de nascimento para acessar seus dados e
          consultas.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-slate-600">CPF</label>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">
              Data de Nascimento
            </label>
            <input
              type="date"
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================
//  BARRA DE NAVEGAÇÃO DO APP
// =============================

function PatientNavbar(props: {
  view: View;
  onChangeView: (v: View) => void;
  patient: Patient;
  onLogout: () => void;
}) {
  const items: { id: View; label: string }[] = [
    { id: "dashboard", label: "Início" },
    { id: "consultas", label: "Minhas Consultas" },
    { id: "agenda", label: "Agendar Consulta" },
    { id: "documentos", label: "Documentos" },
    { id: "chat", label: "Chat com a Clínica" },
  ];

  return (
    <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => props.onChangeView(item.id)}
            className={`text-xs sm:text-sm px-2 py-1 rounded-md ${
              props.view === item.id
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold">
            {props.patient.name}
          </span>
          <span className="text-[11px] text-slate-500">
            {props.patient.document
              ? props.patient.document.replace(
                  /(\d{3})(\d{3})(\d{3})(\d{2})/,
                  "$1.$2.$3-$4"
                )
              : ""}
          </span>
        </div>
        <button
          onClick={props.onLogout}
          className="text-[11px] text-red-600 hover:underline"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

// =============================
//  DASHBOARD DO PACIENTE
// =============================

function DashboardPaciente(props: {
  patient: Patient;
  appointments: Appointment[];
}) {
  const futuras = props.appointments.filter(
    (a) => new Date(a.start_time) >= new Date()
  );
  const proximas = futuras.slice(0, 3);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">
          Bem-vindo(a), {props.patient.name}
        </h2>
        <p className="text-xs text-slate-600">
          Aqui você pode ver suas consultas, solicitar novas datas, acessar
          documentos (exames, receitas) e conversar com a clínica.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs">
          <div className="text-slate-500 mb-1">Próximas consultas</div>
          {proximas.length === 0 ? (
            <p className="text-slate-600">
              Você não possui consultas futuras.
            </p>
          ) : (
            <ul className="space-y-2">
              {proximas.map((a) => (
                <li key={a.id}>
                  <div className="font-semibold">
                    {new Date(a.start_time).toLocaleString("pt-BR")}
                  </div>
                  <div className="text-slate-600">
                    Status:{" "}
                    <span className="font-medium">{a.status}</span>
                  </div>
                  {a.reason && (
                    <div className="text-slate-500">
                      Motivo: {a.reason}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs">
          <div className="text-slate-500 mb-1">Seus dados</div>
          <div className="space-y-1">
            <div>
              <span className="font-semibold">Telefone: </span>
              {props.patient.phone || "Não informado"}
            </div>
            <div>
              <span className="font-semibold">E-mail: </span>
              {props.patient.email || "Não informado"}
            </div>
            <div>
              <span className="font-semibold">Nascimento: </span>
              {props.patient.birth_date || "Não informado"}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs">
          <div className="text-slate-500 mb-1">Informações importantes</div>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>
              Em caso de emergência, procure imediatamente um pronto-atendimento.
            </li>
            <li>
              Use o chat para dúvidas gerais e orientações de rotina. Não
              substitui consulta médica.
            </li>
            <li>
              Reagende ou cancele sua consulta com antecedência, se necessário.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// =============================
//  MINHAS CONSULTAS
// =============================

function MinhasConsultasSection(props: {
  appointments: Appointment[];
  onReagendar: (a: Appointment) => void;
  onCancelar: (a: Appointment) => void;
}) {
  const futuras = useMemo(
    () =>
      props.appointments.filter(
        (a) => new Date(a.start_time) >= new Date()
      ),
    [props.appointments]
  );
  const passadas = useMemo(
    () =>
      props.appointments.filter(
        (a) => new Date(a.start_time) < new Date()
      ),
    [props.appointments]
  );

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">
          Minhas consultas futuras
        </h2>
        <p className="text-xs text-slate-600 mb-2">
          Você pode solicitar reagendamento ou cancelamento das consultas
          futuras.
        </p>
        {futuras.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhuma consulta futura encontrada.
          </p>
        ) : (
          <div className="overflow-auto max-h-[40vh] text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Data / Hora
                  </th>
                  <th className="border border-slate-200 px-2 py-1">
                    Status
                  </th>
                  <th className="border border-slate-200 px-2 py-1">
                    Motivo
                  </th>
                  <th className="border border-slate-200 px-2 py-1">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {futuras.map((a) => (
                  <tr key={a.id}>
                    <td className="border border-slate-200 px-2 py-1">
                      {new Date(a.start_time).toLocaleString("pt-BR")}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      {a.status}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      {a.reason || "-"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      <button
                        onClick={() => props.onReagendar(a)}
                        className="text-blue-600 hover:underline mr-2"
                      >
                        Reagendar
                      </button>
                      <button
                        onClick={() => props.onCancelar(a)}
                        className="text-red-600 hover:underline"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold mb-1">
          Histórico de consultas
        </h2>
        {passadas.length === 0 ? (
          <p className="text-xs text-slate-500">
            Você ainda não possui histórico de consultas.
          </p>
        ) : (
          <div className="overflow-auto max-h-[40vh] text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Data / Hora
                  </th>
                  <th className="border border-slate-200 px-2 py-1">
                    Status
                  </th>
                  <th className="border border-slate-200 px-2 py-1">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody>
                {passadas.map((a) => (
                  <tr key={a.id}>
                    <td className="border border-slate-200 px-2 py-1">
                      {new Date(a.start_time).toLocaleString("pt-BR")}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      {a.status}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      {a.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================
//  AGENDAR CONSULTA
// =============================

function AgendarSection(props: {
  patient: Patient;
  onAgendado: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMsg("Configuração do Supabase ausente.");
      return;
    }
    if (!date || !time) {
      setMsg("Informe a data e hora desejadas.");
      return;
    }

    setSaving(true);
    setMsg("");

    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + 30 * 60000);

    const { error } = await supabase.from("appointments").insert({
      patient_id: props.patient.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reason: reason || null,
      status: "solicitado", // clínica pode confirmar na agenda
    });

    if (error) {
      console.error(error);
      setMsg(
        "Erro ao solicitar agendamento. Tente novamente mais tarde."
      );
    } else {
      setMsg(
        "Solicitação enviada com sucesso. A clínica irá analisar e confirmar o horário."
      );
      setDate("");
      setTime("");
      setReason("");
      props.onAgendado();
    }

    setSaving(false);
  }

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-4 max-w-lg">
        <h2 className="text-sm font-semibold mb-1">
          Solicitar novo horário de consulta
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          Escolha uma data e um horário aproximado. A clínica poderá ajustar o
          horário de acordo com a agenda disponível.
        </p>
        <form onSubmit={handleSubmit} className="space-y-2 text-sm">
          <div>
            <label className="text-xs text-slate-600">Data desejada *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Horário aproximado *</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">
              Motivo / Observações
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          {msg && <div className="text-xs text-slate-600">{msg}</div>}
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================
//  DOCUMENTOS (EXAMES, RECEITAS)
// =============================

function DocumentosSection(props: { documents: DocumentItem[] }) {
  const exames = props.documents.filter((d) => d.type === "exame");
  const receitas = props.documents.filter((d) => d.type === "receita");
  const outros = props.documents.filter(
    (d) => d.type !== "exame" && d.type !== "receita"
  );

  function renderList(title: string, list: DocumentItem[]) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs">
        <h2 className="text-sm font-semibold mb-2">{title}</h2>
        {list.length === 0 ? (
          <p className="text-slate-500">
            Nenhum documento disponível nesta categoria.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((d) => (
              <li key={d.id}>
                <div className="font-semibold">{d.title}</div>
                <div className="text-slate-500 text-[11px]">
                  Emitido em{" "}
                  {new Date(d.created_at).toLocaleDateString("pt-BR")}
                </div>
                {d.notes && (
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {d.notes}
                  </div>
                )}
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-[11px] hover:underline mt-1 inline-block"
                  >
                    Abrir documento
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <div className="grid md:grid-cols-3 gap-4">
        {renderList("Exames", exames)}
        {renderList("Receitas", receitas)}
        {renderList("Outros Documentos", outros)}
      </div>
    </div>
  );
}

// =============================
//  CHAT COM A CLÍNICA (IA + registro em messages_center)
// =============================

function ChatPacienteSection(props: { patient: Patient }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente virtual da clínica. Como posso te ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    if (!supabase) {
      setError("Configuração do Supabase ausente.");
      return;
    }

    const newUserMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setError("");
    setLoading(true);

    // 1) Registrar mensagem no Supabase (messages_center)
    try {
      const phoneKey =
        props.patient.phone || props.patient.document || props.patient.id;

      await supabase.from("messages_center").insert({
        sender: phoneKey,
        sender_name: props.patient.name,
        phone: props.patient.phone,
        message: newUserMessage.content,
        direction: "in",
        channel: "app",
        category: "informações",
      });
    } catch (e) {
      console.error("Erro ao registrar mensagem (entrada):", e);
    }

    // 2) Chamar OpenAI para resposta
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY as
        | string
        | undefined;
      if (!apiKey) {
        setError(
          "A clínica ainda não configurou a IA. Sua mensagem será analisada pela equipe."
        );
        setLoading(false);
        return;
      }

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system" as const,
            content: `
Você é o assistente do paciente na clínica MedIntelli.
Responda de forma educada, simples e curta.
Não faça diagnóstico médico e não prescreva remédios.
Sempre que houver algo grave, oriente procurar atendimento de urgência.
Nome do paciente: ${props.patient.name}.
          `,
          },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user" as const, content: newUserMessage.content },
        ],
      };

      const resp = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        throw new Error("Erro na API da OpenAI: " + resp.status);
      }

      const data = await resp.json();
      const answer =
        data.choices?.[0]?.message?.content ||
        "Desculpe, não consegui responder agora. Tente novamente mais tarde.";

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: String(answer),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 3) Registrar resposta da IA no Supabase
      try {
        const phoneKey =
          props.patient.phone || props.patient.document || props.patient.id;

        await supabase.from("messages_center").insert({
          sender: "clinica",
          sender_name: "Assistente IA",
          phone: props.patient.phone,
          message: assistantMessage.content,
          direction: "out",
          channel: "app",
          category: "informações",
        });
      } catch (e) {
        console.error("Erro ao registrar mensagem (saída):", e);
      }
    } catch (err) {
      console.error(err);
      setError(
        "Erro ao conversar com a IA. Sua mensagem será analisada pela equipe."
      );
    }

    setLoading(false);
  }

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto flex flex-col">
      <div className="bg-white rounded-lg border border-slate-200 flex-1 flex flex-col max-w-3xl mx-auto">
        <div className="border-b border-slate-200 px-4 py-2">
          <h2 className="text-sm font-semibold">
            Chat com a Clínica / Assistente IA
          </h2>
          <p className="text-[11px] text-slate-500">
            Use este chat para dúvidas gerais e orientações simples. Em caso de
            emergência, procure um pronto-atendimento imediatamente.
          </p>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50 p-3 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`mb-1 flex ${
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-800"
                } text-[11px]`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-[11px] text-slate-500">
              Aguardando resposta da clínica/IA...
            </p>
          )}
        </div>
        <div className="border-t border-slate-200 px-3 py-2">
          {error && (
            <div className="text-[11px] text-red-600 mb-1">{error}</div>
          )}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta ou mensagem..."
              className="flex-1 border rounded-md px-2 py-1 text-xs"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================
//  APP PRINCIPAL
// =============================

export default function App() {
  const [loggedPatient, setLoggedPatient] = useState<Patient | null>(
    null
  );
  const [view, setView] = useState<View>("dashboard");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [reagendarTarget, setReagendarTarget] =
    useState<Appointment | null>(null);
  const [reagendarDate, setReagendarDate] = useState("");
  const [reagendarTime, setReagendarTime] = useState("");
  const [reagendarMsg, setReagendarMsg] = useState("");

  async function loadAppointments(patientId: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setAppointments(data as Appointment[]);
    }
  }

  async function loadDocuments(patientId: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data as DocumentItem[]);
    }
  }

  function handleLogin(p: Patient) {
    setLoggedPatient(p);
    setView("dashboard");
    loadAppointments(p.id);
    loadDocuments(p.id);
  }

  function handleLogout() {
    setLoggedPatient(null);
    setAppointments([]);
    setDocuments([]);
    setView("dashboard");
  }

  async function handleReagendar(a: Appointment) {
    setReagendarTarget(a);
    setReagendarDate(a.start_time.substring(0, 10));
    setReagendarTime(a.start_time.substring(11, 16));
    setReagendarMsg("");
    setView("consultas");
  }

  async function handleCancelar(a: Appointment) {
    if (!supabase) return;
    if (
      !window.confirm(
        "Deseja realmente solicitar o cancelamento desta consulta?"
      )
    )
      return;

    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelado" })
      .eq("id", a.id);

    if (error) {
      console.error(error);
      alert("Erro ao cancelar consulta.");
    } else if (loggedPatient) {
      await loadAppointments(loggedPatient.id);
      alert("Cancelamento registrado com sucesso.");
    }
  }

  async function submitReagendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !loggedPatient || !reagendarTarget) return;
    if (!reagendarDate || !reagendarTime) {
      setReagendarMsg("Informe nova data e horário.");
      return;
    }

    const start = new Date(
      `${reagendarDate}T${reagendarTime}:00`
    ).toISOString();

    const { error } = await supabase
      .from("appointments")
      .update({
        start_time: start,
        status: "solicitado",
      })
      .eq("id", reagendarTarget.id);

    if (error) {
      console.error(error);
      setReagendarMsg(
        "Erro ao solicitar reagendamento. Tente novamente."
      );
    } else {
      setReagendarMsg("Reagendamento solicitado com sucesso.");
      setReagendarTarget(null);
      await loadAppointments(loggedPatient.id);
    }
  }

  function renderReagendarBox() {
    if (!reagendarTarget) return null;
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4 text-xs max-w-lg">
        <h3 className="font-semibold mb-1">
          Reagendar consulta selecionada
        </h3>
        <p className="text-slate-600 mb-2">
          Consulta atual:{" "}
          {new Date(
            reagendarTarget.start_time
          ).toLocaleString("pt-BR")}
        </p>
        <form className="space-y-2" onSubmit={submitReagendamento}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-600">
                Nova data
              </label>
              <input
                type="date"
                value={reagendarDate}
                onChange={(e) => setReagendarDate(e.target.value)}
                className="w-full border rounded-md px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600">
                Novo horário
              </label>
              <input
                type="time"
                value={reagendarTime}
                onChange={(e) => setReagendarTime(e.target.value)}
                className="w-full border rounded-md px-2 py-1 text-xs"
              />
            </div>
          </div>
          {reagendarMsg && (
            <div className="text-[11px] text-slate-600">
              {reagendarMsg}
            </div>
          )}
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-[11px] hover:bg-blue-700"
          >
            Enviar solicitação de reagendamento
          </button>
        </form>
      </div>
    );
  }

  // ============================
  // RENDER
  // ============================

  if (!loggedPatient) {
    return (
      <AppShell>
        <LoginScreen onLogin={handleLogin} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PatientNavbar
        view={view}
        onChangeView={setView}
        patient={loggedPatient}
        onLogout={handleLogout}
      />

      {view === "dashboard" && (
        <DashboardPaciente
          patient={loggedPatient}
          appointments={appointments}
        />
      )}

      {view === "consultas" && (
        <div className="flex-1 flex flex-col">
          <div className="p-4 sm:p-6 overflow-auto">
            {renderReagendarBox()}
            <MinhasConsultasSection
              appointments={appointments}
              onReagendar={handleReagendar}
              onCancelar={handleCancelar}
            />
          </div>
        </div>
      )}

      {view === "agenda" && (
        <AgendarSection
          patient={loggedPatient}
          onAgendado={() => loadAppointments(loggedPatient.id)}
        />
      )}

      {view === "documentos" && (
        <DocumentosSection documents={documents} />
      )}

      {view === "chat" && (
        <ChatPacienteSection patient={loggedPatient} />
      )}
    </AppShell>
  );
}
