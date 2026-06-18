import { useState } from 'react'
import './App.css'
import ContextSnakeGame from './games/context-snake/ContextSnakeGame'
import MatchPairsGame from './games/match-pairs/MatchPairsGame'
import OddOneOutGame from './games/odd-one-out/OddOneOutGame'
import { generatePostcard } from './postcardGenerator'
import nessyNewYearImage from './assets/nessy-new-year.png'

type Screen = 'start' | 'enterName' | 'game' | 'summary'
type GameResult = 'success' | 'fail' | null
type StoredGameResultSource = 'played' | 'skipped' | null
type GameSessionStatus = 'started' | 'in_progress' | 'finished'

const MAX_NAME_LENGTH = 127
const GAMES_PER_RUN = 5
const ENABLE_GAME_RETRY = Boolean(import.meta.env.VITE_ENABLE_GAME_RETRY)
const ENABLE_GAME_SKIP = Boolean(import.meta.env.VITE_ENABLE_GAME_SKIP)
const NAME_PLACEHOLDERS = [
  "Например, Жаркий вайбкодер",
  "Например, Летний деплойщик",
  "Например, Главный по продакшену",
  "Например, Багоборец",
  "Например, Агент 404",
  "Например, Продовый маг",
  "Например, Сеньор по лету",
  "Например, CI/CD-чемпион",
  "Например, Повелитель фичефлагов",
  "Например, Merge-мастер",
  "Например, Hotfix-герой",
  "Например, Тот самый из прода",
  "Например, Властелин контекста",
  "Например, QA-ниндзя",
  "Например, Prompt-пилот",
  "Например, Контекстный маг",
  "Например, Релизный шаман",
  "Например, Капитан Rollback",
  "Например, Main Character",
  "Например, Summer Engineer",
  "Например, Кодовый спасатель",
  "Например, Агент на минималках",
  "Например, Человек-пайплайн",
  "Например, Лорд Staging",
  "Например, Фича в шлёпках",
  "Например, Тёплый коммит",
  "Например, Солнечный ревьюер",
  "Например, Деплойный вайб",
  "Например, Летний мерж",
  "Например, Прод без паники",
  "Например, Тесты зелёные",
  "Например, Шорткат до прода",
  "Например, Хранитель main",
  "Например, Спринтующий агент",
  "Например, Билд прошёл",
  "Например, Код под SPF 50",
  "Например, Архитектор вайба",
  "Например, Инженер хорошего настроения",
  "Например, Просто Денис",
  "Например, Не баг, а фича"
]

type GameDefinition = {
  id: string
  title: string
  description: string
  render: (onFinish: (result: Exclude<GameResult, null>) => void) => React.ReactNode
}

type GameSessionPayload = {
  sessionId: string
  playerLogin: string
  status: GameSessionStatus
  startedAt: string
  updatedAt: string
  finishedAt: string | null
  games: Array<{
    index: number
    id: string
    title: string
    description: string
    result: GameResult
    resultSource: StoredGameResultSource
    completedAt: string | null
  }>
  summary: {
    totalGames: number
    completedGames: number
    successCount: number
    failCount: number
  }
}

const AVAILABLE_GAMES: GameDefinition[] = [
  {
    id: 'context-snake',
    title: 'Контекстная змейка',
    description:
      'Управляй змейкой внутри контекстного окна: собирай MCP, skills, docs и prompt-куски, но не переполни контекст. Нужно продержаться 60 секунд.',
    render: (onFinish) => <ContextSnakeGame onFinish={onFinish} />,
  },
  {
    id: 'odd-one-out',
    title: 'Кто лишний?',
    description:
      'Ищи лишний пункт в SDLC наборах из четырёх слов. Для победы нужно минимум 5 правильных ответов без ошибок.',
    render: (onFinish) => <OddOneOutGame onFinish={onFinish} />,
  },
  {
    id: 'match-pairs',
    title: 'Найди пару',
    description:
      'Открывай по две карточки и сопоставляй оранжевые проблемы в SDLC с синими AI-решениями. За 60 секунд нужно найти 6 пар.',
    render: (onFinish) => <MatchPairsGame onFinish={onFinish} />,
  },
]

function getRandomGamesForRun() {
  const shuffledGames = [...AVAILABLE_GAMES]

  for (let i = shuffledGames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledGames[i], shuffledGames[j]] = [
      shuffledGames[j],
      shuffledGames[i],
    ]
  }

  return shuffledGames.slice(0, Math.min(GAMES_PER_RUN, AVAILABLE_GAMES.length))
}

function getRandomNamePlaceholder() {
  return NAME_PLACEHOLDERS[
    Math.floor(Math.random() * NAME_PLACEHOLDERS.length)
  ]
}

function createGameSessionId() {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `game-${Date.now()}-${randomPart}`
}

function buildGameSessionPayload(params: {
  sessionId: string
  playerLogin: string
  status: GameSessionStatus
  startedAt: string
  updatedAt: string
  finishedAt: string | null
  games: GameDefinition[]
  results: GameResult[]
  resultSources: StoredGameResultSource[]
  completedAt: Array<string | null>
}): GameSessionPayload {
  const successCount = params.results.filter((result) => result === 'success').length
  const failCount = params.results.filter((result) => result === 'fail').length

  return {
    sessionId: params.sessionId,
    playerLogin: params.playerLogin,
    status: params.status,
    startedAt: params.startedAt,
    updatedAt: params.updatedAt,
    finishedAt: params.finishedAt,
    games: params.games.map((game, index) => ({
      index,
      id: game.id,
      title: game.title,
      description: game.description,
      result: params.results[index] ?? null,
      resultSource: params.resultSources[index] ?? null,
      completedAt: params.completedAt[index] ?? null,
    })),
    summary: {
      totalGames: params.games.length,
      completedGames: params.results.filter((result) => result !== null).length,
      successCount,
      failCount,
    },
  }
}

function saveGameSession(payload: GameSessionPayload) {
  void fetch('/api/game-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn('Не удалось сохранить игровую сессию', error)
  })
}

function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [playerName, setPlayerName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [namePlaceholder, setNamePlaceholder] = useState(NAME_PLACEHOLDERS[0])
  const [gamesForRun, setGamesForRun] = useState<GameDefinition[]>(() =>
    getRandomGamesForRun(),
  )

  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [currentGameResult, setCurrentGameResult] = useState<GameResult>(null)
  const [isCurrentGameFinished, setIsCurrentGameFinished] = useState(false)

  const [results, setResults] = useState<GameResult[]>([])
  const [resultSources, setResultSources] = useState<StoredGameResultSource[]>([])
  const [resultCompletedAt, setResultCompletedAt] = useState<Array<string | null>>([])
  const [gameSessionId, setGameSessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [gameRunId, setGameRunId] = useState(0)

  const handleStartClick = () => {
    setNamePlaceholder(getRandomNamePlaceholder())
    setScreen('enterName')
  }

  const handleNameChange = (value: string) => {
    if (value.length > MAX_NAME_LENGTH) return
    setPlayerName(value)
    if (!value.trim()) {
      setNameError('Имя не может быть пустым')
    } else {
      setNameError(null)
    }
  }

  const handleStartGame = () => {
    if (!playerName.trim()) {
      setNameError('Имя не может быть пустым')
      return
    }
    const runGames = getRandomGamesForRun()
    const startedAt = new Date().toISOString()
    const sessionId = createGameSessionId()
    const normalizedPlayerName = playerName.trim()

    setPlayerName(normalizedPlayerName)
    setGamesForRun(runGames)
    setCurrentGameIndex(0)
    setCurrentGameResult(null)
    setIsCurrentGameFinished(false)
    setResults([])
    setResultSources([])
    setResultCompletedAt([])
    setGameSessionId(sessionId)
    setSessionStartedAt(startedAt)
    setGameRunId(0)
    saveGameSession(
      buildGameSessionPayload({
        sessionId,
        playerLogin: normalizedPlayerName,
        status: 'started',
        startedAt,
        updatedAt: startedAt,
        finishedAt: null,
        games: runGames,
        results: [],
        resultSources: [],
        completedAt: [],
      }),
    )
    setScreen('game')
  }

  const handleMarkGame = (result: Exclude<GameResult, null>) => {
    setCurrentGameResult(result)
    setIsCurrentGameFinished(true)
  }

  const handleNextStep = (forcedResult?: Exclude<GameResult, null>) => {
    const updatedResults = [...results]
    const updatedResultSources = [...resultSources]
    const updatedCompletedAt = [...resultCompletedAt]
    const resultToStore: Exclude<GameResult, null> =
      forcedResult ?? currentGameResult ?? 'fail'
    const completedAt = new Date().toISOString()
    updatedResults[currentGameIndex] = resultToStore
    updatedResultSources[currentGameIndex] = forcedResult ? 'skipped' : 'played'
    updatedCompletedAt[currentGameIndex] = completedAt
    setResults(updatedResults)
    setResultSources(updatedResultSources)
    setResultCompletedAt(updatedCompletedAt)

    if (currentGameIndex + 1 >= gamesForRun.length) {
      if (gameSessionId && sessionStartedAt) {
        saveGameSession(
          buildGameSessionPayload({
            sessionId: gameSessionId,
            playerLogin: playerName,
            status: 'finished',
            startedAt: sessionStartedAt,
            updatedAt: completedAt,
            finishedAt: completedAt,
            games: gamesForRun,
            results: updatedResults,
            resultSources: updatedResultSources,
            completedAt: updatedCompletedAt,
          }),
        )
      }
      setScreen('summary')
      return
    }

    if (gameSessionId && sessionStartedAt) {
      saveGameSession(
        buildGameSessionPayload({
          sessionId: gameSessionId,
          playerLogin: playerName,
          status: 'in_progress',
          startedAt: sessionStartedAt,
          updatedAt: completedAt,
          finishedAt: null,
          games: gamesForRun,
          results: updatedResults,
          resultSources: updatedResultSources,
          completedAt: updatedCompletedAt,
        }),
      )
    }

    setCurrentGameIndex((prev) => prev + 1)
    setCurrentGameResult(null)
    setIsCurrentGameFinished(false)
  }

  const handleRestart = () => {
    setScreen('start')
    setPlayerName('')
    setNameError(null)
    setCurrentGameIndex(0)
    setCurrentGameResult(null)
    setIsCurrentGameFinished(false)
    setResults([])
    setResultSources([])
    setResultCompletedAt([])
    setGameSessionId(null)
    setSessionStartedAt(null)
    setGameRunId(0)
    setGamesForRun(getRandomGamesForRun())
  }

  const handleRestartCurrentGame = () => {
    setCurrentGameResult(null)
    setIsCurrentGameFinished(false)
    setGameRunId((prev) => prev + 1)
  }

  const handleSkipGame = () => {
    // Пропускаем игру с результатом "fail"
    handleNextStep('fail')
  }

  return (
    <div className="app-root">
      <div className="app-card">
        {screen === 'start' && (
          <StartScreen onStart={handleStartClick} />
        )}

        {screen === 'enterName' && (
          <EnterNameScreen
            name={playerName}
            error={nameError}
            placeholder={namePlaceholder}
            onChangeName={handleNameChange}
            onStartGame={handleStartGame}
            onBack={() => setScreen('start')}
          />
        )}

        {screen === 'game' && (
          <GameScreen
            playerName={playerName}
            game={gamesForRun[currentGameIndex]}
            isLastGame={currentGameIndex + 1 === gamesForRun.length}
            isFinished={isCurrentGameFinished}
            onMarkGame={handleMarkGame}
            onNextStep={handleNextStep}
            onSkip={handleSkipGame}
            onRestart={handleRestartCurrentGame}
            gameRunId={gameRunId}
          />
        )}

        {screen === 'summary' && (
          <SummaryScreen
            playerName={playerName}
            games={gamesForRun}
            results={results}
            onRestart={handleRestart}
          />
        )}

        <footer className="app-footer">
          <span className="app-footer-text">Vibecoded by Nessy</span>
        </footer>
      </div>
    </div>
  )
}

type StartScreenProps = {
  onStart: () => void
}

function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="screen start-screen">
      <section className="start-hero">
        <div className="city-sign">Санкт-Петербург</div>
        <div className="hero-copy">
          <p className="eyebrow">Сезон кода</p>
          <h1 className="title hero-title">Прод, жара и агенты</h1>
          <p className="subtitle hero-subtitle">
            Жми "НАЧАТЬ ИГРУ", пройди мини-задания от Nessy и узнай, насколько хорошо ты знаком с AI для SDLC.
          </p>
          <div className="buttons-row">
            <button className="btn primary" onClick={onStart}>
              Начать игру
            </button>
          </div>
        </div>
        <div className="festival-road" aria-hidden="true">
          <div className="festival-van">
            <div className="van-window van-window-left" />
            <div className="van-window van-window-mid" />
            <div className="van-window van-window-front" />
            <div className="van-wheel van-wheel-left" />
            <div className="van-wheel van-wheel-right" />
          </div>
          <div className="road-line" />
          <div className="grass-bed" />
        </div>
      </section>
    </div>
  )
}

type EnterNameScreenProps = {
  name: string
  error: string | null
  placeholder: string
  onChangeName: (value: string) => void
  onStartGame: () => void
  onBack: () => void
}

function EnterNameScreen({
  name,
  error,
  placeholder,
  onChangeName,
  onStartGame,
  onBack,
}: EnterNameScreenProps) {
  return (
    <div className="screen">
      <h2 className="title">Как тебя представить?</h2>
      <p className="subtitle">
        Введи имя/никнейм — его мы используем в итоговой открытке
      </p>
      <div className="form-group">
        <input
          id="playerName"
          className={`input ${error ? 'input-error' : ''}`}
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder={placeholder}
        />
        <div className="input-footer">
          <span className="input-counter">
            {name.length}/{MAX_NAME_LENGTH}
          </span>
          {error && <span className="input-error-text">{error}</span>}
        </div>
      </div>
      <div className="buttons-row">
        <button className="btn secondary" onClick={onBack}>
          Назад
        </button>
        <button
          className="btn primary"
          onClick={onStartGame}
          disabled={!name.trim()}
        >
          Поехали!
        </button>
      </div>
    </div>
  )
}

type GameLayoutProps = {
  title: string
  description: string
  children: React.ReactNode
  isFinished: boolean
  onNextStep: (forcedResult?: Exclude<GameResult, null>) => void
  onSkip: () => void
  isLastGame: boolean
  onRestart: () => void
}

function GameLayout({
  title,
  description,
  children,
  isFinished,
  onNextStep,
  onSkip,
  isLastGame,
  onRestart,
}: GameLayoutProps) {
  return (
    <div className="screen">
      <div className="route-ribbon" aria-hidden="true">
        <span>Ломаем шаблоны</span>
        <strong>Сезон кода</strong>
        <span>Вдохновляем других</span>
      </div>
      <header className="game-header">
        <p className="eyebrow">Игровой маршрут</p>
        <h2 className="title">{title}</h2>
        <p className="subtitle">{description}</p>
      </header>

      <section className="game-content">{children}</section>

      <footer className="game-footer">
        <div className="buttons-row">
          {ENABLE_GAME_RETRY && (
            <button className="btn secondary" type="button" onClick={onRestart}>
              Попробовать еще раз
            </button>
          )}
          <button
            className="btn primary"
            type="button"
            onClick={() => onNextStep()}
            disabled={!isFinished}
          >
            {isLastGame ? 'Перейти к итогам' : 'К следующему шагу'}
          </button>
        </div>
        {!isFinished && (
          <p className="helper-text">
            Заверши мини‑игру, чтобы перейти дальше.
          </p>
        )}
        {ENABLE_GAME_SKIP && (
          <div className="buttons-row" style={{ marginTop: '12px' }}>
            <button
              className="btn secondary"
              type="button"
              onClick={onSkip}
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              Пропустить игру
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}

type GameScreenProps = {
  playerName: string
  game: GameDefinition | undefined
  isLastGame: boolean
  isFinished: boolean
  onMarkGame: (result: Exclude<GameResult, null>) => void
  onNextStep: (forcedResult?: Exclude<GameResult, null>) => void
  onSkip: () => void
  onRestart: () => void
  gameRunId: number
}

function GameScreen({
  playerName,
  game,
  isLastGame,
  isFinished,
  onMarkGame,
  onNextStep,
  onSkip,
  onRestart,
  gameRunId,
}: GameScreenProps) {
  if (game) {
    return (
      <GameLayout
        title={game.title}
        description={game.description}
        isFinished={isFinished}
        onNextStep={onNextStep}
        onSkip={onSkip}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <div key={`${game.id}-${gameRunId}`}>
          {game.render(onMarkGame)}
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout
      title="Мини‑игра"
      description={`Шаблон новогодней мини‑игры про Nestor для игрока ${playerName}. Здесь потом появится реальный геймплей.`}
      isFinished={isFinished}
      onNextStep={onNextStep}
      onSkip={onSkip}
      isLastGame={isLastGame}
      onRestart={onRestart}
    >
      <div className="dummy-game">
        <p>
          Это заглушка мини‑игры. Нажми одну из кнопок ниже, чтобы отметить,
          прошёл ли игрок задание.
        </p>
        <div className="buttons-row">
          <button
            className="btn success-outline"
            onClick={() => onMarkGame('success')}
          >
            Отметить как успешно пройдено
          </button>
          <button
            className="btn fail-outline"
            onClick={() => onMarkGame('fail')}
          >
            Отметить как провалено
          </button>
        </div>
      </div>
    </GameLayout>
  )
}

type SummaryScreenProps = {
  playerName: string
  games: GameDefinition[]
  results: GameResult[]
  onRestart: () => void
}

function SummaryScreen({
  playerName,
  games,
  results,
  onRestart,
}: SummaryScreenProps) {
  const successCount = results.filter((r) => r === 'success').length
  const totalPlayed = results.length
  const [postcardText, setPostcardText] = useState<string | null>(null)
  const [isPostcardLoading, setIsPostcardLoading] = useState(false)

  const getSummaryText = (successCount: number, totalPlayed: number) => {
    if (totalPlayed === 0) {
      return 'Ещё ни одно задание не пройдено — самое время начать свою историю во вселенной Nestor!'
    }

    switch (successCount) {
      case 0:
        return 'Ты ответил(а) так, будто Nestor — это новый фреймворк на TypeScript, который ты ещё не успел(а) глянуть. А он просто рядом. И ждёт. Терпеливо. Как и мы 🥲'
      case 1:
        return 'Ты набрал 1 балл, но мы не скажем остальным. Это наш секрет, да? 😏'
      case 2:
        return 'Неплохо! Пара успешных заданий показывает, что вы с Nestor уже начали находить общий язык. Ещё немного практики — и лор станет родным.'
      case 3:
        return 'Ты в теме, но не до конца. Скорее, как разработчик, который слышал про Nestor на митапе, но забыл, зачем он. Бывает.'
      case 4:
        return 'Ого! Ты явно не просто так тут. Скажи честно — ты в команде? Или, может, просто слишком много кофе перед этим тестом? ☕'
      case 5:
        return 'Если это не чит, то ты явно в команде Nestor. Или у тебя слишком хорошая память. Или слишком много свободного времени 😏'
      default:
        return 'Отличный результат! Ты явно хорошо ориентируешься во вселенной Nestor.'
    }
  }

  const handleGetPostcard = async () => {
    if (isPostcardLoading) return

    setIsPostcardLoading(true)
    try {
      const generatedText = await generatePostcard({
        playerName,
        successCount,
        totalPlayed,
        games: games.map((game, index) => ({
          title: game.title,
          description: game.description,
          result: results[index] ?? null,
        })),
      })
      setPostcardText(generatedText)
    } finally {
      setIsPostcardLoading(false)
    }
  }

  return (
    <div className="screen summary-screen">
      <div className="route-ribbon route-ribbon-summary" aria-hidden="true">
        <span>Технологии вперед</span>
        <strong>Сезон кода</strong>
        <span>Финиш</span>
      </div>
      <h2 className="title">Итоги игры</h2>
      <p className="subtitle">
        {playerName ? `${playerName}, ` : ''}вот как ты справился с новогодними заданиями про Nestor:
      </p>

      <div className="summary-card">
        <p className="summary-main">
          Успешно пройдено заданий: <strong>{successCount}</strong> из{' '}
          <strong>{totalPlayed}</strong>.
        </p>
        <p className="summary-text">
          {getSummaryText(successCount, totalPlayed)}
        </p>
        <p className="summary-text">
        Не уйти от судьбы — нужен твой ответ в опросе. 5 минут, и ты — герой дня 🌟 Ссылка ждёт тебя <a href="https://polls.tbank.ru/s/cmj1aq4u405pn0eurch4mbavr" target="_blank">тут</a>. Спасибо, ты молодец! 💖
        </p>
      </div>

      {postcardText && (
        <div className="summary-card postcard-card">
          <h3 className="postcard-title">Твоя новогодняя открытка от Nessy</h3>
          <div className="postcard-body">
            <img
              src={nessyNewYearImage}
              alt="Новогодняя открытка от Nessy"
              className="postcard-image"
            />
            <p className="postcard-text">{postcardText}</p>
          </div>
        </div>
      )}

      <div className="summary-actions">
        <button className="btn secondary" onClick={onRestart}>
          Сыграть ещё раз
        </button>
        {!postcardText && (
          <button
            className="btn primary"
            type="button"
            onClick={handleGetPostcard}
            disabled={isPostcardLoading}
          >
            {isPostcardLoading ? 'Генерируем...' : 'Получить открытку'}
          </button>
        )}
      </div>
    </div>
  )
}

export default App
