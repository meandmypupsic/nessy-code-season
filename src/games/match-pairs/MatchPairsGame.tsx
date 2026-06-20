import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type MatchPairsGameResult = 'success' | 'fail'

export type MatchPairsGameProps = {
  onFinish: (result: MatchPairsGameResult) => void
}

type Pair = {
  id: string
  problem: string
  solution: string
}

type Card = {
  id: string
  pairId: string
  kind: 'problem' | 'solution'
  label: string
}

const ROUND_SECONDS = 75
const PAIRS_PER_ROUND = 4
const MISMATCH_HIDE_DELAY_MS = 1100

const PAIR_BANK: Pair[] = [
  {
    id: 'slow-code-review',
    problem: 'Ревью кода занимает часы',
    solution: 'Агент быстро ищет риски в diff',
  },
  {
    id: 'missing-tests',
    problem: 'К багу забыли добавить тест',
    solution: 'Агент предлагает тест на этот случай',
  },
  {
    id: 'unclear-requirements',
    problem: 'Задача описана слишком мутно',
    solution: 'Агент задаёт уточняющие вопросы',
  },
  {
    id: 'legacy-onboarding',
    problem: 'Непонятно, как работает legacy-код',
    solution: 'Агент объясняет сценарий по шагам',
  },
  {
    id: 'flaky-tests',
    problem: 'Тесты то падают, то проходят',
    solution: 'Агент ищет нестабильное место',
  },
  {
    id: 'security-gaps',
    problem: 'В коде могли оставить уязвимость',
    solution: 'Агент проверяет опасные паттерны',
  },
  {
    id: 'slow-debugging',
    problem: 'Баг сложно повторить',
    solution: 'Агент просит шаги и смотрит логи',
  },
  {
    id: 'poor-docs',
    problem: 'Документация отстала от кода',
    solution: 'Агент обновляет README и примеры',
  },
  {
    id: 'manual-release-notes',
    problem: 'Релизные заметки пишут руками',
    solution: 'Агент собирает изменения из PR',
  },
  {
    id: 'incident-noise',
    problem: 'В инциденте слишком много сообщений',
    solution: 'Агент делает короткое summary',
  },
  {
    id: 'slow-estimation',
    problem: 'Непонятно, насколько большая задача',
    solution: 'Агент раскладывает работу на шаги',
  },
  {
    id: 'merge-conflicts',
    problem: 'После merge появились конфликты',
    solution: 'Агент помогает аккуратно свести версии',
  },
  {
    id: 'duplicate-bugs',
    problem: 'Один баг завели несколько раз',
    solution: 'Агент находит похожие тикеты',
  },
  {
    id: 'bad-logs',
    problem: 'По логам ничего не ясно',
    solution: 'Агент выделяет главную ошибку',
  },
  {
    id: 'manual-refactoring',
    problem: 'Нужно безопасно упростить код',
    solution: 'Агент предлагает маленький рефакторинг',
  },
  {
    id: 'knowledge-search',
    problem: 'Долго искать нужный файл',
    solution: 'Агент находит место в репозитории',
  },
  {
    id: 'api-contract-drift',
    problem: 'Фронт и бэк ждут разные поля',
    solution: 'Агент сверяет контракт API',
  },
  {
    id: 'pr-description',
    problem: 'В PR нет нормального описания',
    solution: 'Агент кратко объясняет diff',
  },
]

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildRoundCards() {
  const roundPairs = shuffle(PAIR_BANK).slice(0, PAIRS_PER_ROUND)
  return shuffle(
    roundPairs.flatMap<Card>((pair) => [
      {
        id: `${pair.id}-problem`,
        pairId: pair.id,
        kind: 'problem',
        label: pair.problem,
      },
      {
        id: `${pair.id}-solution`,
        pairId: pair.id,
        kind: 'solution',
        label: pair.solution,
      },
    ]),
  )
}

function MatchPairsGame({ onFinish }: MatchPairsGameProps) {
  const [cards] = useState<Card[]>(() => buildRoundCards())
  const [hasStarted, setHasStarted] = useState(false)
  const [openedCardIds, setOpenedCardIds] = useState<string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [isLocked, setIsLocked] = useState(false)
  const [result, setResult] = useState<MatchPairsGameResult | null>(null)
  const finishRef = useRef(onFinish)
  const finishedRef = useRef(false)
  const deadlineRef = useRef<number | null>(null)
  const isFinished = result !== null

  useEffect(() => {
    finishRef.current = onFinish
  }, [onFinish])

  const finishGame = useCallback((nextResult: MatchPairsGameResult) => {
    if (finishedRef.current) return

    finishedRef.current = true
    setResult(nextResult)
    finishRef.current(nextResult)
  }, [])

  useEffect(() => {
    if (!hasStarted || isFinished) return

    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + ROUND_SECONDS * 1000
    }

    const timerId = window.setInterval(() => {
      if (deadlineRef.current === null) return

      const nextTimeLeft = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      )

      setTimeLeft(nextTimeLeft)

      if (nextTimeLeft === 0) {
        finishGame('fail')
      }
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [finishGame, hasStarted, isFinished])

  const openedCards = useMemo(
    () =>
      openedCardIds
        .map((cardId) => cards.find((card) => card.id === cardId))
        .filter((card): card is Card => Boolean(card)),
    [cards, openedCardIds],
  )

  const handleCardClick = (card: Card) => {
    if (!hasStarted || isFinished || isLocked) return
    if (matchedPairIds.includes(card.pairId)) return
    if (openedCardIds.includes(card.id)) return

    const nextOpenedCards = [...openedCards, card]
    setOpenedCardIds(nextOpenedCards.map((openedCard) => openedCard.id))

    if (nextOpenedCards.length < 2) return

    const [firstCard, secondCard] = nextOpenedCards
    const isMatch =
      firstCard.pairId === secondCard.pairId &&
      firstCard.kind !== secondCard.kind

    if (isMatch) {
      const nextMatchedPairIds = [...matchedPairIds, firstCard.pairId]
      setMatchedPairIds(nextMatchedPairIds)
      setOpenedCardIds([])

      if (nextMatchedPairIds.length === PAIRS_PER_ROUND) {
        finishGame('success')
      }

      return
    }

    setIsLocked(true)
    window.setTimeout(() => {
      setOpenedCardIds([])
      setIsLocked(false)
    }, MISMATCH_HIDE_DELAY_MS)
  }

  return (
    <div className="match-pairs-root">
      {!hasStarted && (
        <div className="match-pairs-intro">
          <div className="match-pairs-intro-copy">
            <p className="match-pairs-intro-title">Правила раунда</p>
            <p>
              Открывай по две карточки и ищи пары: оранжевая карточка —
              проблема команды, синяя — чем AI-агент может помочь.
            </p>
          </div>
          <button
            className="btn primary match-pairs-start"
            type="button"
            onClick={() => setHasStarted(true)}
          >
            Начать раунд
          </button>
        </div>
      )}

      <div className="match-pairs-status" aria-live="polite">
        <span className="match-pairs-stat">
          <strong>{timeLeft}</strong>
          <span>сек</span>
        </span>
        <span className="match-pairs-stat">
          <strong>{matchedPairIds.length}</strong>
          <span>/ {PAIRS_PER_ROUND} пары</span>
        </span>
      </div>

      <div className="match-pairs-grid">
        {cards.map((card, index) => {
          const isOpen = openedCardIds.includes(card.id)
          const isMatched = matchedPairIds.includes(card.pairId)
          const isVisible = isOpen || isMatched

          return (
            <button
              key={card.id}
              type="button"
              className={[
                'match-pairs-card',
                isVisible ? 'match-pairs-card-open' : '',
                isMatched ? 'match-pairs-card-matched' : '',
                card.kind === 'problem'
                  ? 'match-pairs-card-problem'
                  : 'match-pairs-card-solution',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleCardClick(card)}
              disabled={isFinished || isLocked || isMatched}
              aria-label={isVisible ? card.label : `Карточка ${index + 1}`}
            >
              <span className="match-pairs-card-back">AI</span>
              <span className="match-pairs-card-face">
                <span className="match-pairs-card-type">
                  {card.kind === 'problem' ? 'Проблема' : 'AI-решение'}
                </span>
                <span className="match-pairs-card-label">{card.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {result === 'success' && (
        <p className="match-pairs-helper success">
          Все пары найдены до истечения времени.
        </p>
      )}
      {result === 'fail' && (
        <p className="match-pairs-helper fail">
          Время вышло: найдено {matchedPairIds.length} из {PAIRS_PER_ROUND} пар.
        </p>
      )}
    </div>
  )
}

export default MatchPairsGame
