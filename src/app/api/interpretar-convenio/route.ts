import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Esquema de los datos que Claude debe extraer del texto en lenguaje natural.
const inputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    deudaTotal: {
      type: "number",
      description:
        "Deuda total a diferir en MXN. Si el usuario no menciona un monto distinto, usa el saldo vencido del cuentahabiente.",
    },
    enganche: {
      type: "number",
      description: "Pago inicial (enganche) en MXN. 0 si no se menciona.",
    },
    numeroPagos: {
      type: "integer",
      description: "Cantidad de pagos en los que se dividira la deuda.",
    },
    periodicidad: {
      type: "string",
      enum: ["semanal", "quincenal", "mensual"],
      description:
        "Frecuencia de los pagos. 'los viernes' o 'cada semana' = semanal; 'cada 15 dias' o 'quincenal' = quincenal; 'cada mes' o 'mensual' = mensual.",
    },
    diaSemana: {
      type: ["integer", "null"],
      description:
        "Dia de la semana si el usuario especifico uno (0=domingo, 1=lunes, 2=martes, 3=miercoles, 4=jueves, 5=viernes, 6=sabado). null si no aplica.",
    },
    montoPago: {
      type: ["number", "null"],
      description:
        "Monto de cada pago en MXN si el usuario lo especifica. null para calcularlo automaticamente como (deudaTotal - enganche) / numeroPagos.",
    },
    telefono: {
      type: ["string", "null"],
      description:
        "Numero de telefono para WhatsApp que aparezca en el texto, solo digitos (incluye clave de pais si esta presente). null si no se menciona.",
    },
    recordarDiaAntes: {
      type: "boolean",
      description:
        "true si el cuentahabiente pide que se le avise un dia antes del pago.",
    },
    recordarDiaDePago: {
      type: "boolean",
      description:
        "true si el cuentahabiente pide que se le avise el mismo dia del pago.",
    },
    observaciones: {
      type: ["string", "null"],
      description: "Condiciones especiales o notas relevantes. null si no hay.",
    },
    resumen: {
      type: "string",
      description:
        "Resumen breve en espanol (1-2 frases) de lo que entendiste del convenio, para que el encargado lo revise.",
    },
  },
  required: [
    "deudaTotal",
    "enganche",
    "numeroPagos",
    "periodicidad",
    "diaSemana",
    "montoPago",
    "telefono",
    "recordarDiaAntes",
    "recordarDiaDePago",
    "observaciones",
    "resumen",
  ],
} as const;

const SYSTEM = `Eres el asistente de la Junta Rural de Agua y Saneamiento. Tu trabajo es interpretar, en espanol de Mexico, lo que el encargado de morosidad escribe sobre el acuerdo de pago que llego con un cuentahabiente, y convertirlo en datos estructurados para generar un convenio de pago.

Reglas:
- Interpreta montos en pesos mexicanos.
- Si no se menciona un monto por pago, dejalo en null para calcularlo automaticamente.
- "los viernes", "cada viernes" => periodicidad semanal y diaSemana=5. Aplica el mismo criterio para otros dias.
- Si no se especifica dia de la semana, deja diaSemana en null.
- Si no se menciona enganche, usa 0.
- Extrae el telefono si aparece (solo digitos).
- Interpreta las preferencias de recordatorio por WhatsApp (un dia antes, el dia del pago).
- Nunca inventes datos que no esten en el texto; usa los valores por defecto indicados.
- Responde SIEMPRE llamando a la herramienta registrar_convenio.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Falta ANTHROPIC_API_KEY. Configurala en .env.local (local) y en Vercel para habilitar la interpretacion con IA.",
      },
      { status: 503 },
    );
  }

  let body: { prompt?: string; cuentahabiente?: any };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo invalido." }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  const cuenta = body.cuentahabiente ?? {};
  if (!prompt) {
    return NextResponse.json(
      { error: "Escribe lo que se acordo con el cuentahabiente." },
      { status: 400 },
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const contexto = `Fecha de hoy: ${hoy}.
Cuentahabiente: ${cuenta.nombre ?? "(sin nombre)"}, cuenta ${cuenta.numeroCuenta ?? "?"}.
Saldo vencido registrado: ${cuenta.saldoVencido ?? 0} MXN.
Telefono registrado: ${cuenta.telefono || "(ninguno)"}.

Lo que escribio el encargado:
"""${prompt}"""`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      tools: [
        {
          name: "registrar_convenio",
          description:
            "Registra los datos estructurados del convenio de pago interpretados del texto.",
          strict: true,
          input_schema: inputSchema as any,
        },
      ],
      tool_choice: { type: "tool", name: "registrar_convenio" },
      messages: [{ role: "user", content: contexto }],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "La IA no devolvio datos estructurados. Intenta reformular." },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: toolUse.input });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const msg =
      status === 401
        ? "La API key de Anthropic es invalida."
        : e?.message ?? "Error al interpretar el convenio.";
    return NextResponse.json({ error: msg }, { status });
  }
}
