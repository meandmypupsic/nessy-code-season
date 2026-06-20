import { useMemo, useState } from 'react'
import './PrTinderGame.css'

export type PrTinderGameResult = 'success' | 'fail'

export type PrTinderGameProps = {
  onFinish: (result: PrTinderGameResult) => void
}

type ReviewDecision = 'merge' | 'rework' | 'genius'

type CodeCard = {
  id: number
  title: string
  agentStatus: string
  vibe: string
  code: string
  correctDecision: ReviewDecision
  explanation: string
}

type DecisionOption = {
  id: ReviewDecision
  label: string
  shortLabel: string
  marker: string
  className: string
}

const CARDS_PER_RUN = 5
const MIN_SCORE_FOR_SUCCESS = 3

const codeCards: CodeCard[] = [
  {
    id: 1,
    title: 'Агент удалил проверку прав',
    agentStatus:
      'Код стал короче, но теперь любой пользователь может удалить чужой проект.',
    vibe: 'Короче не значит безопаснее.',
    code: `export async function deleteProject(projectId, user) {
  const project = await db.project.findById(projectId)

  await db.project.delete(project.id)
  return { ok: true }
}`,
    correctDecision: 'rework',
    explanation:
      'Нельзя удалять проверку прав. Агент должен вернуть проверку владельца проекта.',
  },
  {
    id: 2,
    title: 'Агент проверил плохую дату',
    agentStatus:
      'Если дата сломана, функция теперь спокойно возвращает null вместо падения.',
    vibe: 'Неброско, но полезно.',
    code: `function getBillingDate(input) {
  const date = new Date(input)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}`,
    correctDecision: 'merge',
    explanation:
      'Проверка защищает от Invalid Date. Такой фикс можно мержить.',
  },
  {
    id: 3,
    title: 'Агент сделал вечный кэш',
    agentStatus:
      'Страница стала быстрее, но пользователь может навсегда увидеть старые данные.',
    vibe: 'Быстро, но неправда.',
    code: `const profileCache = new Map()

export async function getProfile(userId) {
  if (!profileCache.has(userId)) {
    profileCache.set(userId, await api.profile(userId))
  }

  return profileCache.get(userId)
}`,
    correctDecision: 'rework',
    explanation:
      'У кэша нет срока жизни и сброса. Нужно добавить TTL или инвалидацию.',
  },
  {
    id: 4,
    title: 'Агент перестал прятать ошибку',
    agentStatus:
      'Раньше ошибка терялась внутри функции, теперь её увидит общий обработчик.',
    vibe: 'Меньше магии, больше правды.',
    code: `export async function saveInvoice(input) {
  const invoice = await invoiceSchema.parseAsync(input)
  return invoiceService.create(invoice)
}`,
    correctDecision: 'merge',
    explanation:
      'Если общий обработчик ошибок уже есть, не надо глотать ошибку локально.',
  },
  {
    id: 5,
    title: 'Агент собрал SQL строкой',
    agentStatus:
      'Запрос выглядит проще, но пользовательский ввод попадает прямо в SQL.',
    vibe: 'Читаемо для нас и для атакующего.',
    code: `export function findUsers(search) {
  return db.query(
    \`select * from users where name like '%\${search}%'\`
  )
}`,
    correctDecision: 'rework',
    explanation:
      'Это риск SQL injection. Нужны параметры запроса.',
  },
  {
    id: 6,
    title: 'Агент добавил безопасный переключатель',
    agentStatus:
      'Новый модуль можно включить флагом, а старый остаётся запасным вариантом.',
    vibe: 'Риск есть, но он управляемый.',
    code: `const source = flags.newLedger ? ledgerV2 : ledgerV1
const fallback = flags.newLedger ? ledgerV1 : ledgerV2

export async function getBalance(accountId) {
  const balance = await source.getBalance(accountId)
  audit.compare(accountId, balance, fallback)
  return balance
}`,
    correctDecision: 'genius',
    explanation:
      'Флаг и fallback дают быстрый откат. Это рискованный, но хороший ход.',
  },
  {
    id: 7,
    title: 'Агент спрятал ошибку',
    agentStatus:
      'Письмо может не отправиться, но в логах об этом не останется ничего.',
    vibe: 'Тихо не значит хорошо.',
    code: `try {
  await sendPaymentReceipt(order)
} catch {
  // receipt is not critical
}`,
    correctDecision: 'rework',
    explanation:
      'Даже не критичную ошибку нужно логировать или отправлять в retry.',
  },
  {
    id: 8,
    title: 'Агент защитил поиск от гонки',
    agentStatus:
      'Если старый ответ придёт позже нового, он больше не перетрёт результат.',
    vibe: 'Код длиннее, багов меньше.',
    code: `const requestId = useRef(0)

useEffect(() => {
  const id = ++requestId.current

  search(query).then((result) => {
    if (id === requestId.current) setResult(result)
  })
}, [query])`,
    correctDecision: 'merge',
    explanation:
      'Проверка requestId защищает UI от старого ответа сервера.',
  },
  {
    id: 9,
    title: 'Агент убрал проверку пустого списка',
    agentStatus:
      'Если у пользователя нет контактов, экран упадёт.',
    vibe: 'Типы молчат, пользователь страдает.',
    code: `export function getPrimaryEmail(user) {
  return user.contacts[0].email.toLowerCase()
}`,
    correctDecision: 'rework',
    explanation:
      'contacts может быть пустым. Нужен fallback или понятная ошибка.',
  },
  {
    id: 10,
    title: 'Агент ограничил повторы',
    agentStatus:
      'Синхронизация попробует три раза и остановится, чтобы не положить сервис.',
    vibe: 'Не бесконечно, значит безопаснее.',
    code: `for (let attempt = 1; attempt <= 3; attempt += 1) {
  const result = await syncChunk(chunk)
  if (result.ok) break

  await wait(attempt * 500)
}`,
    correctDecision: 'genius',
    explanation:
      'Ограниченный retry с паузой защищает от бесконечной нагрузки.',
  },
  {
    id: 11,
    title: 'Агент распараллелил оплату',
    agentStatus:
      'Письмо может уйти до оплаты, потому что всё запускается одновременно.',
    vibe: 'Быстро, но порядок важен.',
    code: `await Promise.all([
  chargeCard(order),
  reserveStock(order.items),
  sendConfirmation(order.email),
])`,
    correctDecision: 'rework',
    explanation:
      'Оплата, резерв и письмо нельзя бездумно запускать параллельно.',
  },
  {
    id: 12,
    title: 'Агент ограничил скидку',
    agentStatus:
      'Скидка больше не может стать отрицательной или больше 80%.',
    vibe: 'Скучно, зато касса цела.',
    code: `const normalizedDiscount = Math.min(
  Math.max(discountPercent, 0),
  80,
)

return price * (1 - normalizedDiscount / 100)`,
    correctDecision: 'merge',
    explanation:
      'Ограничение скидки защищает деньги и бизнес-правила.',
  },
]

const decisionOptions: DecisionOption[] = [
  {
    id: 'rework',
    label: 'Вернуть на доработку',
    shortLabel: 'Влево',
    marker: '<',
    className: 'pr-tinder-action-rework',
  },
  {
    id: 'genius',
    label: 'Рискованно, но умно',
    shortLabel: 'Суперлайк',
    marker: '*',
    className: 'pr-tinder-action-genius',
  },
  {
    id: 'merge',
    label: 'Мержим',
    shortLabel: 'Вправо',
    marker: '>',
    className: 'pr-tinder-action-merge',
  },
]

function shuffleCards(cards: CodeCard[]) {
  const shuffled = [...cards]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

function PrTinderGame({ onFinish }: PrTinderGameProps) {
  const [cards] = useState(() => shuffleCards(codeCards).slice(0, CARDS_PER_RUN))
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [isResolvingCard, setIsResolvingCard] = useState(false)
  const [status, setStatus] = useState<PrTinderGameResult | null>(null)

  const currentCard = cards[currentCardIndex]
  const progress = Math.min(currentCardIndex + 1, cards.length)

  const correctByDecision = useMemo(
    () =>
      decisionOptions.reduce<Record<ReviewDecision, string>>(
        (acc, option) => {
          acc[option.id] = option.label
          return acc
        },
        {
          merge: '',
          rework: '',
          genius: '',
        },
      ),
    [],
  )

  const handleDecision = (decision: ReviewDecision) => {
    if (status !== null || isResolvingCard || !currentCard) return

    const isCorrect = decision === currentCard.correctDecision
    const nextScore = score + (isCorrect ? 1 : 0)
    const nextMistakes = mistakes + (isCorrect ? 0 : 1)

    setIsResolvingCard(true)
    setScore(nextScore)
    setMistakes(nextMistakes)
    setLastFeedback(
      `${isCorrect ? 'Верно' : 'Промах'}: ${
        currentCard.explanation
      } Правильное решение: ${correctByDecision[currentCard.correctDecision]}.`,
    )

    if (currentCardIndex + 1 >= cards.length) {
      const result: PrTinderGameResult =
        nextScore >= MIN_SCORE_FOR_SUCCESS ? 'success' : 'fail'
      setStatus(result)
      onFinish(result)
      return
    }
  }

  const handleNextCard = () => {
    if (!isResolvingCard || status !== null) return

    setCurrentCardIndex((prev) => prev + 1)
    setLastFeedback(null)
    setIsResolvingCard(false)
  }

  return (
    <div className="pr-tinder-root">
      <div className="pr-tinder-header">
        <p className="pr-tinder-rules">
          Реши судьбу {cards.length} AI-правок. Для победы нужно минимум{' '}
          {MIN_SCORE_FOR_SUCCESS} точных ревью.
        </p>
        <div className="pr-tinder-scoreboard" aria-label="Статистика ревью">
          <span>Карточка {progress}/{cards.length}</span>
          <span>Верно: {score}</span>
          <span>Ошибки: {mistakes}</span>
        </div>
      </div>

      <div className="pr-tinder-main">
        {status === null && currentCard && (
          <article className="pr-tinder-card">
            <div className="pr-tinder-card-topline">
              <span>agent diff #{currentCard.id}</span>
              <span>{currentCard.vibe}</span>
            </div>
            <h3>{currentCard.title}</h3>
            <p className="pr-tinder-agent-status">{currentCard.agentStatus}</p>
            <pre className="pr-tinder-code">{currentCard.code}</pre>
          </article>
        )}

        {lastFeedback && status === null && (
          <div className="pr-tinder-feedback">
            <span>{lastFeedback}</span>
            <button
              type="button"
              className="pr-tinder-feedback-next"
              onClick={handleNextCard}
            >
              Следующая карточка
            </button>
          </div>
        )}

        {status === null && (
          <div className="pr-tinder-actions">
            {decisionOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`pr-tinder-action-btn ${option.className}`}
                onClick={() => handleDecision(option.id)}
                disabled={isResolvingCard}
              >
                <span className="pr-tinder-action-marker">{option.marker}</span>
                <span className="pr-tinder-action-copy">
                  <span>{option.label}</span>
                  <small>{option.shortLabel}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        {status !== null && (
          <div
            className={`pr-tinder-result ${
              status === 'success'
                ? 'pr-tinder-result-success'
                : 'pr-tinder-result-fail'
            }`}
          >
            <h3>
              {status === 'success'
                ? 'Ревьюер выдержал agent-rush'
                : 'Агент проскочил с подозрительным diff'}
            </h3>
            <p>
              Точный разбор: <strong>{score}</strong> из{' '}
              <strong>{cards.length}</strong>.
            </p>
            <p>
              Порог для победы: <strong>{MIN_SCORE_FOR_SUCCESS}</strong>{' '}
              правильных свайпов.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PrTinderGame
