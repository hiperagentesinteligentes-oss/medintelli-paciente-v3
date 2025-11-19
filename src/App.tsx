// App.tsx - MedIntelli Paciente V3 (arquivo único)
// -------------------------------------------------
// DEPENDÊNCIAS: "react", "react-dom", "@supabase/supabase-js"
// VARS AMBIENTE: mesmo Supabase + OpenAI da clínica
// -------------------------------------------------
// TABELAS ADICIONAIS SUGERIDAS:
//
// alter table patients add column cpf text;
// alter table patients add column email text;
//
// create table patient_documents (
//   id uuid primary key default gen_random_uuid(),
//   patient_id uuid references patients(id) on delete cascade,
//   type text, -- "exame", "receita", "atestado", etc.
//   title text,
//   url text,
//   created_at timestamptz default now()
// );
//
// create table patient_messages (
//   id uuid primary key default gen_random_uuid(),
//   patient_id uuid references patients(id) on delete cascade,
//   channel text default 'whatsapp',
//   content text,
//   created_at timestamptz default now()
// );
//
// (appointments é compartilhada com a clínica.)

import React, { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrlP = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKeyP = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseP: SupabaseClient = createClient(supabaseUrlP, supabaseKeyP);

type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
};

type Appointment = {
  id: string;
  start_time: string;
  status: string;
  reason: string | null;
};

type Document = {
  id: string;
  type: string | null;
  title: string | null;
  url: string | null;
  created_at: string;
};

type Message = {
  id: string;
  channel: string | null;
  content: string | null;
  created_at: string;
};

type PacSection =
  | "home"
  | "consultas"
  | "agendar"
  | "chat"
  | "documentos"
  | "mensagens";

type ChatMsg = { role: "user" | "assistant"; content: string };

const PATIENT_KB = `
Você é o assistente voltado ao paciente da clínica MedIntelli.
Forneça respostas amigáveis e simples sobre:
- agendamento de consultas
- retornos
- preparo de exames
- orientações gerais
Nunca dê diagnóstico nem medicamentos. Oriente a procurar o médico.
`;

function LoginPaciente(props: { onLogin: (p: Patient) => void }) {
  const [cpf, setCpf] = useState("");
  const [nasc, setNasc] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cpf.trim() || !nasc) {
      setError("Informe CPF e data de nascimento.");
      return;
    }

    const { data, error } = await supabaseP
      .from("patients")
      .select("*")
      .eq("cpf", cpf.trim())
      .eq("birth_date", nasc)
      .maybeSingle();

    if (error) {
      console.error(error);
      setError("Erro ao buscar paciente.");
    } else if (!data) {
      setError("Não encontramos cadastro com estes dados.");
    } else {
      const patient = data as Patient;
      localStorage.setItem(
        "medintelli_paciente_session",
        JSON.stringify(patient)
      );
      props.onLogin(patient);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e8f2ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>
          MedIntelli Paciente
        </h1>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Informe seus dados para acessar o portal do paciente.
        </p>
        <form
          onSubmit={handleLogin}
          style={{ display: "grid", gap: 8, marginTop: 8 }}
        >
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="CPF"
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <input
            type="date"
            value={nasc}
            onChange={(e) => setNasc(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          />
          {error && (
            <p style={{ color: "red", fontSize: 12, margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#1a73e8",
              color: "#fff",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

function HeaderPaciente(props: {
  patient: Patient;
  section: PacSection;
  onChangeSection: (s: PacSection) => void;
  onLogout: () => void;
}) {
  const items: { id: PacSection; label: string }[] = [
    { id: "home", label: "Início" },
    { id: "consultas", label: "Minhas Consultas" },
    { id: "agendar", label: "Agendar/Reagendar" },
    { id: "chat", label: "Chat IA" },
    { id: "documentos", label: "Exames e Receitas" },
    { id: "mensagens", label: "Mensagens" },
  ];

  return (
    <header
      style={{
        background: "#1a73e8",
        color: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <strong>MedIntelli Paciente</strong>
        <div style={{ fontSize: 12 }}>
          Olá, {props.patient.name || "Paciente"}!
        </div>
      </div>
      <nav style={{ display: "flex", gap: 6, fontSize: 13 }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => props.onChangeSection(item.id)}
            style={{
              border: "none",
              background:
                props.section === item.id ? "rgba(255,255,255,0.2)" : "transparent",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={props.onLogout}
          style={{
            border: "none",
            background: "rgba(0,0,0,0.15)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </nav>
    </header>
  );
}

function HomePaciente(props: { patient: Patient }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Resumo do Paciente</h2>
      <div
        style={{
          maxWidth: 480,
          background: "#fff",
          padding: 16,
          borderRadius: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          fontSize: 14,
        }}
      >
        <p>
          <strong>Nome:</strong> {props.patient.name}
        </p>
        <p>
          <strong>CPF:</strong> {props.patient.cpf || "-"}
        </p>
        <p>
          <strong>E-mail:</strong> {props.patient.email || "-"}
        </p>
        <p>
          <strong>Telefone:</strong> {props.patient.phone || "-"}
        </p>
        <p>
          <strong>Data de nascimento:</strong>{" "}
          {props.patient.birth_date || "-"}
        </p>
      </div>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Aqui você acompanha suas consultas, solicita novos horários, acessa
        exames, receitas e pode tirar dúvidas pelo Chat IA.
      </p>
    </div>
  );
}

function ConsultasSectionPaciente(props: { patient: Patient }) {
  const [future, setFuture] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabaseP
        .from("appointments")
        .select("id,start_time,status,reason")
        .eq("patient_id", props.patient.id)
        .order("start_time", { ascending: true });

      if (error) {
        console.error(error);
        alert("Erro ao carregar consultas.");
        setLoading(false);
        return;
      }

      const now = new Date();
      const fut: Appointment[] = [];
      const pst: Appointment[] = [];
      (data || []).forEach((a: any) => {
        const dt = new Date(a.start_time);
        if (dt >= now) fut.push(a as Appointment);
        else pst.push(a as Appointment);
      });

      setFuture(fut);
      setPast(pst);
      setLoading(false);
    }
    load();
  }, [props.patient.id]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Minhas Consultas</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <h3>Próximas consultas</h3>
          {future.length === 0 ? (
            <p>Nenhuma consulta futura agendada.</p>
          ) : (
            <ul style={{ fontSize: 14 }}>
              {future.map((a) => (
                <li key={a.id}>
                  {new Date(a.start_time).toLocaleString("pt-BR")} —{" "}
                  {a.status} — {a.reason || "Consulta"}
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: 16 }}>Consultas anteriores</h3>
          {past.length === 0 ? (
            <p>Nenhuma consulta anterior registrada.</p>
          ) : (
            <ul style={{ fontSize: 14 }}>
              {past.map((a) => (
                <li key={a.id}>
                  {new Date(a.start_time).toLocaleString("pt-BR")} —{" "}
                  {a.status} — {a.reason || "Consulta"}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function AgendarSectionPaciente(props: { patient: Patient }) {
  const [form, setForm] = useState({
    date: "",
    time: "",
    reason: "",
  });
  const [selected, setSelected] = useState<string>("");
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabaseP
      .from("appointments")
      .select("id,start_time,status,reason")
      .eq("patient_id", props.patient.id)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar consultas.");
    } else {
      setMyAppointments((data || []) as Appointment[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [props.patient.id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function solicitarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) return;
    const start = new Date(`${form.date}T${form.time}:00`);
    const { error } = await supabaseP.from("appointments").insert({
      patient_id: props.patient.id,
      start_time: start.toISOString(),
      reason: form.reason || "Solicitação via portal",
      status: "solicitado",
    });
    if (error) {
      console.error(error);
      alert("Erro ao solicitar agendamento.");
    } else {
      alert("Solicitação enviada. A clínica confirmará o horário.");
      setForm({ date: "", time: "", reason: "" });
      await load();
    }
  }

  async function cancelar(id: string) {
    if (!window.confirm("Deseja realmente solicitar cancelamento?")) return;
    const { error } = await supabaseP
      .from("appointments")
      .update({ status: "cancelamento_solicitado" })
      .eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao solicitar cancelamento.");
    } else {
      await load();
    }
  }

  async function reagendar(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !form.date || !form.time) return;
    const start = new Date(`${form.date}T${form.time}:00`);
    const { error } = await supabaseP
      .from("appointments")
      .update({
        start_time: start.toISOString(),
        status: "reagendamento_solicitado",
      })
      .eq("id", selected);
    if (error) {
      console.error(error);
      alert("Erro ao solicitar reagendamento.");
    } else {
      alert("Reagendamento solicitado. A clínica confirmará o novo horário.");
      setSelected("");
      setForm({ date: "", time: "", reason: "" });
      await load();
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Agendar / Reagendar / Cancelar</h2>
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <form
          onSubmit={solicitarAgendamento}
          style={{
            flex: 1,
            minWidth: 260,
            maxWidth: 360,
            background: "#fff",
            padding: 16,
            borderRadius: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h3>Nova solicitação de consulta</h3>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 4, width: "100%" }}
          />
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 8, width: "100%" }}
          />
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Motivo / Observações"
            rows={3}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
              width: "100%",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#1a73e8",
              color: "#fff",
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            Enviar solicitação
          </button>
        </form>

        <div
          style={{
            flex: 1,
            minWidth: 260,
            maxWidth: 420,
          }}
        >
          <h3>Minhas consultas para reagendar/cancelar</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : myAppointments.length === 0 ? (
            <p>Nenhuma consulta registrada.</p>
          ) : (
            <ul style={{ fontSize: 13 }}>
              {myAppointments.map((a) => (
                <li key={a.id}>
                  <label>
                    <input
                      type="radio"
                      name="sel"
                      checked={selected === a.id}
                      onChange={() => setSelected(a.id)}
                      style={{ marginRight: 6 }}
                    />
                    {new Date(a.start_time).toLocaleString("pt-BR")} —{" "}
                    {a.status} — {a.reason || "Consulta"}
                  </label>{" "}
                  <button onClick={() => cancelar(a.id)}>Cancelar</button>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={reagendar}
            style={{
              marginTop: 12,
              display: "grid",
              gap: 6,
              maxWidth: 360,
            }}
          >
            <h4>Reagendar consulta selecionada</h4>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <button
              type="submit"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                background: "#1a73e8",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Solicitar reagendamento
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChatPacienteSection() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente da clínica. Posso ajudar com dúvidas sobre consultas, retornos e orientações gerais.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
      if (!apiKey) {
        setError("VITE_OPENAI_API_KEY não configurado.");
        setLoading(false);
        return;
      }

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system" as const, content: PATIENT_KB },
          ...newMessages,
        ],
      };

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error("Erro API OpenAI: " + resp.status);
      }

      const data = await resp.json();
      const answer =
        data.choices?.[0]?.message?.content ||
        "Não consegui responder agora. Tente novamente em instantes.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(answer) },
      ]);
    } catch (err) {
      console.error(err);
      setError("Erro ao conversar com a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Chat IA do Paciente</h2>
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        Use este chat apenas para dúvidas gerais. Em caso de urgência, procure
        atendimento médico imediatamente.
      </p>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          padding: 10,
          height: 360,
          overflowY: "auto",
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.role === "user" ? "right" : "left",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: 10,
                background: m.role === "user" ? "#1a73e8" : "#e0e0e0",
                color: m.role === "user" ? "#fff" : "#000",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                fontSize: 14,
              }}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p>IA respondendo...</p>}
      </div>
      {error && <p style={{ color: "red", fontSize: 12 }}>{error}</p>}
      <form
        onSubmit={handleSend}
        style={{ display: "flex", gap: 8, marginTop: 8 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua dúvida..."
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function DocumentosSection(props: { patient: Patient }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabaseP
        .from("patient_documents")
        .select("*")
        .eq("patient_id", props.patient.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert("Erro ao carregar documentos.");
      } else {
        setDocs((data || []) as Document[]);
      }
      setLoading(false);
    }
    load();
  }, [props.patient.id]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Exames, Receitas e Documentos</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : docs.length === 0 ? (
        <p>Nenhum documento disponível.</p>
      ) : (
        <ul style={{ fontSize: 14 }}>
          {docs.map((d) => (
            <li key={d.id}>
              <strong>{d.type || "Documento"}:</strong> {d.title || "-"} —{" "}
              {new Date(d.created_at).toLocaleString("pt-BR")}{" "}
              {d.url && (
                <a href={d.url} target="_blank" style={{ marginLeft: 8 }}>
                  Abrir
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MensagensSection(props: { patient: Patient }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabaseP
        .from("patient_messages")
        .select("*")
        .eq("patient_id", props.patient.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error(error);
        alert("Erro ao carregar mensagens.");
      } else {
        setMsgs((data || []) as Message[]);
      }
      setLoading(false);
    }
    load();
  }, [props.patient.id]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Mensagens da Clínica</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : msgs.length === 0 ? (
        <p>Nenhuma mensagem registrada.</p>
      ) : (
        <ul style={{ fontSize: 14 }}>
          {msgs.map((m) => (
            <li key={m.id}>
              <strong>[{m.channel || "canal"}]</strong>{" "}
              {new Date(m.created_at).toLocaleString("pt-BR")} —{" "}
              {m.content || ""}
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
        Estas mensagens podem ser alimentadas por integrações de WhatsApp, SMS
        ou e-mail, registrando automaticamente tudo que é enviado ao paciente.
      </p>
    </div>
  );
}

// ------- App principal Paciente -------
export default function App() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [section, setSection] = useState<PacSection>("home");

  useEffect(() => {
    const raw = localStorage.getItem("medintelli_paciente_session");
    if (raw) {
      try {
        const p = JSON.parse(raw) as Patient;
        setPatient(p);
      } catch {
        // ignore
      }
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("medintelli_paciente_session");
    setPatient(null);
    setSection("home");
  }

  if (!patient) {
    return <LoginPaciente onLogin={setPatient} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f7fb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <HeaderPaciente
        patient={patient}
        section={section}
        onChangeSection={setSection}
        onLogout={handleLogout}
      />
      <main style={{ flex: 1 }}>
        {section === "home" && <HomePaciente patient={patient} />}
        {section === "consultas" && (
          <ConsultasSectionPaciente patient={patient} />
        )}
        {section === "agendar" && (
          <AgendarSectionPaciente patient={patient} />
        )}
        {section === "chat" && <ChatPacienteSection />}
        {section === "documentos" && (
          <DocumentosSection patient={patient} />
        )}
        {section === "mensagens" && (
          <MensagensSection patient={patient} />
        )}
      </main>
    </div>
  );
}
