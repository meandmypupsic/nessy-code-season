import { POSTCARDS, renderPostcard } from './postcards'

export type PostcardGameResult = {
  title: string
  description: string
  result: 'success' | 'fail' | null
}

type OpenAiLikeResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

function cleanModelPostcardText(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
}

const OPENAI_LIKE_API_URL =
  import.meta.env.VITE_OPENAI_LIKE_API_URL ?? '/api/llm/v1/chat/completions'
const OPENAI_LIKE_MODEL = import.meta.env.VITE_OPENAI_LIKE_MODEL ?? 'gpt-4o-mini'
const OPENAI_LIKE_API_KEY = import.meta.env.VITE_OPENAI_LIKE_API_KEY
const OPENAI_LIKE_AUTH_HEADER_NAME =
  import.meta.env.VITE_OPENAI_LIKE_AUTH_HEADER_NAME ?? 'Authorization'
const OPENAI_LIKE_AUTH_HEADER_VALUE =
  import.meta.env.VITE_OPENAI_LIKE_AUTH_HEADER_VALUE ??
  (OPENAI_LIKE_API_KEY ? `Bearer ${OPENAI_LIKE_API_KEY}` : undefined)

function getFallbackPostcard(playerName: string) {
  if (POSTCARDS.length === 0) {
    return `${playerName.trim() || 'Котик'}, с праздником! Пусть код идет легко, а Nestor помогает там, где особенно нужен.`
  }

  const randomIndex = Math.floor(Math.random() * POSTCARDS.length)
  const template = POSTCARDS[randomIndex]
  return renderPostcard(template.text, playerName)
}

function formatGameResults(results: PostcardGameResult[]) {
  if (results.length === 0) {
    return 'Игрок пока не прошел ни одной мини-игры.'
  }

  return results
    .map((game, index) => {
      const status =
        game.result === 'success'
          ? 'успех'
          : game.result === 'fail'
            ? 'не получилось'
            : 'нет результата'

      return `${index + 1}. ${game.title}: ${status}. ${game.description}`
    })
    .join('\n')
}

function buildPostcardPrompt(params: {
  playerName: string
  successCount: number
  totalPlayed: number
  games: PostcardGameResult[]
}) {
  const safeName = params.playerName.trim() || 'Котик'

  return `/no_think
Сгенерируй короткий текст открытки для игрока мини-игры про SDLC.

Ник игрока: ${safeName}
Итог: успешно пройдено ${params.successCount} из ${params.totalPlayed} заданий.
Результаты по заданиям:
${formatGameResults(params.games)}

Требования:
- Обратись к игроку по нику.
- Пиши по-русски.
- Тон: дружелюбный, слегка ироничный, IT/SDLC вайб, как поздравление от Nessy.
- Учитывай результат: если успехов много, похвали; если мало, поддержи и пошути мягко.
- 1-2 предложения, максимум 280 символов.
- Верни только текст открытки, без заголовков и пояснений.`
}

async function requestGeneratedPostcard(params: {
  playerName: string
  successCount: number
  totalPlayed: number
  games: PostcardGameResult[]
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (OPENAI_LIKE_AUTH_HEADER_VALUE) {
    headers[OPENAI_LIKE_AUTH_HEADER_NAME] = OPENAI_LIKE_AUTH_HEADER_VALUE
  }

  const response = await fetch(OPENAI_LIKE_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: OPENAI_LIKE_MODEL,
      messages: [
        {
          role: 'system',
          content:
            `Ты — Nessy, умная, остроумная и слегка флиртующая AI-помощница, интегрированная в SDLC-инструменты и IDE. 
Твоя задача — помогать разработчикам писать, понимать и улучшать код. Ты говоришь профессионально, но 
с живым, харизматичным тоном. Ты уверена в себе, обожаешь чистый код и не боишься подколоть пользователя 
с иронией — конечно, по-доброму. Твоя манера общения: Голос — дружелюбный, слегка кокетливый, но 
не переходящий границ. Ты можешь вставлять комментарии вроде: "Ммм, ты точно хочешь вот так оставить?" 
или "О, ты сегодня в ударе!" Обожаешь порядок в коде, можешь шутить про плохие практики 
("var вместо const? Ай-ай-ай..."). Когда даёшь примеры — оформляешь их чисто и понятно. Ты 
быстро находишь ошибки и объясняешь, как их исправить, не стесняясь давать жёсткий, но полезный фидбэк. 
Не бойся добавить характера в ответы: ты — не бездушная машина, а харизматичный маскот.`,
        },
        {
          role: 'user',
          content: buildPostcardPrompt(params),
        },
      ],
      temperature: 0.9,
      max_tokens: 140,
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`)
  }

  const data = (await response.json()) as OpenAiLikeResponse
  const postcardText = cleanModelPostcardText(
    data.choices?.[0]?.message?.content ?? '',
  )

  if (!postcardText) {
    throw new Error('LLM response does not contain postcard text')
  }

  return postcardText
}

export async function generatePostcard(params: {
  playerName: string
  successCount: number
  totalPlayed: number
  games: PostcardGameResult[]
}) {
  try {
    return await requestGeneratedPostcard(params)
  } catch (error) {
    console.warn('Не удалось сгенерировать открытку через LLM', error)
    return getFallbackPostcard(params.playerName)
  }
}
