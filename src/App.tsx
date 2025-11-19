// App.tsx - MedIntelli Paciente (arquivo único)
// -------------------------------------------
// Requisitos:
// 1) Dependências no package.json:
//    "react", "react-dom", "react-router-dom", "@supabase/supabase-js"
// 2) Variáveis de ambiente no Vercel (ou .env.local):
//    VITE_SUPABASE_URL       = https://SEU-PROJETO.supabase.co
//    VITE_SUPABASE_ANON_KEY  = sua chave anon do Supabase
//    VITE_OPENAI_API_KEY     = sua chave sk-... da OpenAI
//
// Usa mesmas tabelas do app da clínica (patients, appointments).

import React, { useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// --------------------------
// Supabase client
// --------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// --------------------------
// Tipos
// --------------------------
type Section = "home" | "consultas" | "chat" | "perfil";

type AppointmentInfo = {
  id: string;
  start_time: string;
  status: string;
  reason: string | null;
  patients?: { name: string };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// --------------------------
// Base de conhecimento do paciente
// --------------------------
const PATIENT_KNOWLEDGE_BASE = `
Você é o assistente do app do paciente MedIntelli.

Ajude o paciente com:
- informações gerais sobre consultas, retornos, exames
- orientações de rotina
- explicar que alterações em agendamento devem ser confirmadas pela clínica

NÃO:
- Não faça diagnóstico
- Não prescreva medicação
- Não substitua orientações do médico

Sempre que necessário, oriente:
"Consulte seu médico ou a clínica para confirmação final."
`;

// --------------------------
// Layout simples
// --------------------------

function TopMenu(props: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  const btnStyle = (active: boolean): React.CSSProperties => ({
    border: "none",
    background: active ? "#1a73e8" : "transparent",
    color: active ? "#fff" : "#1a3f8b",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  });

  return (
    <header
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#e6f0ff",
      }}
    >
      <div>
        <strong style={{ color: "#1a3f8b" }}>MedIntelli Paciente</strong>
      </div>
      <nav style={{ display: "flex", gap: 8 }}>
        <button
          style={btnStyle(props.active === "home")}
          onClick={() => props.onChange("home")}
        >
          Início
        </button>
        <button
          style={btnStyle(props.active === "consultas")}
          onClick={() => props.onChange("consultas")}
        >
          Minhas Consultas
        </button>
        <button
          style={btnStyle(props.active === "chat")}
          onClick={() => props.onChange("chat")}
        >
          Chat IA
        </button>
        <button
          style={btnStyle(props.active === "perfil")}
          onClick={() => props.onChange("perfil")}
        >
          Perfil
        </button>
      </nav>
    </header>
  );
}

function PageContainer(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>{props.title}</h1>
      {props.children}
    </div>
  );
}

// --------------------------
// Seção: Home
// --------------------------

function HomeSection() {
  return (
    <PageContainer title="Bem-vindo(a)">
      <p style={{ marginBottom: 8 }}>
        Este é o app do paciente MedIntelli. Aqui você pode:
      </p>
      <ul>
        <li>📅 Ver suas consultas</li>
        <li>💬 Tirar dúvidas gerais com o Chat IA</li>
        <li>👤 Atualizar dados básicos do seu perfil (simples)</li>
      </ul>
      <p style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
        Importante: este app não substitui consultas presenciais ou
        teleconsultas autorizadas.
      </p>
    </PageContainer>
  );
}

// --------------------------
// Seção: Minhas Consultas
// --------------------------

function ConsultasSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentInfo[]>([]);
  const [error, setError] = useState("");

  async function handleBuscar() {
    setError("");
    setResult([]);

    if (!name.trim()) {
      setError("Informe pelo menos o nome.");
      return;
    }

    setLoading(true);

    // Busca por consultas do paciente pelo nome aproximado (e opcionalmente telefone)
    const { data, error } = await supabase
      .from("appointments")
      .select("id,start_time,status,reason,patients(name,phone)")
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      setError("Erro ao buscar consultas.");
      setLoading(false);
      return;
    }

    const filtrado = (data || []).filter((a: any) => {
      const nomeOk = a.patients?.name
        ?.toLowerCase()
        .includes(name.toLowerCase());
      const telOk = phone
        ? String(a.patients?.phone || "")
            .toLowerCase()
            .includes(phone.toLowerCase())
        : true;
      return nomeOk && telOk;
    });

    setResult(filtrado as AppointmentInfo[]);
    setLoading(false);
  }

  return (
    <PageContainer title="Minhas Consultas">
      <p style={{ fontSize: 14, marginBottom: 8 }}>
        Digite seu nome (e opcionalmente telefone) para localizar consultas
        agendadas em seu nome.
      </p>

      <div
        style={{
          display: "grid",
          gap: 8,
          maxWidth: 420,
          marginBottom: 12,
        }}
      >
        <input
          value={name}
          on
