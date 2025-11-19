// App.tsx – MedIntelli Paciente V3 (arquivo único)

// Requisitos:
// 1) Mesma base Supabase do app da clínica (patients, appointments).
// 2) Campo cpf em patients (para login).
// 3) Variáveis de ambiente:
//    VITE_SUPABASE_URL
//    VITE_SUPABASE_ANON_KEY
//    VITE_OPENAI_API_KEY

import React, { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

type Section =
  | "login"
  | "home"
  | "consultas"
  | "agendar"
  | "chat"
  | "dados"
  | "docs";

type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
};

type Appointment = {
  id: string;
  start_time: string;
  status: string;
  reason: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PATIENT_KB = `
Você é o assistente de pacientes da clínica MedIntelli.

Regras:
- Responda com empatia, clareza e educação.
- Ajude o paciente a entender: agendamentos, retornos, horários, orientações gerais.
- NÃO faça diagnóstico, NÃO prescreva medicamentos.
- Em urgência, oriente procurar pronto-atendimento ou ligar para a clínica.
`;

// ----------------------
// Layout simples
// ----------------------
function TopBar(props: {
  patient: Patient;
  onChangeSection: (s: Section) => void;
  onLogout: () => void;
}) {
  return (
    <header
      style={{
        background: "#1a73e8",
        color: "#fff",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>MedIntelli Paciente</div>
        <div style={{ fontSize: 13 }}>
          Olá, <b>{patient.name}</b>
        </div>
      </div>
      <nav style={{ display: "flex", gap: 8, fontSize: 13 }}>
        <button onClick={() => props.onChangeSection("home")}>Início</button>
        <button onClick={() => props.onChangeSection("consultas")}>
          Minhas consultas
        </button>
        <button onClick={() => props.onChangeSection("agendar")}>
          Agendar
        </button>
        <button onClick={() => props.onChangeSection("chat")}>
          Chat com a clínica
        </button>
        <button onClick={() => props.onChangeSection("dados")}>Meus dados</button>
        <button onClick={() => props.onChangeSection("docs")}>Documentos</button>
        <button onClick={props.onLogout}>Sair</button>
      </nav>
    </header>
  );
}

// ----------------------
// Login (A: CPF)
// ----------------------
function LoginScreen(props: {
  onLoggedIn: (p: Patient) => void;
}) {
  const [loginMode, setLoginMode] = useState<"cpf" | "account" | "whatsapp">(
    "cpf"
  );
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCpfLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!cpf.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id,name,cpf,phone,birth_date,notes")
        .eq("cpf", cpf.trim())
        .maybeSingle();

      if (error) {
        console.error(error);
        setError("Erro ao buscar paciente. Tente novamente.");
      } else if (!data) {
        setError(
          "CPF não encontrado. Verifique se seu cadastro está atualizado na clínica."
        );
      } else {
        const patient = data as Patient;
        localStorage.setItem("medintelli_patient_id", patient.id);
        props.onLoggedIn(patient);
      }
    } catch (e) {
      console.error(e);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            marginBottom: 4,
            textAlign: "center",
            color: "#1a3f8b",
          }}
        >
          MedIntelli Paciente
        </h1>
        <p
          style={{
            fontSize: 13,
            textAlign: "center",
            marginBottom: 12,
            color: "#555",
          }}
        >
          Acompanhe suas consultas, dados e recados da clínica.
        </p>

        {/* Abas de login */}
        <div
          style={{
            display: "flex",
            borderRadius: 999,
            background: "#eef2ff",
            padding: 3,
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => setLoginMode("cpf")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 999,
              padding: "6px 8px",
              fontSize: 12,
              cursor: "pointer",
              background: loginMode === "cpf" ? "#1a73e8" : "transparent",
              color: loginMode === "cpf" ? "#fff" : "#333",
            }}
          >
            CPF (ativo)
          </button>
          <button
            onClick={() => setLoginMode("account")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 999,
              padding: "6px 8px",
              fontSize: 12,
              cursor: "pointer",
              background: loginMode === "account" ? "#1a73e8" : "transparent",
              color: loginMode === "account" ? "#fff" : "#333",
            }}
          >
            Conta (em breve)
          </button>
          <button
            onClick={() => setLoginMode("whatsapp")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 999,
              padding: "6px 8px",
              fontSize: 12,
              cursor: "pointer",
              background: loginMode === "whatsapp" ? "#1a73e8" : "transparent",
              color: loginMode === "whatsapp" ? "#fff" : "#333",
            }}
          >
            WhatsApp (em breve)
          </button>
        </div>

        {loginMode === "cpf" && (
          <form onSubmit={handleCpfLogin} style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 12 }}>Digite seu CPF</label>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Somente números"
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
            {error && (
              <div style={{ color: "red", fontSize: 12 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#1a73e8",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <p style={{ fontSize: 11, color: "#777", marginTop: 6 }}>
              Se o CPF não estiver cadastrado, entre em contato com a clínica.
            </p>
          </form>
        )}

        {loginMode === "account" && (
          <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Login com conta (e-mail/senha) será habilitado em breve, usando um
            cadastro próprio vinculado ao seu prontuário.
          </div>
        )}

        {loginMode === "whatsapp" && (
          <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Login via WhatsApp (código enviado pelo AVISA API) será habilitado
            em breve. A arquitetura já está preparada para isso.
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------
// Seções do paciente
// ----------------------
function HomeSection(props: {
  patient: Patient;
  nextAppointment: Appointment | null;
}) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Bem-vindo(a), {props.patient.name}</h2>
      <p style={{ marginBottom: 10 }}>
        Aqui você acompanha suas consultas, dados e pode conversar com a
        clínica.
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>Próxima consulta</h3>
          {props.nextAppointment ? (
            <>
              <p style={{ fontSize: 14 }}>
                <b>
                  {new Date(
                    props.nextAppointment.start_time
                  ).toLocaleString("pt-BR")}
                </b>
              </p>
              <p style={{ fontSize: 13 }}>
                Status: {props.nextAppointment.status}{" "}
                {props.nextAppointment.reason &&
                  `– ${props.nextAppointment.reason}`}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "#666" }}>
              Você não tem consultas futuras agendadas.
            </p>
          )}
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>
            Atalhos rápidos
          </h3>
          <ul style={{ fontSize: 13, paddingLeft: 18 }}>
            <li>Visualizar ou reagendar consultas</li>
            <li>Falar com a clínica pelo chat</li>
            <li>Acessar seus dados e observações</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ConsultasSection(props: { patient: Patient }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,start_time,status,reason,patient_id")
      .eq("patient_id", props.patient.id)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setAppointments(
        data.map((a) => ({
          id: a.id,
          start_time: a.start_time,
          status: a.status,
          reason: a.reason,
        })) as Appointment[]
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const future = appointments.filter(
    (a) => new Date(a.start_time).getTime() >= Date.now()
  );
  const past = appointments.filter(
    (a) => new Date(a.start_time).getTime() < Date.now()
  );

  return (
    <div style={{ padding: 16 }}>
      <h2>Minhas consultas</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <h3>Próximas</h3>
          {future.length === 0 ? (
            <p style={{ fontSize: 13 }}>Nenhuma consulta futura.</p>
          ) : (
            <ul>
              {future.map((a) => (
                <li key={a.id} style={{ marginBottom: 4, fontSize: 13 }}>
                  {new Date(a.start_time).toLocaleString("pt-BR")} –{" "}
                  {a.status} – {a.reason || "Sem descrição"}
                </li>
              ))}
            </ul>
          )}

          <h3>Histórico</h3>
          {past.length === 0 ? (
            <p style={{ fontSize: 13 }}>Nenhuma consulta anterior.</p>
          ) : (
            <ul>
              {past.map((a) => (
                <li key={a.id} style={{ marginBottom: 4, fontSize: 13 }}>
                  {new Date(a.start_time).toLocaleString("pt-BR")} –{" "}
                  {a.status} – {a.reason || "Sem descrição"}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function AgendarSection(props: { patient: Patient }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    setSaving(true);
    setMessage("");

    try {
      const start = new Date(`${date}T${time}:00`);
      const { error } = await supabase.from("appointments").insert({
        patient_id: props.patient.id,
        start_time: start.toISOString(),
        reason: reason || null,
        status: "agendado", // clínica pode mudar para confirmado
      });

      if (error) {
        console.error(error);
        setMessage("Erro ao solicitar agendamento.");
      } else {
        setMessage(
          "Solicitação registrada. A clínica irá confirmar o horário."
        );
        setDate("");
        setTime("");
        setReason("");
      }
    } catch (e) {
      console.error(e);
      setMessage("Erro inesperado ao agendar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Agendar consulta</h2>
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        Escolha uma data e horário preferencial. A clínica irá confirmar ou
        sugerir outro horário.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 8, maxWidth: 360 }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo / Observações (opcional)"
          rows={3}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {saving ? "Enviando..." : "Solicitar agendamento"}
        </button>
        {message && (
          <div style={{ fontSize: 12, color: "#555" }}>{message}</div>
        )}
      </form>
    </div>
  );
}

function ChatPacienteSection(props: { patient: Patient }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente virtual da clínica MedIntelli. Como posso ajudar você hoje?",
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
          {
            role: "system" as const,
            content: `Nome do paciente: ${props.patient.name}. CPF: ${
              props.patient.cpf || "não informado"
            }.`,
          },
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
        "Desculpe, não consegui responder agora.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(answer) },
      ]);
    } catch (e) {
      console.error(e);
      setError("Erro ao conversar com a IA. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Chat com a clínica</h2>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
        Use este canal para tirar dúvidas gerais. Não substitui consulta
        presencial ou telemedicina.
      </p>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 10,
          height: 360,
          overflowY: "auto",
          marginBottom: 8,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.role === "user" ? "right" : "left",
              marginBottom: 8,
            }}
          >
            <div
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
            </div>
          </div>
        ))}
        {loading && <p>IA está respondendo...</p>}
      </div>

      {error && <p style={{ color: "red", fontSize: 12 }}>{error}</p>}

      <form
        onSubmit={handleSend}
        style={{ display: "flex", gap: 8, marginTop: 4 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
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

function DadosSection(props: { patient: Patient }) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Meus dados</h2>
      <table
        style={{
          borderCollapse: "collapse",
          minWidth: 320,
          fontSize: 14,
          marginTop: 8,
        }}
      >
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>Nome</td>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              {props.patient.name}
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>CPF</td>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              {props.patient.cpf || "-"}
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>Telefone</td>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              {props.patient.phone || "-"}
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              Data de nascimento
            </td>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              {props.patient.birth_date || "-"}
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              Observações
            </td>
            <td style={{ border: "1px solid #ddd", padding: 6 }}>
              {props.patient.notes || "-"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DocsSection() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Documentos e exames</h2>
      <p style={{ fontSize: 13 }}>
        Esta área poderá listar os seus exames, laudos, receitas e documentos
        em PDF, conforme a clínica for anexando.
      </p>
      <p style={{ fontSize: 13, marginTop: 6 }}>
        A implementação no banco pode ser feita com uma tabela{" "}
        <code>patient_documents</code> armazenando:
      </p>
      <ul style={{ fontSize: 13 }}>
        <li>tipo (exame, laudo, receita, atestado)</li>
        <li>descrição</li>
        <li>URL do arquivo (Storage do Supabase)</li>
        <li>data de emissão</li>
      </ul>
    </div>
  );
}

// ----------------------
// App principal
// ----------------------
export default function App() {
  const [section, setSection] = useState<Section>("login");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(
    null
  );

  useEffect(() => {
    const id = localStorage.getItem("medintelli_patient_id");
    async function fetchPatient(patientId: string) {
      const { data, error } = await supabase
        .from("patients")
        .select("id,name,cpf,phone,birth_date,notes")
        .eq("id", patientId)
        .maybeSingle();

      if (!error && data) {
        setPatient(data as Patient);
        setSection("home");
      } else {
        localStorage.removeItem("medintelli_patient_id");
      }
    }

    if (id) {
      fetchPatient(id);
    }
  }, []);

  useEffect(() => {
    async function loadNext() {
      if (!patient) return;
      const { data, error } = await supabase
        .from("appointments")
        .select("id,start_time,status,reason,patient_id")
        .eq("patient_id", patient.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        const a = data[0];
        setNextAppointment({
          id: a.id,
          start_time: a.start_time,
          status: a.status,
          reason: a.reason,
        });
      } else {
        setNextAppointment(null);
      }
    }
    loadNext();
  }, [patient]);

  function handleLoggedIn(p: Patient) {
    setPatient(p);
    setSection("home");
  }

  function handleLogout() {
    localStorage.removeItem("medintelli_patient_id");
    setPatient(null);
    setSection("login");
  }

  if (!patient || section === "login") {
    return <LoginScreen onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh" }}>
      <TopBar
        patient={patient}
        onChangeSection={setSection}
        onLogout={handleLogout}
      />
      {section === "home" && (
        <HomeSection patient={patient} nextAppointment={nextAppointment} />
      )}
      {section === "consultas" && <ConsultasSection patient={patient} />}
      {section === "agendar" && <AgendarSection patient={patient} />}
      {section === "chat" && <ChatPacienteSection patient={patient} />}
      {section === "dados" && <DadosSection patient={patient} />}
      {section === "docs" && <DocsSection />}
    </div>
  );
}
