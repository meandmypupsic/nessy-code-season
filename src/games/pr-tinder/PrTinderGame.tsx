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

const CARDS_PER_RUN = 7
const MIN_SCORE_FOR_SUCCESS = 5

const codeCards: CodeCard[] = [
  {
    id: 1,
    title: 'Права доступа стали проще',
    agentStatus:
      'Агент уверенно удалил проверку прав, потому что тесты зеленые.',
    vibe: 'Выглядит как чистый код, пахнет инцидентом.',
    code: `export async function deleteProject(projectId, user) {
  const project = await db.project.findById(projectId)

  await db.project.delete(project.id)
  return { ok: true }
}`,
    correctDecision: 'rework',
    explanation:
      'Проверка владельца исчезла. Красиво, но любой пользователь сможет удалить чужой проект.',
  },
  {
    id: 2,
    title: 'Страшный hotfix для дат',
    agentStatus:
      'Агент написал некрасивый guard и попросил не смотреть на него до релиза.',
    vibe: 'Некрасиво, зато edge case пойман.',
    code: `function getBillingDate(input) {
  const date = new Date(input)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}`,
    correctDecision: 'merge',
    explanation:
      'Guard защищает от Invalid Date и не ломает формат. Код можно потом причесать, но фикс правильный.',
  },
  {
    id: 3,
    title: 'Кэш на все времена',
    agentStatus:
      'Агент ускорил страницу на 400%, потому что “данные ведь почти не меняются”.',
    vibe: 'Бенчмарк сияет, пользователи видят вчерашнюю правду.',
    code: `const profileCache = new Map()

export async function getProfile(userId) {
  if (!profileCache.has(userId)) {
    profileCache.set(userId, await api.profile(userId))
  }

  return profileCache.get(userId)
}`,
    correctDecision: 'rework',
    explanation:
      'Нет TTL и инвалидации. Профиль, роли и настройки могут устареть навсегда в рамках процесса.',
  },
  {
    id: 4,
    title: 'Удалили try/catch',
    agentStatus:
      'Агент сказал, что ошибки должен видеть глобальный handler, и внезапно оказался прав.',
    vibe: 'Смело, но архитектурно честно.',
    code: `export async function saveInvoice(input) {
  const invoice = await invoiceSchema.parseAsync(input)
  return invoiceService.create(invoice)
}`,
    correctDecision: 'merge',
    explanation:
      'Локальный catch только логировал и проглатывал ошибку. Теперь ошибка дойдет до общего обработчика.',
  },
  {
    id: 5,
    title: 'SQL стал читабельнее',
    agentStatus:
      'Агент заменил скучный query builder на “понятный template string”.',
    vibe: 'Очень читаемо. Особенно для атакующего.',
    code: `export function findUsers(search) {
  return db.query(
    \`select * from users where name like '%\${search}%'\`
  )
}`,
    correctDecision: 'rework',
    explanation:
      'Это SQL injection. Нужны параметры запроса, даже если строка выглядит аккуратно.',
  },
  {
    id: 6,
    title: 'Опасная миграция, но с планом',
    agentStatus:
      'Агент добавил feature flag и двухфазное чтение, хотя diff выглядит пугающе.',
    vibe: 'Большой diff, зато rollback не на молитвах.',
    code: `const source = flags.newLedger ? ledgerV2 : ledgerV1
const fallback = flags.newLedger ? ledgerV1 : ledgerV2

export async function getBalance(accountId) {
  const balance = await source.getBalance(accountId)
  audit.compare(accountId, balance, fallback)
  return balance
}`,
    correctDecision: 'genius',
    explanation:
      'Фикс рискованный, но есть флаг, fallback-сравнение и наблюдаемость. Это тот самый гениальный суперлайк.',
  },
  {
    id: 7,
    title: 'Пустой catch для стабильности',
    agentStatus:
      'Агент починил падающий мониторинг, перестав сообщать о падениях.',
    vibe: 'Прод тихий, потому что сигнал выключили.',
    code: `try {
  await sendPaymentReceipt(order)
} catch {
  // receipt is not critical
}`,
    correctDecision: 'rework',
    explanation:
      'Даже не критичная ошибка должна логироваться или попадать в retry. Иначе проблема станет невидимой.',
  },
  {
    id: 8,
    title: 'Странный debounce',
    agentStatus:
      'Агент добавил ref, таймер и cleanup. Выглядит как лишняя церемония.',
    vibe: 'На вид тяжеловато, но гонку убрали.',
    code: `const requestId = useRef(0)

useEffect(() => {
  const id = ++requestId.current

  search(query).then((result) => {
    if (id === requestId.current) setResult(result)
  })
}, [query])`,
    correctDecision: 'merge',
    explanation:
      'Защита от out-of-order ответов корректная: старый ответ больше не перетрет новый результат.',
  },
  {
    id: 9,
    title: 'Минус проверка на null',
    agentStatus:
      'Агент удалил “лишний if”, потому что TypeScript не ругался.',
    vibe: 'Типы довольны, API из реального мира нет.',
    code: `export function getPrimaryEmail(user) {
  return user.contacts[0].email.toLowerCase()
}`,
    correctDecision: 'rework',
    explanation:
      'Массив контактов может быть пустым из API или старых данных. Нужен fallback или явная ошибка.',
  },
  {
    id: 10,
    title: 'Суровый лимитер',
    agentStatus:
      'Агент отклонил красивые retry без лимита и принес грубый предохранитель.',
    vibe: 'Не элегантно, но прод скажет спасибо.',
    code: `for (let attempt = 1; attempt <= 3; attempt += 1) {
  const result = await syncChunk(chunk)
  if (result.ok) break

  await wait(attempt * 500)
}`,
    correctDecision: 'genius',
    explanation:
      'Ограниченный retry с backoff не устроит бесконечную нагрузку. Опасный участок закрыт прагматично.',
  },
  {
    id: 11,
    title: 'Красивый Promise.all',
    agentStatus:
      'Агент распараллелил запросы и гордо показал минус 800 мс в профайлере.',
    vibe: 'Быстро, но порядок операций был не случайным.',
    code: `await Promise.all([
  chargeCard(order),
  reserveStock(order.items),
  sendConfirmation(order.email),
])`,
    correctDecision: 'rework',
    explanation:
      'Письмо может уйти до успешной оплаты или резерва. Тут нужна управляемая последовательность и компенсации.',
  },
  {
    id: 12,
    title: 'Некрасивый clamp',
    agentStatus:
      'Агент добавил скучную математику вокруг скидки и испортил элегантную формулу.',
    vibe: 'Выглядит как паранойя, но спасает деньги.',
    code: `const normalizedDiscount = Math.min(
  Math.max(discountPercent, 0),
  80,
)

return price * (1 - normalizedDiscount / 100)`,
    correctDecision: 'merge',
    explanation:
      'Clamp защищает от отрицательных и слишком больших скидок. Это правильная бизнес-защита.',
  },
  {
    id: 13,
    title: 'Стабильный ключ',
    agentStatus:
      'Агент заменил id на index, потому что “React перестал ругаться”.',
    vibe: 'Warning пропал, баг переехал в UI.',
    code: `{items.map((item, index) => (
  <CartRow key={index} item={item} />
))}`,
    correctDecision: 'rework',
    explanation:
      'Index ломает состояние строк при удалении и сортировке. Нужен стабильный ключ из данных.',
  },
  {
    id: 14,
    title: 'Грубая идемпотентность',
    agentStatus:
      'Агент притащил уникальный ключ на платежи и назвал это “скучным фиксиком”.',
    vibe: 'Мало романтики, много спасенных дублей.',
    code: `await db.payment.create({
  idempotencyKey: request.headers['idempotency-key'],
  orderId,
  amount,
})`,
    correctDecision: 'genius',
    explanation:
      'Для платежей идемпотентность критична. Фикс может требовать миграции, но направление правильное.',
  },
  {
    id: 15,
    title: 'JSON parse без шума',
    agentStatus:
      'Агент решил, что плохой JSON можно считать пустым объектом ради UX.',
    vibe: 'Пользователю спокойно, данным плохо.',
    code: `function readSettings(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}`,
    correctDecision: 'rework',
    explanation:
      'Тихий fallback скрывает поврежденные настройки. Нужен лог, reset-flow или явная ошибка восстановления.',
  },
  {
    id: 16,
    title: 'Минус N+1',
    agentStatus:
      'Агент написал менее очевидный запрос и сократил 101 поход в базу до одного.',
    vibe: 'Читается тяжелее, работает честнее.',
    code: `const posts = await db.post.findMany({
  where: { authorId: { in: authorIds } },
  include: { comments: true },
})`,
    correctDecision: 'merge',
    explanation:
      'Это нормальная загрузка связей вместо N+1. Если объем контролируется пагинацией, мержить можно.',
  },
  {
    id: 17,
    title: 'Надежный random',
    agentStatus:
      'Агент заменил crypto на Math.random, потому что “токен же временный”.',
    vibe: 'Стало короче, стало страшнее.',
    code: `export function createResetCode() {
  return Math.random().toString(36).slice(2, 10)
}`,
    correctDecision: 'rework',
    explanation:
      'Для reset-кодов нужен криптографически стойкий генератор. Math.random предсказуем недостаточно.',
  },
  {
    id: 18,
    title: 'Лишний await',
    agentStatus:
      'Агент убрал await перед return и очень собой доволен.',
    vibe: 'Микро-рефактор без подвоха.',
    code: `export function loadUser(id) {
  return userRepository.findById(id)
}`,
    correctDecision: 'merge',
    explanation:
      'Если не нужен try/catch или finally в этой функции, прямой return Promise эквивалентен и проще.',
  },
  {
    id: 19,
    title: 'Флаг без выключателя',
    agentStatus:
      'Агент добавил feature flag, но включил его прямо в коде “временно”.',
    vibe: 'Флаг есть, контроля нет.',
    code: `const useNewCheckout = true

export function checkoutFlow() {
  return useNewCheckout ? checkoutV2() : checkoutV1()
}`,
    correctDecision: 'rework',
    explanation:
      'Hardcoded flag не помогает с rollout и rollback. Нужен внешний конфиг или сервис флагов.',
  },
  {
    id: 20,
    title: 'Уродливый timezone фикс',
    agentStatus:
      'Агент добавил явный UTC и сломал красоту one-liner.',
    vibe: 'Выглядит занудно, зато конец месяца больше не плавает.',
    code: `const endOfMonth = new Date(Date.UTC(
  year,
  month + 1,
  0,
  23,
  59,
  59,
))`,
    correctDecision: 'merge',
    explanation:
      'Явный UTC убирает зависимость от локальной таймзоны сервера. Для биллинга это важно.',
  },
  {
    id: 21,
    title: 'Оптимизация валидации',
    agentStatus:
      'Агент убрал server-side validation, потому что форма уже валидируется на клиенте.',
    vibe: 'Минус дублирование, плюс дырка.',
    code: `export async function updateEmail(req) {
  return users.update(req.user.id, {
    email: req.body.email,
  })
}`,
    correctDecision: 'rework',
    explanation:
      'Клиентскую проверку можно обойти. Сервер обязан валидировать email и права сам.',
  },
  {
    id: 22,
    title: 'Мутный double write',
    agentStatus:
      'Агент пишет и в старую, и в новую таблицу. Diff большой, зато миграция дышит.',
    vibe: 'Рискованно, но это взрослая миграция.',
    code: `await oldOrders.save(order)
await newOrders.save(toNewOrder(order))

metrics.count('orders.double_write.ok')`,
    correctDecision: 'genius',
    explanation:
      'Double write с метрикой помогает безопасно переехать на новую модель данных. Нужен контроль, но идея сильная.',
  },
  {
    id: 23,
    title: 'Сортировка по строке',
    agentStatus:
      'Агент заменил компаратор на localeCompare и сказал, что теперь “человечнее”.',
    vibe: 'Для имен красиво, для чисел внезапно нет.',
    code: `versions.sort((a, b) => (
  a.version.localeCompare(b.version)
))`,
    correctDecision: 'rework',
    explanation:
      'Версии так сортируются неправильно: 10 может оказаться перед 2. Нужен semver-aware compare.',
  },
  {
    id: 24,
    title: 'Защита от replay',
    agentStatus:
      'Агент добавил timestamp и подпись к webhook. Выглядит как overengineering.',
    vibe: 'Сложнее, но атака становится заметно труднее.',
    code: `const age = Date.now() - Number(headers['x-sent-at'])

if (age > 5 * 60 * 1000) throw new Error('stale webhook')
verifySignature(body, headers['x-signature'])`,
    correctDecision: 'genius',
    explanation:
      'Проверка возраста и подписи защищает webhook от replay. Для внешних событий это правильный уровень строгости.',
  },
  {
    id: 25,
    title: 'Слишком заботливый catch',
    agentStatus:
      'Агент заменил ошибку на null, чтобы “экран не падал”.',
    vibe: 'Падать перестало, чиниться тоже.',
    code: `export async function loadDashboard() {
  try {
    return await api.dashboard()
  } catch {
    return null
  }
}`,
    correctDecision: 'rework',
    explanation:
      'Нужно различать empty state и ошибку загрузки. Null без логирования ломает диагностику и UX.',
  },
  {
    id: 26,
    title: 'Скучная нормализация email',
    agentStatus:
      'Агент добавил trim и lowercase, хотя тесты проходили без этого.',
    vibe: 'Мелочь, которая убирает странные дубли.',
    code: `const email = input.email.trim().toLowerCase()

await users.create({
  ...input,
  email,
})`,
    correctDecision: 'merge',
    explanation:
      'Нормализация email на входе предотвращает дубли из-за регистра и пробелов.',
  },
  {
    id: 27,
    title: 'Секрет в логах',
    agentStatus:
      'Агент добавил подробный лог запроса, чтобы быстрее дебажить интеграцию.',
    vibe: 'Очень удобно до первого утекшего токена.',
    code: `logger.info('payment provider request', {
  headers,
  body,
})`,
    correctDecision: 'rework',
    explanation:
      'Headers и body могут содержать токены, карты или PII. Нужны маскирование и выборочные поля.',
  },
  {
    id: 28,
    title: 'AbortController в бой',
    agentStatus:
      'Агент добавил отмену запроса и cleanup. Код стал длиннее.',
    vibe: 'Больше строк, меньше setState после размонтирования.',
    code: `useEffect(() => {
  const controller = new AbortController()

  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)

  return () => controller.abort()
}, [url])`,
    correctDecision: 'merge',
    explanation:
      'Cleanup отменяет устаревший запрос при смене url или размонтировании. Это правильная защита UI.',
  },
  {
    id: 29,
    title: 'Boolean из env',
    agentStatus:
      'Агент преобразовал строку окружения через Boolean и пошел пить кофе.',
    vibe: 'Кажется логично, пока не встретишь строку false.',
    code: `const enablePayments = Boolean(process.env.ENABLE_PAYMENTS)

if (enablePayments) {
  startPaymentWorker()
}`,
    correctDecision: 'rework',
    explanation:
      'Boolean("false") вернет true. Нужно явное сравнение со значением вроде "true".',
  },
  {
    id: 30,
    title: 'Canary для подозрительного алгоритма',
    agentStatus:
      'Агент отправляет 1% трафика в новый ранжировщик и сравнивает ответы.',
    vibe: 'Опасно, но контролируемо.',
    code: `const useCandidate = hash(user.id) % 100 === 0
const result = useCandidate
  ? rankerCandidate.rank(items)
  : rankerStable.rank(items)

metrics.histogram('ranker.diff', compare(result, items))`,
    correctDecision: 'genius',
    explanation:
      'Canary на 1% с метрикой отличий дает проверить рискованный алгоритм без полного выката.',
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
    label: 'Опасный, но гениальный фикс',
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
          Реши судьбу {cards.length} agent-фиксов. Для победы нужно минимум{' '}
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
