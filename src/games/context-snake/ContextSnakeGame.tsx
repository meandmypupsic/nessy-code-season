import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './ContextSnakeGame.css'

export type ContextSnakeGameResult = 'success' | 'fail'

export type ContextSnakeGameProps = {
  onFinish: (result: ContextSnakeGameResult) => void
}

type Point = {
  x: number
  y: number
}

type Direction = 'up' | 'down' | 'left' | 'right'

type ContextItem = {
  id: string
  label: string
  shortLabel: string
  tokens: number
  growth: number
  color: string
}

type Food = {
  point: Point
  item: ContextItem
}

type FinishReason = 'win' | 'wall' | 'self' | 'overflow' | 'missing-context'

const ROUND_SECONDS = 60
const GRID_WIDTH = 22
const GRID_HEIGHT = 16
const CONTEXT_LIMIT = 100
const INITIAL_CONTEXT = 12
const TICK_MS = 180
const FOOD_COUNT = 9
const REQUIRED_CONTEXT_TYPES = 4

const CONTEXT_ITEMS: ContextItem[] = [
  {
    id: 'mcp',
    label: 'Доступ к сервису',
    shortLabel: 'API',
    tokens: 24,
    growth: 4,
    color: '#428bf9',
  },
  {
    id: 'skills',
    label: 'Навык агента',
    shortLabel: 'AI',
    tokens: 20,
    growth: 3,
    color: '#f2763a',
  },
  {
    id: 'repo',
    label: 'Карта кода',
    shortLabel: 'КОД',
    tokens: 16,
    growth: 2,
    color: '#5f7f32',
  },
  {
    id: 'docs',
    label: 'Документация',
    shortLabel: 'ДОК',
    tokens: 14,
    growth: 2,
    color: '#8a63d2',
  },
  {
    id: 'logs',
    label: 'Логи ошибки',
    shortLabel: 'ЛОГ',
    tokens: 10,
    growth: 1,
    color: '#2c2733',
  },
  {
    id: 'prompt',
    label: 'Цель задачи',
    shortLabel: 'ЦЕЛЬ',
    tokens: 18,
    growth: 3,
    color: '#fdb124',
  },
]

const START_SNAKE: Point[] = [
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 },
]

const MOVE_BY_DIRECTION: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function pointsEqual(first: Point, second: Point) {
  return first.x === second.x && first.y === second.y
}

function buildCellKey(point: Point) {
  return `${point.x}:${point.y}`
}

function pickRandomItem() {
  return CONTEXT_ITEMS[Math.floor(Math.random() * CONTEXT_ITEMS.length)]
}

function getRandomFreePoint(snake: Point[], foods: Food[] = []) {
  const occupied = new Set([
    ...snake.map(buildCellKey),
    ...foods.map((food) => buildCellKey(food.point)),
  ])
  const freeCells: Point[] = []

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        freeCells.push({ x, y })
      }
    }
  }

  return freeCells[Math.floor(Math.random() * freeCells.length)] ?? { x: 12, y: 8 }
}

function buildFoodBatch(snake: Point[], count: number) {
  const foods: Food[] = []

  for (let index = 0; index < count; index += 1) {
    foods.push({
      point: getRandomFreePoint(snake, foods),
      item: pickRandomItem(),
    })
  }

  return foods
}

function formatTime(seconds: number) {
  return `0:${seconds.toString().padStart(2, '0')}`
}

function formatContextPercent(value: number) {
  return Math.min(100, Math.round((value / CONTEXT_LIMIT) * 100))
}

function formatContextImpact(tokens: number) {
  return Math.max(1, Math.round((tokens / CONTEXT_LIMIT) * 100))
}

function ContextSnakeGame({ onFinish }: ContextSnakeGameProps) {
  const [snake, setSnake] = useState<Point[]>(START_SNAKE)
  const [foods, setFoods] = useState(() => buildFoodBatch(START_SNAKE, FOOD_COUNT))
  const [hasStarted, setHasStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [contextUsed, setContextUsed] = useState(INITIAL_CONTEXT)
  const [pendingGrowth, setPendingGrowth] = useState(0)
  const [lastItem, setLastItem] = useState<ContextItem | null>(null)
  const [collectedItemIds, setCollectedItemIds] = useState<string[]>([])
  const [finishReason, setFinishReason] = useState<FinishReason | null>(null)
  const finishRef = useRef(onFinish)
  const finishedRef = useRef(false)
  const directionRef = useRef<Direction>('right')
  const queuedDirectionRef = useRef<Direction>('right')
  const deadlineRef = useRef<number | null>(null)
  const foodsRef = useRef(foods)
  const contextUsedRef = useRef(INITIAL_CONTEXT)
  const pendingGrowthRef = useRef(0)
  const collectedItemIdsRef = useRef<string[]>([])

  useEffect(() => {
    finishRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    foodsRef.current = foods
  }, [foods])

  useEffect(() => {
    contextUsedRef.current = contextUsed
  }, [contextUsed])

  useEffect(() => {
    pendingGrowthRef.current = pendingGrowth
  }, [pendingGrowth])

  useEffect(() => {
    collectedItemIdsRef.current = collectedItemIds
  }, [collectedItemIds])

  const finishGame = useCallback((reason: FinishReason) => {
    if (finishedRef.current) return

    finishedRef.current = true
    setFinishReason(reason)
    finishRef.current(reason === 'win' ? 'success' : 'fail')
  }, [])

  const queueDirection = useCallback((nextDirection: Direction) => {
    if (OPPOSITE_DIRECTION[directionRef.current] === nextDirection) return

    queuedDirectionRef.current = nextDirection
    setHasStarted(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const directionByKey: Record<string, Direction | undefined> = {
        ArrowUp: 'up',
        KeyW: 'up',
        ArrowDown: 'down',
        KeyS: 'down',
        ArrowLeft: 'left',
        KeyA: 'left',
        ArrowRight: 'right',
        KeyD: 'right',
      }
      const nextDirection = directionByKey[event.code]

      if (!nextDirection) return

      event.preventDefault()
      queueDirection(nextDirection)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [queueDirection])

  useEffect(() => {
    if (!hasStarted || finishReason) return

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
        finishGame(
          collectedItemIdsRef.current.length >= REQUIRED_CONTEXT_TYPES
            ? 'win'
            : 'missing-context',
        )
      }
    }, 250)

    return () => window.clearInterval(timerId)
  }, [finishGame, finishReason, hasStarted])

  useEffect(() => {
    if (!hasStarted || finishReason) return

    const tickId = window.setInterval(() => {
      setSnake((currentSnake) => {
        const nextDirection = queuedDirectionRef.current
        directionRef.current = nextDirection
        const move = MOVE_BY_DIRECTION[nextDirection]
        const nextHead = {
          x: currentSnake[0].x + move.x,
          y: currentSnake[0].y + move.y,
        }

        if (
          nextHead.x < 0 ||
          nextHead.x >= GRID_WIDTH ||
          nextHead.y < 0 ||
          nextHead.y >= GRID_HEIGHT
        ) {
          finishGame('wall')
          return currentSnake
        }

        const eatenFoodIndex = foodsRef.current.findIndex((currentFood) =>
          pointsEqual(nextHead, currentFood.point),
        )
        const eatenFood = foodsRef.current[eatenFoodIndex]
        const ateFood = Boolean(eatenFood)
        const nextPendingGrowth = ateFood
          ? pendingGrowthRef.current + eatenFood.item.growth
          : pendingGrowthRef.current
        const willGrow = nextPendingGrowth > 0
        const bodyToCheck = willGrow ? currentSnake : currentSnake.slice(0, -1)

        if (bodyToCheck.some((segment) => pointsEqual(segment, nextHead))) {
          finishGame('self')
          return currentSnake
        }

        let nextSnake = [nextHead, ...currentSnake]

        if (willGrow) {
          const remainingGrowth = nextPendingGrowth - 1
          pendingGrowthRef.current = remainingGrowth
          setPendingGrowth(remainingGrowth)
        } else {
          nextSnake = nextSnake.slice(0, -1)
        }

        if (ateFood) {
          const item = eatenFood.item
          const nextContextUsed = contextUsedRef.current + item.tokens

          setLastItem(item)
          const nextCollectedItemIds = collectedItemIdsRef.current.includes(item.id)
            ? collectedItemIdsRef.current
            : [...collectedItemIdsRef.current, item.id]
          collectedItemIdsRef.current = nextCollectedItemIds
          setCollectedItemIds(nextCollectedItemIds)
          contextUsedRef.current = nextContextUsed
          setContextUsed(nextContextUsed)

          if (nextContextUsed >= CONTEXT_LIMIT) {
            finishGame('overflow')
            return nextSnake
          }

          if (nextCollectedItemIds.length >= REQUIRED_CONTEXT_TYPES) {
            finishGame('win')
            return nextSnake
          }

          const nextFoods = foodsRef.current.filter(
            (_, index) => index !== eatenFoodIndex,
          )
          nextFoods.push({
            point: getRandomFreePoint(nextSnake, nextFoods),
            item: pickRandomItem(),
          })
          foodsRef.current = nextFoods
          setFoods(nextFoods)
        }

        return nextSnake
      })
    }, TICK_MS)

    return () => window.clearInterval(tickId)
  }, [finishGame, finishReason, hasStarted])

  const snakeCells = useMemo(
    () => new Map(snake.map((segment, index) => [buildCellKey(segment), index])),
    [snake],
  )
  const contextPercent = formatContextPercent(contextUsed)
  const collectedCount = collectedItemIds.length
  const fieldContextTotal = foods.reduce(
    (total, food) => total + formatContextImpact(food.item.tokens),
    0,
  )
  const hottestFood = foods.reduce(
    (currentHottest, currentFood) =>
      currentFood.item.tokens > currentHottest.item.tokens
        ? currentFood
        : currentHottest,
    foods[0],
  )
  const resultTitle =
    finishReason === 'win'
      ? 'Контекст собран'
      : finishReason === 'missing-context'
        ? 'Не хватило полезных подсказок'
      : finishReason === 'overflow'
        ? 'Контекст переполнен лишним'
        : finishReason === 'self'
          ? 'Змейка запуталась в себе'
          : finishReason === 'wall'
            ? 'Врезался в границу поля'
            : null

  return (
    <div className="context-snake-root">
      <div className="context-snake-hud">
        <div className="context-snake-stat">
          <span>Таймер</span>
          <strong className={timeLeft <= 10 ? 'context-snake-danger' : ''}>
            {formatTime(timeLeft)}
          </strong>
        </div>
        <div className="context-snake-window">
          <div className="context-snake-window-label">
            <span>Заполнение контекста</span>
            <strong>{contextPercent}%</strong>
          </div>
          <div className="context-snake-meter" aria-hidden="true">
            <div style={{ width: `${contextPercent}%` }} />
          </div>
        </div>
        <div className="context-snake-stat">
          <span>Длина</span>
          <strong>{snake.length}</strong>
        </div>
      </div>

      <div className="context-snake-objective">
        <div>
          <span>Задача</span>
          <strong>Собери разные подсказки: {Math.min(collectedCount, REQUIRED_CONTEXT_TYPES)}/{REQUIRED_CONTEXT_TYPES}</strong>
        </div>
        <div className="context-snake-checklist">
          {CONTEXT_ITEMS.map((item) => {
            const isCollected = collectedItemIds.includes(item.id)

            return (
              <span
                key={item.id}
                className={isCollected ? 'context-snake-collected' : ''}
              >
                {isCollected ? '✓ ' : ''}
                {item.shortLabel} +{formatContextImpact(item.tokens)}%
              </span>
            )
          })}
        </div>
      </div>

      <div className="context-snake-main">
        <div
          className="context-snake-board"
          style={{
            gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
          }}
          aria-label="Поле игры Контекстная змейка"
        >
          {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, (_, cellIndex) => {
            const point = {
              x: cellIndex % GRID_WIDTH,
              y: Math.floor(cellIndex / GRID_WIDTH),
            }
            const key = buildCellKey(point)
            const snakeIndex = snakeCells.get(key)
            const currentFood = foods.find((food) => pointsEqual(point, food.point))
            const isHead = snakeIndex === 0

            return (
              <div
                key={key}
                className={[
                  'context-snake-cell',
                  snakeIndex !== undefined ? 'context-snake-segment' : '',
                  isHead ? 'context-snake-head' : '',
                  currentFood ? 'context-snake-food' : '',
                ].join(' ')}
                style={
                  currentFood
                    ? ({
                        '--context-item-color': currentFood.item.color,
                      } as React.CSSProperties)
                  : undefined
                }
                aria-label={
                  currentFood
                    ? `${currentFood.item.label}, +${formatContextImpact(currentFood.item.tokens)}% к контексту`
                    : undefined
                }
              >
                {currentFood && (
                  <span>
                    <strong>{currentFood.item.shortLabel}</strong>
                    <small>+{formatContextImpact(currentFood.item.tokens)}%</small>
                  </span>
                )}
              </div>
            )
          })}

          {!hasStarted && !finishReason && (
            <div className="context-snake-overlay">
              <h3>Контекстная змейка</h3>
              <p>
                Собери 4 разных типа подсказок для AI-агента и не переполни контекст.
                Процент на подсказке показывает, насколько она заполнит контекст.
              </p>
              <button className="btn primary" onClick={() => setHasStarted(true)}>
                Старт
              </button>
            </div>
          )}

          {finishReason && (
            <div className="context-snake-overlay context-snake-result">
              <span
                className={`context-snake-result-badge ${
                  finishReason === 'win'
                    ? 'context-snake-result-success'
                    : 'context-snake-result-fail'
                }`}
              >
                {finishReason === 'win' ? 'Победа' : 'Поражение'}
              </span>
              <h3>{resultTitle}</h3>
              <p>
                {finishReason === 'win'
                  ? `Финальная загрузка контекста: ${contextPercent}%. Агенту хватит данных, чтобы помочь.`
                  : finishReason === 'missing-context'
                    ? `Время вышло, собрано только ${collectedCount}/${REQUIRED_CONTEXT_TYPES} нужных типов.`
                  : `Игра остановлена на ${formatTime(timeLeft)}. Контекст заполнен на ${contextPercent}%.`}
              </p>
            </div>
          )}
        </div>

        <aside className="context-snake-side">
          <div className="context-snake-next">
            <span>На поле</span>
            <strong>{fieldContextTotal}% контекста</strong>
            <p>
              Доступно {foods.length} подсказок. Если собрать всё подряд,
              контекст переполнится. Самая объёмная: {hottestFood.item.label}, +{formatContextImpact(hottestFood.item.tokens)}%.
            </p>
          </div>

          <div className="context-snake-next">
            <span>Последний кусок</span>
            <strong>{lastItem?.label ?? 'пока пусто'}</strong>
            <p>
              {lastItem
                ? `+${formatContextImpact(lastItem.tokens)}% к контексту, рост +${lastItem.growth}`
                : 'первый контекст еще впереди'}
            </p>
          </div>

          <div className="context-snake-controls" aria-label="Управление змейкой">
            <button onClick={() => queueDirection('up')} aria-label="Вверх">↑</button>
            <button onClick={() => queueDirection('left')} aria-label="Влево">←</button>
            <button onClick={() => queueDirection('right')} aria-label="Вправо">→</button>
            <button onClick={() => queueDirection('down')} aria-label="Вниз">↓</button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ContextSnakeGame
