import { useState } from 'react'

export type CraftingGameResult = 'success' | 'fail'

export type CraftingGameProps = {
  onFinish: (result: CraftingGameResult) => void
}

type CubeId =
  | 'internal-model'
  | 'external-model'
  | 'cursor'
  | 'chat'
  | 'agent'
  | 'tools'
  | 'in-editor'

type Cube = {
  id: CubeId
  title: string
  subtitle: string
}

const CUBES: Cube[] = [
  {
    id: 'internal-model',
    title: 'Внутренняя модель',
    subtitle: 'Модель внутри контура',
  },
  {
    id: 'external-model',
    title: 'Внешняя модель',
    subtitle: 'SOTA модели',
  },
  {
    id: 'cursor',
    title: 'Cursor',
    subtitle: 'AI Based IDE',
  },
  {
    id: 'chat',
    title: 'Чат',
    subtitle: 'Чат с Nestor',
  },
  {
    id: 'agent',
    title: 'Агент',
    subtitle: 'Nestor Agent',
  },
  {
    id: 'tools',
    title: 'MCP',
    subtitle: 'MCP tools: jira, gitlab, ...',
  },
  {
    id: 'in-editor',
    title: 'Inline Edit',
    subtitle: 'Nestor Inine Edit',
  },
]

function CraftingGame({ onFinish }: CraftingGameProps) {
  const [selectedIds, setSelectedIds] = useState<CubeId[]>([])
  const [status, setStatus] = useState<CraftingGameResult | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const isAgentSelected = selectedIds.includes('agent')
  const hasCursorSelected = selectedIds.includes('cursor')
  const hasExternalSelected = selectedIds.includes('external-model')
  const hasChatSelected = selectedIds.includes('chat')
  const hasInternalSelected = selectedIds.includes('internal-model')
  const hasMcpSelected = selectedIds.includes('tools')

  const toggleCube = (id: CubeId) => {
    if (status !== null) return

    if (id === 'external-model' && isAgentSelected) {
      // Правило: с агентом внешняя модель недоступна
      return
    }

    if (id === 'agent' && hasExternalSelected) {
      // При выборе агента, если уже выбрана внешняя модель —
      // снимаем внешнюю модель и выбираем агента
      setSelectedIds((prev) => {
        const withoutExternal = prev.filter((x) => x !== 'external-model')
        if (!withoutExternal.includes('agent')) {
          return [...withoutExternal, 'agent']
        }
        return withoutExternal
      })
      return
    }

    // Максимум 3 выбранных кубика
    if (!selectedIds.includes(id) && selectedIds.length >= 3) {
      return
    }

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleCraft = () => {
    if (status !== null) return
    if (selectedIds.length === 0) return

    const selectedSet = new Set(selectedIds)

    let result: CraftingGameResult = 'fail'
    let message = ''

    // 1. Если выбран Cursor — всегда неверно
    if (hasCursorSelected) {
      message = 'Упс, тебе жёлтая карточка за Cursor :)'
    }
    // 2. Если выбрана внешняя модель — всегда неверно
    else if (hasExternalSelected) {
      message =
        'Завтра весь двор узнает как мы тут работаем. Упс, тебе жёлтая карточка :)'
    }
    // 3. Только in-editor
    else if (
      selectedSet.size === 1 &&
      selectedSet.has('in-editor')
    ) {
      message =
        'Не устанешь редактировать так весь файл? ;)'
    }
    // 4. Есть чат, но нет агента
    else if (hasChatSelected && !isAgentSelected) {
      message =
        'Один чат без агента не превратит Nestor в автономного исполнителя — не хватает логики агента.'
    }
    // 5. Есть агент, но нет внутренней модели
    else if (isAgentSelected && !hasInternalSelected) {
      message =
        'Агент без модели — это оболочка без мозга. Нужна внутренняя модель для безопасного скоринга.'
    }
    // 6. Есть агент, но нет MCP
    else if (isAgentSelected && !hasMcpSelected) {
      message =
        'А как же MCP хайп?'
    }
    // 7. Агент + внутренняя модель + MCP — верно
    else if (
      selectedSet.size === 3 &&
      isAgentSelected &&
      hasInternalSelected &&
      hasMcpSelected
    ) {
      result = 'success'
      message =
        'Отлично! Агент, внутренняя модель и MCP — это правильная конфигурация Nestor под банковский скоринг.'
    } else {
      // Любая другая комбинация — неверно
      message =
        '<Тут текст для всех остальных комбинаций>'
    }

    setStatus(result)
    setFeedback(message)
    onFinish(result)
  }

  const hasExternalDisabled = isAgentSelected

  return (
    <div className="crafting-root">
      <div className="crafting-layout">
        <section className="crafting-grid-section">
          <p className="crafting-hint">
            Представь, что нужно собрать конфигурацию Nestor под
            задачу банковского скоринга. Кликни по кубикам, чтобы добавить их в сборку.
          </p>

          <div className="crafting-grid">
            {CUBES.map((cube) => {
              const isSelected = selectedIds.includes(cube.id)
              const isExternal = cube.id === 'external-model'
              const isDisabled = status !== null || (isExternal && hasExternalDisabled)

              return (
                <button
                  key={cube.id}
                  type="button"
                  className={[
                    'crafting-cube',
                    isSelected ? 'crafting-cube-selected' : '',
                    isDisabled ? 'crafting-cube-disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => toggleCube(cube.id)}
                  disabled={isDisabled}
                >
                  <span className="crafting-cube-title">{cube.title}</span>
                  <span className="crafting-cube-subtitle">{cube.subtitle}</span>
                  {cube.id === 'agent' && (
                    <span className="crafting-cube-badge">Агент</span>
                  )}
                  {cube.id === 'external-model' && hasExternalDisabled && (
                    <span className="crafting-cube-lock">Недоступно с агентом</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <section className="crafting-summary-section">
          <div className="crafting-summary-card">
            <h3 className="crafting-summary-title">Текущая сборка Nestor</h3>
            {selectedIds.length === 0 ? (
              <p className="crafting-summary-empty">
                Пока ни одного кубика — выбери хотя бы пару компонентов.
              </p>
            ) : (
              <ul className="crafting-summary-list">
                {selectedIds.map((id) => {
                  const cube = CUBES.find((x) => x.id === id)
                  if (!cube) return null
                  return (
                    <li key={cube.id} className="crafting-summary-item">
                      <span className="crafting-summary-dot" />
                      <span className="crafting-summary-text">{cube.title}</span>
                    </li>
                  )
                })}
              </ul>
            )}

            <button
              type="button"
              className="btn secondary crafting-action-button"
              onClick={handleCraft}
              disabled={status !== null || selectedIds.length === 0}
            >
              Собрать конфигурацию
            </button>

            {hasExternalDisabled && (
              <p className="crafting-note">
                При выборе агента внешняя модель для этой задачи недоступна —
                он работает только с внутренней моделью.
              </p>
            )}
          </div>

          {status === null && (
            <p className="crafting-helper">
              Подумай, что обязательно нужно, чтобы Nestor сам решал задачу
              безопасно и предсказуемо.
            </p>
          )}
          {status !== null && feedback && (
            <p
              className={[
                'crafting-helper',
                status === 'success'
                  ? 'crafting-helper-success'
                  : 'crafting-helper-fail',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {feedback}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default CraftingGame

