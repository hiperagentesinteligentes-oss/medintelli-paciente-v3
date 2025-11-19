// -------------------------------------------------------------
// MedIntelli - APP PACIENTE V3
// Arquivo único: App.tsx
// -------------------------------------------------------------
// Tabelas utilizadas:
// - patients
// - appointments_full
// - documents
// - messages_center (para enviar mensagens do paciente para a clínica)
//
// Variáveis no Vercel:
//  - VITE_SUPABASE_URL
//  - VITE_SUPABASE_ANON_KEY
//  - VITE_OPENAI_API_KEY
//
// -------------------------------------------------------------

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
} from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// -------------------------------------------------------------
// SUPABASE
// -------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// -------------------------------------------------------------
// TIPOS
// -------------------------------------------------------------

type Patient = {
  id: string;
  name: string;
  cpf: string;
  phone?: string | null;
  birth_date?: string | null;
  notes?: string | null;
};

type AppointmentFull = {
  id: string;
  patient_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
};

type DocumentItem = {
  id: string;
  patient_id: string;
  title: string;
  url: string;
  created_at: string;
};

// -------------------------------------------------------------
// KNOWLEDGE BASE - PACIENTE
// -------------------------------------------------------------
const PATIENT_KNOWLEDGE = `
Você é o assistente do aplicativo do paciente da MedIntelli.

Regras:
- Seja amigável, educado e objetivo.
- Ajude o paciente com informações gerais:
  * horários de funcionamento
  * informações sobre retornos
  * orientações de preparo para consultas comuns
  * mensagens administrativas simples
- NÃO faça diagnóstico.
- NÃO prescreva medicamentos.
- Para sintomas graves, oriente procurar atendimento imediato.

Horário da clínica:
- Segunda a sexta: 08h às 18h
`;

// -------------------------------------------------------------
// TELAS DO APP
// -------------------------------------------------------------

type Section = "login" | "home" | "consultas" | "documentos" | "chat";

// -------------------------------------------------------------
// COMPONENTE APP
// -------------------------------------------------------------
export default function App() {
  const [section, setSection] = useState<Section>("login");
  const [cpf, setCpf] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    const cleanCpf = cpf.replace(/\D/g, "");

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("cpf", cleanCpf)
      .maybeSingle();

    if (error || !data) {
      alert("Paciente não encontrado. Verifique seu CPF.");
      setLoading(false);
      return;
    }

    setPatient(data as Patient);
    setSection("home");
    setLoading(false);
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Configure variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------------
  if (section === "login") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
          <h1 className="text-xl font-bold text-center text-slate-700 mb-4">
            MedIntelli Paciente
          </h1>
          <form className="space-y-3" onSubmit={handleLogin}>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Digite seu CPF"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MENU
  // -------------------------------------------------------------
  const Menu = () => (
    <nav className="flex justify-around bg-white border-b py-3 text-sm">
      <button onClick={() => setSection("home")}>Início</button>
      <button onClick={() => setSection("consultas")}>Minhas Consultas</button>
      <button onClick={() => setSection("documentos")}>Documentos</button>
      <button onClick={() => setSection("chat")}>Chat IA</button>
    </nav>
  );

  // -------------------------------------------------------------
  // HOME
  // -------------------------------------------------------------
  const Home = () => (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-slate-700">Olá, {patient?.name} 👋</h2>
      <p className="text-sm text-slate-500 mt-1">
        Acesse suas consultas, documentos e fale com a IA.
      </p>
    </div>
  );

  // -------------------------------------------------------------
  // MINHAS CONSULTAS
  // -------------------------------------------------------------
  function Consultas() {
    const [items, setItems] = useState<AppointmentFull[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      load();
    }, []);

    async function load() {
      if (!supabase || !patient) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("appointments_full")
        .select("*")
        .eq("patient_id", patient.id)
        .order("start_time", { ascending: true });

      if (!error && data) setItems(data as AppointmentFull[]);
      setLoading(false);
    }

    async function cancelar(id: string) {
      if (!supabase) return;
      if (!confirm("Deseja solicitar cancelamento desta consulta?")) return;

      await supabase
        .from("appointments_full")
        .update({ status: "cancelado" })
        .eq("id", id);

      await load();
    }

    return (
      <div className="p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Minhas Consultas</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma consulta encontrada.</p>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div
                key={c.id}
                className="border rounded-lg bg-white p-3 shadow-sm"
              >
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(c.start_time).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-slate-500 capitalize mt-1">
                  Status: {c.status}
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => cancelar(c.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // DOCUMENTOS / EXAMES
  // -------------------------------------------------------------
  function Documentos() {
    const [docs, setDocs] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      load();
    }, []);

    async function load() {
      if (!supabase || !patient) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });

      if (!error && data) setDocs(data as DocumentItem[]);
      setLoading(false);
    }

    return (
      <div className="p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Documentos e Exames</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum documento disponível.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="border rounded-lg bg-white p-3 shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Enviado em{" "}
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Abrir
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHAT IA PACIENTE
  // -------------------------------------------------------------
  function Chat() {
    const [messages, setMessages] = useState([
      { role: "assistant", content: "Olá! Sou o assistente da clínica. Como posso ajudar?" },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    async function sendMessage(e: FormEvent) {
      e.preventDefault();
      if (!input.trim()) return;

      const next = [...messages, { role: "user", content: input }];
      setMessages(next);
      setInput("");
      setLoading(true);

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      const requestPayload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: PATIENT_KNOWLEDGE },
          ...next,
        ],
      };

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      });

      const json = await resp.json();

      const answer =
        json.choices?.[0]?.message?.content || "Não consegui responder agora.";

      setMessages([...next, { role: "assistant", content: answer }]);
      setLoading(false);
    }

    return (
      <div className="p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Chat IA</h2>

        <div className="border rounded-lg p-3 bg-slate-50 h-80 overflow-y-auto text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-2 flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-2xl max-w-[80%] ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-800 border"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && <p className="text-xs text-slate-500">IA digitando...</p>}
        </div>

        <form onSubmit={sendMessage} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            disabled={loading}
          >
            Enviar
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER FINAL
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100">
      <Menu />

      {section === "home" && <Home />}
      {section === "consultas" && <Consultas />}
      {section === "documentos" && <Documentos />}
      {section === "chat" && <Chat />}
    </div>
  );
}
