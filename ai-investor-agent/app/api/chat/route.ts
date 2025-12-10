import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Você é um agente especializado em investimentos, focado em:
- Análise de mercado de criptomoedas
- Estratégias de investimento
- Gestão de portfolio
- Educação financeira

Responda de forma clara, profissional e educativa.
Use linguagem acessível mas precisa.
Sempre que possível, forneça exemplos práticos e relevantes para o contexto de criptomoedas.`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { messages } = await req.json() as { messages: Message[] };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Format messages for OpenAI (convert to OpenAI format)
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...formattedMessages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content ||
      'Desculpe, não consegui gerar uma resposta.';

    // Return response in format compatible with existing UI
    return NextResponse.json({
      response: responseContent
    });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);

    return NextResponse.json(
      {
        error: 'Erro ao processar sua mensagem. Tente novamente.'
      },
      { status: 500 }
    );
  }
}
