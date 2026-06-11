import { useState } from 'react'
import './App.css'
import PuzzleGame from './games/PuzzleGame'
import ReactionGame from './games/ReactionGame'
import MatchPairsGame from './games/MatchPairsGame'
import TapGame from './games/TapGame'
import CraftingGame from './games/CraftingGame'
import PrTinderGame from './games/PrTinderGame'
import { POSTCARDS, renderPostcard } from './postcards'
import nessyNewYearImage from './assets/nessy-new-year.png'

type Screen = 'start' | 'enterName' | 'game' | 'summary'
type GameResult = 'success' | 'fail' | null

const MAX_NAME_LENGTH = 127
const TOTAL_GAMES = 6

function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [playerName, setPlayerName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [currentGameResult, setCurrentGameResult] = useState<GameResult>(null)
  const [isCurrentGameFinished, setIsCurrentGameFinished] = useState(false)

  const [results, setResults] = useState<GameResult[]>([])
  const [gameRunId, setGameRunId] = useState(0)

  const handleStartClick = () => {
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
    setScreen('game')
  }

  const handleMarkGame = (result: Exclude<GameResult, null>) => {
    setCurrentGameResult(result)
    setIsCurrentGameFinished(true)
  }

  const handleNextStep = (forcedResult?: Exclude<GameResult, null>) => {
    const updatedResults = [...results]
    const resultToStore: Exclude<GameResult, null> =
      forcedResult ?? currentGameResult ?? 'fail'
    updatedResults[currentGameIndex] = resultToStore
    setResults(updatedResults)

    if (currentGameIndex + 1 >= TOTAL_GAMES) {
      setScreen('summary')
      return
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
    setGameRunId(0)
  }

  const handleRestartCurrentGame = () => {
    setCurrentGameResult(null)
    setIsCurrentGameFinished(false)
    setGameRunId((prev) => prev + 1)
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
            onChangeName={handleNameChange}
            onStartGame={handleStartGame}
            onBack={() => setScreen('start')}
          />
        )}

        {screen === 'game' && (
          <GameScreen
            playerName={playerName}
            gameIndex={currentGameIndex}
            totalGames={TOTAL_GAMES}
            result={currentGameResult}
            isFinished={isCurrentGameFinished}
            onMarkGame={handleMarkGame}
            onNextStep={handleNextStep}
            onRestart={handleRestartCurrentGame}
            gameRunId={gameRunId}
          />
        )}

        {screen === 'summary' && (
          <SummaryScreen
            playerName={playerName}
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
    <div className="screen">
      <h1 className="title">Новогодняя игра «Вселенная Nestor 2025»</h1>
      <p className="subtitle">
        Введи своё имя, пройди мини‑игры от Nessy и узнай, насколько хорошо ты знаком с лором Nestor 2025 года.
      </p>
      <div className="buttons-row">
        <button className="btn primary" onClick={onStart}>
          Начать игру
        </button>
      </div>
    </div>
  )
}

type EnterNameScreenProps = {
  name: string
  error: string | null
  onChangeName: (value: string) => void
  onStartGame: () => void
  onBack: () => void
}

function EnterNameScreen({
  name,
  error,
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
          placeholder="Например, :nestor_help:"
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
  result: GameResult
  isFinished: boolean
  onNextStep: (forcedResult?: Exclude<GameResult, null>) => void
  isLastGame: boolean
  onRestart: () => void
}

function GameLayout({
  title,
  description,
  children,
  result,
  isFinished,
  onNextStep,
  isLastGame,
  onRestart,
}: GameLayoutProps) {
  return (
    <div className="screen">
      <header className="game-header">
        <h2 className="title">{title}</h2>
        <p className="subtitle">{description}</p>
      </header>

      <section className="game-content">{children}</section>

      <section className="game-result">
        {result === null && (
          <p className="game-result-text muted">
            Результат появится здесь, когда мини‑игра будет завершена.
          </p>
        )}
        {result === 'success' && (
          <div className="game-result-box success">
            <h3>Успех! 🎄</h3>
            <p>Ты блестяще справился с этим заданием.</p>
          </div>
        )}
        {result === 'fail' && (
          <div className="game-result-box fail">
            <h3>Не в этот раз ❄️</h3>
            <p>Ничего страшного, впереди ещё задания — можно реабилитироваться!</p>
          </div>
        )}
      </section>

      <footer className="game-footer">
        <div className="buttons-row">
          <button className="btn secondary" type="button" onClick={onRestart}>
            Попробовать ещё раз
          </button>
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
      </footer>
    </div>
  )
}

type GameScreenProps = {
  playerName: string
  gameIndex: number
  totalGames: number
  result: GameResult
  isFinished: boolean
  onMarkGame: (result: Exclude<GameResult, null>) => void
  onNextStep: (forcedResult?: Exclude<GameResult, null>) => void
  onRestart: () => void
  gameRunId: number
}

function GameScreen({
  playerName,
  gameIndex,
  totalGames,
  result,
  isFinished,
  onMarkGame,
  onNextStep,
  onRestart,
  gameRunId,
}: GameScreenProps) {
  const isLastGame = gameIndex + 1 === totalGames

  if (gameIndex === 0) {
    return (
      <GameLayout
        title="Игра 1. Узнай тайну Nestor Agent"
        description="Перед тобой картинка, разделенная на 9 частей. Нажимай по очереди на два блока — они поменяются местами. У тебя есть 30 секунд, чтобы собрать изображение целиком."
        result={result}
        isFinished={isFinished}
        onNextStep={onNextStep}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <PuzzleGame
          key={gameRunId}
          durationSeconds={30}
          onFinish={onMarkGame}
        />
      </GameLayout>
    )
  }

  if (gameIndex === 1) {
    return (
      <GameLayout
        title="Игра 2. Реакция на пост"
        description="Перед тобой пост в канале ~nestor-announcement. Поставь реакцию: только одна из них — «правильная», остальные приведут к провалу."
        result={result}
        isFinished={isFinished}
        onNextStep={onNextStep}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <ReactionGame key={gameRunId} onFinish={onMarkGame} />
      </GameLayout>
    )
  }

  if (gameIndex === 2) {
    return (
      <GameLayout
        title="Игра 3. Крафтинг конфигурации Nestor"
        description="У тебя есть набор кубиков — фичи Nestor. Собери такую конфигурацию, которая подойдёт для решения задачи: Создание алгоритма банковского скоринга."
        result={result}
        isFinished={isFinished}
        onNextStep={onNextStep}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <CraftingGame key={gameRunId} onFinish={onMarkGame} />
      </GameLayout>
    )
  }

  if (gameIndex === 3) {
    return (
      <GameLayout
        title="Игра 4. Что такое Nestor?"
        description="С одной стороны — продукты вселенной Nestor, с другой — твои повседневные инструменты. Выбери слева название сервиса Nestor, а потом кликни справа по связанному продукту, чтобы собрать все пары."
        result={result}
        isFinished={isFinished}
        onNextStep={onNextStep}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <MatchPairsGame key={gameRunId} onFinish={onMarkGame} />
      </GameLayout>
    )
  }

  if (gameIndex === 4) {
    return (
      <GameLayout
        title="Игра 5. Тапалка: процент кода"
        description="У тебя появилась возможность натапать свой процент сгенерированного кода."
        result={result}
        isFinished={isFinished}
        onNextStep={onNextStep}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <TapGame key={gameRunId} durationSeconds={8} onFinish={onMarkGame} />
      </GameLayout>
    )
  }

  if (gameIndex === 5) {
    return (
      <GameLayout
        title="Игра 6. PR Tinder"
        description="Оценивай diff-карточки с кодом за 60 секунд. Выбери: Approve, Request Changes, Security Risk, Need Tests или Unclear. Нужно успеть оценить 12+ карточек."
        result={result}
        isFinished={isFinished}
        onNextStep={onNextStep}
        isLastGame={isLastGame}
        onRestart={onRestart}
      >
        <PrTinderGame key={gameRunId} onFinish={onMarkGame} />
      </GameLayout>
    )
  }

  return (
    <GameLayout
      title={`Игра ${gameIndex + 1} из ${totalGames}`}
      description={`Шаблон новогодней мини‑игры про Nestor для игрока ${playerName}. Здесь потом появится реальный геймплей.`}
      result={result}
      isFinished={isFinished}
      onNextStep={onNextStep}
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
  results: GameResult[]
  onRestart: () => void
}

function SummaryScreen({ playerName, results, onRestart }: SummaryScreenProps) {
  const successCount = results.filter((r) => r === 'success').length
  const totalPlayed = results.length
  const [postcardText, setPostcardText] = useState<string | null>(null)

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
        return 'Почти идеально! Ты прошёл 5 из 6 игр. Остался последний рывок — и ты легенда Nestor! 🚀'
      default:
        return 'Если это не чит, то ты явно в команде Nestor. Или у тебя слишком хорошая память. Или слишком много свободного времени 😏'
    }
  }

  const handleGetPostcard = () => {
    if (POSTCARDS.length === 0) return
    const randomIndex = Math.floor(Math.random() * POSTCARDS.length)
    const template = POSTCARDS[randomIndex]
    setPostcardText(renderPostcard(template.text, playerName))
  }

  return (
    <div className="screen">
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
          >
            Получить открытку
          </button>
        )}
      </div>
    </div>
  )
}

export default App
