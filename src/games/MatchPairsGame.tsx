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

const ROUND_SECONDS = 60
const PAIRS_PER_ROUND = 6
const MISMATCH_HIDE_DELAY_MS = 1100

const PAIR_BANK: Pair[] = [
  {
    id: 'slow-code-review',
    problem: 'Долгое ревью кода',
    solution: 'AI Code Reviewer',
  },
  {
    id: 'missing-tests',
    problem: 'Не хватает тестов',
    solution: 'AI Test Generator',
  },
  {
    id: 'unclear-requirements',
    problem: 'Нечёткие требования',
    solution: 'AI Product Analyst',
  },
  {
    id: 'legacy-onboarding',
    problem: 'Сложный legacy-код',
    solution: 'AI Code Explainer',
  },
  {
    id: 'flaky-tests',
    problem: 'Флейковые тесты',
    solution: 'AI Test Triage',
  },
  {
    id: 'security-gaps',
    problem: 'Пропущенные уязвимости',
    solution: 'AI Security Scanner',
  },
  {
    id: 'slow-debugging',
    problem: 'Долгий поиск бага',
    solution: 'AI Debug Assistant',
  },
  {
    id: 'poor-docs',
    problem: 'Устаревшая документация',
    solution: 'AI Docs Writer',
  },
  {
    id: 'manual-release-notes',
    problem: 'Ручные release notes',
    solution: 'AI Changelog Builder',
  },
  {
    id: 'incident-noise',
    problem: 'Шум в инцидентах',
    solution: 'AI Incident Summarizer',
  },
  {
    id: 'slow-estimation',
    problem: 'Неточная оценка задач',
    solution: 'AI Estimation Assistant',
  },
  {
    id: 'merge-conflicts',
    problem: 'Частые merge conflicts',
    solution: 'AI Merge Helper',
  },
  {
    id: 'duplicate-bugs',
    problem: 'Дубли баг-репортов',
    solution: 'AI Issue Deduplicator',
  },
  {
    id: 'bad-logs',
    problem: 'Непонятные логи',
    solution: 'AI Log Analyzer',
  },
  {
    id: 'manual-refactoring',
    problem: 'Ручной рефакторинг',
    solution: 'AI Refactoring Agent',
  },
  {
    id: 'knowledge-search',
    problem: 'Долгий поиск контекста',
    solution: 'AI Knowledge Search',
  },
  {
    id: 'api-contract-drift',
    problem: 'Расхождение API-контрактов',
    solution: 'AI Contract Checker',
  },
  {
    id: 'pr-description',
    problem: 'Пустое описание PR',
    solution: 'AI PR Summarizer',
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
              На поле 12 закрытых карточек. Открывай по две за ход и ищи пары:
              оранжевая карточка — проблема в SDLC, синяя — AI-решение.
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
          <span>/ {PAIRS_PER_ROUND} пар</span>
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
          Все 6 пар найдены до истечения времени.
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
