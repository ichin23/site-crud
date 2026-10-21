<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

interface CategoryItem {
  id: number
  nome: string
  cor: string
}

interface RecordItem {
  id: number
  nome: string
  descricao: string
  categoria_id: number | null
  ativo: boolean
}

interface CategoryPayload {
  nome: string
  cor: string
}

interface RecordPayload {
  nome: string
  descricao: string
  categoria_id: number | null
  ativo: boolean
}

interface EnrichedRecordItem extends RecordItem {
  categoryName: string
  categoryColor: string
  statusText: string
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

const categories = ref<CategoryItem[]>([])
const records = ref<RecordItem[]>([])

const isLoadingCategories = ref(false)
const isLoadingRecords = ref(false)
const isSubmittingCategory = ref(false)
const isSubmittingRecord = ref(false)
const deletingRecordId = ref<number | null>(null)
const pendingDeleteId = ref<number | null>(null)

const categoriesLoadError = ref('')
const recordsLoadError = ref('')

const feedbackBanner = reactive<{ type: 'success' | 'error' | ''; text: string }>({
  type: '',
  text: '',
})

const categoryForm = reactive({
  nome: '',
  cor: '#22c55e',
})

const categoryErrors = reactive({
  nome: '',
  cor: '',
})

const editingRecordId = ref<number | null>(null)

const recordForm = reactive({
  nome: '',
  descricao: '',
  categoria_id: '' as string | number,
  ativo: true,
})

const recordErrors = reactive({
  nome: '',
  descricao: '',
  categoria_id: '',
})

const isEditingRecord = computed(() => editingRecordId.value !== null)

const recordFormTitle = computed(() =>
  isEditingRecord.value ? `Editando Registro #${editingRecordId.value}` : 'Novo Registro',
)

const recordSubmitLabel = computed(() => {
  if (isSubmittingRecord.value) {
    return isEditingRecord.value ? 'Salvando alteração...' : 'Cadastrando registro...'
  }
  return isEditingRecord.value ? 'Salvar Alterações' : 'Cadastrar Registro'
})

const categorySubmitLabel = computed(() =>
  isSubmittingCategory.value ? 'Cadastrando...' : 'Adicionar Categoria',
)

const categoryMap = computed(() => {
  const map = new Map<number, CategoryItem>()
  for (const item of categories.value) {
    map.set(item.id, item)
  }
  return map
})

const totalCategoriesCount = computed(() => categories.value.length)
const totalRecordsCount = computed(() => records.value.length)
const activeRecordsCount = computed(() => records.value.filter((item) => item.ativo).length)

function getSafeHexColor(rawColor: string | undefined): string {
  if (rawColor && HEX_COLOR_PATTERN.test(rawColor)) {
    return rawColor
  }
  return '#22c55e'
}

const enrichedRecords = computed<EnrichedRecordItem[]>(() =>
  records.value.map((item) => {
    const matchedCategory =
      item.categoria_id !== null ? categoryMap.value.get(item.categoria_id) : undefined
    return {
      ...item,
      categoryName: matchedCategory ? matchedCategory.nome : 'Sem categoria',
      categoryColor: matchedCategory ? getSafeHexColor(matchedCategory.cor) : '#bbf7d0',
      statusText: item.ativo ? '[ATIVO]' : '[INATIVO]',
    }
  }),
)

function setFeedback(type: 'success' | 'error', text: string) {
  feedbackBanner.type = type
  feedbackBanner.text = text
}

function clearFeedback() {
  feedbackBanner.type = ''
  feedbackBanner.text = ''
}

function extractMessage(data: unknown, fallbackMessage: string): string {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof (data as { message: unknown }).message === 'string' &&
    (data as { message: string }).message.trim().length > 0
  ) {
    return (data as { message: string }).message
  }
  return fallbackMessage
}

async function requestApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T | null; message: string }> {
  let response: Response

  try {
    const headers = new Headers(options.headers)
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    response = await fetch(endpoint, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Falha de conexão com o servidor. Verifique sua rede e tente novamente.')
  }

  let parsedBody: unknown = null
  if (response.status !== 204) {
    const rawText = await response.text()
    if (rawText.trim().length > 0) {
      try {
        parsedBody = JSON.parse(rawText)
      } catch {
        if (!response.ok) {
          throw new Error(`Erro inesperado do servidor (HTTP ${response.status}).`)
        }
      }
    }
  }

  if (!response.ok) {
    const errorMessage = extractMessage(
      parsedBody,
      `Não foi possível concluir a operação (HTTP ${response.status}).`,
    )
    throw new Error(errorMessage)
  }

  const successMessage = extractMessage(parsedBody, '')
  return {
    data: parsedBody as T | null,
    message: successMessage,
  }
}

function clearCategoryErrors() {
  categoryErrors.nome = ''
  categoryErrors.cor = ''
}

function resetCategoryForm() {
  categoryForm.nome = ''
  categoryForm.cor = '#22c55e'
  clearCategoryErrors()
}

function validateCategoryForm(): boolean {
  clearCategoryErrors()
  let isValid = true

  const trimmedName = categoryForm.nome.trim()
  const trimmedColor = categoryForm.cor.trim()

  if (!trimmedName) {
    categoryErrors.nome = 'Informe o nome da categoria.'
    isValid = false
  } else if (trimmedName.length > 100) {
    categoryErrors.nome = 'O nome deve ter no máximo 100 caracteres.'
    isValid = false
  }

  if (!trimmedColor || !HEX_COLOR_PATTERN.test(trimmedColor)) {
    categoryErrors.cor = 'Informe uma cor hexadecimal válida (ex: #22C55E).'
    isValid = false
  }

  return isValid
}

function buildCategoryPayload(): CategoryPayload {
  return {
    nome: categoryForm.nome.trim(),
    cor: categoryForm.cor.trim(),
  }
}

function clearRecordErrors() {
  recordErrors.nome = ''
  recordErrors.descricao = ''
  recordErrors.categoria_id = ''
}

function resetRecordForm() {
  editingRecordId.value = null
  recordForm.nome = ''
  recordForm.descricao = ''
  recordForm.categoria_id = ''
  recordForm.ativo = true
  clearRecordErrors()
}

function validateRecordForm(): boolean {
  clearRecordErrors()
  let isValid = true

  const trimmedName = recordForm.nome.trim()
  const trimmedDescription = recordForm.descricao.trim()

  if (!trimmedName) {
    recordErrors.nome = 'O nome do registro é obrigatório.'
    isValid = false
  } else if (trimmedName.length > 100) {
    recordErrors.nome = 'O nome deve ter no máximo 100 caracteres.'
    isValid = false
  }

  if (!trimmedDescription) {
    recordErrors.descricao = 'A descrição do registro é obrigatória.'
    isValid = false
  }

  if (recordForm.categoria_id !== '' && recordForm.categoria_id !== null) {
    const parsedCategoryId = Number(recordForm.categoria_id)
    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      recordErrors.categoria_id = 'Selecione uma categoria válida.'
      isValid = false
    }
  }

  return isValid
}

function buildRecordPayload(): RecordPayload {
  const hasCategory = recordForm.categoria_id !== '' && recordForm.categoria_id !== null
  return {
    nome: recordForm.nome.trim(),
    descricao: recordForm.descricao.trim(),
    categoria_id: hasCategory ? Number(recordForm.categoria_id) : null,
    ativo: Boolean(recordForm.ativo),
  }
}

async function loadCategories(): Promise<boolean> {
  if (isLoadingCategories.value) return false
  isLoadingCategories.value = true
  categoriesLoadError.value = ''

  try {
    const { data } = await requestApi<CategoryItem[]>('/api/categorias')
    categories.value = Array.isArray(data) ? data : []
    return true
  } catch (err) {
    categoriesLoadError.value =
      err instanceof Error ? err.message : 'Não foi possível carregar as categorias.'
    return false
  } finally {
    isLoadingCategories.value = false
  }
}

async function loadRecords(): Promise<boolean> {
  if (isLoadingRecords.value) return false
  isLoadingRecords.value = true
  recordsLoadError.value = ''

  try {
    const { data } = await requestApi<RecordItem[]>('/api/registros')
    records.value = Array.isArray(data) ? data : []
    return true
  } catch (err) {
    recordsLoadError.value =
      err instanceof Error ? err.message : 'Não foi possível carregar os registros.'
    return false
  } finally {
    isLoadingRecords.value = false
  }
}

async function submitCategoryForm() {
  if (isSubmittingCategory.value) return
  clearFeedback()

  if (!validateCategoryForm()) {
    return
  }

  isSubmittingCategory.value = true
  const payload = buildCategoryPayload()

  try {
    const { message } = await requestApi<CategoryItem>('/api/categorias', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    resetCategoryForm()
    const refreshed = await loadCategories()
    const baseMessage = message || 'Categoria cadastrada com sucesso!'
    setFeedback(
      'success',
      refreshed
        ? baseMessage
        : `${baseMessage} (Não foi possível atualizar a lista automaticamente.)`,
    )
  } catch (err) {
    setFeedback(
      'error',
      err instanceof Error ? err.message : 'Erro ao cadastrar a categoria.',
    )
  } finally {
    isSubmittingCategory.value = false
  }
}

function startEditingRecord(record: RecordItem) {
  clearFeedback()
  clearRecordErrors()
  pendingDeleteId.value = null
  editingRecordId.value = record.id
  recordForm.nome = record.nome
  recordForm.descricao = record.descricao
  recordForm.categoria_id = record.categoria_id !== null ? record.categoria_id : ''
  recordForm.ativo = Boolean(record.ativo)
}

function cancelEditingRecord() {
  resetRecordForm()
}

async function submitRecordForm() {
  if (isSubmittingRecord.value) return
  clearFeedback()

  if (!validateRecordForm()) {
    return
  }

  isSubmittingRecord.value = true
  const payload = buildRecordPayload()
  const targetId = editingRecordId.value
  const isUpdate = targetId !== null

  try {
    const endpoint = isUpdate ? `/api/registros/${targetId}` : '/api/registros'
    const method = isUpdate ? 'PUT' : 'POST'

    const { message } = await requestApi(endpoint, {
      method,
      body: JSON.stringify(payload),
    })

    resetRecordForm()
    const refreshed = await loadRecords()
    const fallbackText = isUpdate
      ? 'Registro atualizado com sucesso!'
      : 'Registro criado com sucesso!'
    const baseMessage = message || fallbackText

    setFeedback(
      'success',
      refreshed
        ? baseMessage
        : `${baseMessage} (Não foi possível atualizar a lista automaticamente.)`,
    )
  } catch (err) {
    setFeedback(
      'error',
      err instanceof Error ? err.message : 'Erro ao salvar o registro.',
    )
  } finally {
    isSubmittingRecord.value = false
  }
}

function promptDeleteRecord(recordId: number) {
  clearFeedback()
  pendingDeleteId.value = recordId
}

function cancelDeleteRecord() {
  pendingDeleteId.value = null
}

async function confirmDeleteRecord(recordId: number) {
  if (deletingRecordId.value !== null) return
  clearFeedback()
  deletingRecordId.value = recordId

  try {
    const { message } = await requestApi(`/api/registros/${recordId}`, {
      method: 'DELETE',
    })

    if (editingRecordId.value === recordId) {
      resetRecordForm()
    }
    pendingDeleteId.value = null

    const refreshed = await loadRecords()
    const baseMessage = message || 'Registro excluído com sucesso!'
    setFeedback(
      'success',
      refreshed
        ? baseMessage
        : `${baseMessage} (Não foi possível atualizar a lista automaticamente.)`,
    )
  } catch (err) {
    setFeedback(
      'error',
      err instanceof Error ? err.message : 'Erro ao excluir o registro.',
    )
  } finally {
    deletingRecordId.value = null
  }
}

onMounted(() => {
  loadCategories()
  loadRecords()
})
</script>

<template>
  <div class="app-shell">
    <header class="hero-header">
      <div class="hero-brand">
        <span class="hero-tag">Sistema NeoBrutalista // Verde</span>
        <h1 class="hero-title">Painel de Categorias &amp; Registros</h1>
        <p class="hero-subtitle">
          Catalogação estruturada de itens, classificações cromáticas e controle de status.
        </p>
      </div>

      <div class="stats-strip" aria-label="Resumo do acervo">
        <div class="stat-pill">
          <span class="stat-label">Categorias</span>
          <span class="stat-value">{{ totalCategoriesCount }}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Registros</span>
          <span class="stat-value">{{ totalRecordsCount }}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Ativos</span>
          <span class="stat-value">{{ activeRecordsCount }}</span>
        </div>
      </div>
    </header>

    <div
      v-if="feedbackBanner.text"
      class="feedback-banner"
      :class="
        feedbackBanner.type === 'error'
          ? 'feedback-banner--error'
          : 'feedback-banner--success'
      "
      :role="feedbackBanner.type === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <div class="feedback-content">
        <span class="feedback-badge">
          {{ feedbackBanner.type === 'error' ? 'Erro' : 'Sucesso' }}
        </span>
        <span>{{ feedbackBanner.text }}</span>
      </div>
      <button
        type="button"
        class="brutal-btn brutal-btn--secondary brutal-btn--small"
        @click="clearFeedback"
      >
        Fechar [X]
      </button>
    </div>

    <main class="workspace-grid">
      <!-- Coluna Lateral: Categorias -->
      <aside class="column-stack" aria-label="Gestão de Categorias">
        <section class="brutal-card" aria-labelledby="category-form-heading">
          <div class="card-header">
            <h2 id="category-form-heading" class="card-title">Nova Categoria</h2>
          </div>
          <div class="card-body">
            <form class="brutal-form" novalidate @submit.prevent="submitCategoryForm">
              <div class="field-group">
                <label class="field-label" for="category-name-input">
                  <span>Nome da Categoria *</span>
                  <span class="field-counter">{{ categoryForm.nome.length }}/100</span>
                </label>
                <input
                  id="category-name-input"
                  v-model="categoryForm.nome"
                  type="text"
                  maxlength="100"
                  placeholder="Ex: Botânica, Infraestrutura, Projetos..."
                  class="field-input"
                  :class="{ 'field-input--invalid': Boolean(categoryErrors.nome) }"
                  :aria-invalid="Boolean(categoryErrors.nome)"
                  aria-describedby="category-name-error"
                />
                <p
                  v-if="categoryErrors.nome"
                  id="category-name-error"
                  class="field-error"
                  role="alert"
                >
                  [!] {{ categoryErrors.nome }}
                </p>
              </div>

              <div class="field-group">
                <label class="field-label" for="category-color-text">
                  <span>Cor de Identificação (#HEX) *</span>
                </label>
                <div class="color-input-wrapper">
                  <input
                    id="category-color-picker"
                    v-model="categoryForm.cor"
                    type="color"
                    class="color-picker-native"
                    aria-label="Seletor visual de cor da categoria"
                  />
                  <input
                    id="category-color-text"
                    v-model="categoryForm.cor"
                    type="text"
                    maxlength="7"
                    placeholder="#22c55e"
                    class="field-input"
                    :class="{ 'field-input--invalid': Boolean(categoryErrors.cor) }"
                    :aria-invalid="Boolean(categoryErrors.cor)"
                    aria-describedby="category-color-error"
                  />
                </div>
                <p
                  v-if="categoryErrors.cor"
                  id="category-color-error"
                  class="field-error"
                  role="alert"
                >
                  [!] {{ categoryErrors.cor }}
                </p>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="brutal-btn brutal-btn--primary"
                  :disabled="isSubmittingCategory"
                >
                  {{ categorySubmitLabel }}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section class="brutal-card" aria-labelledby="category-list-heading">
          <div class="card-header">
            <h2 id="category-list-heading" class="card-title">Categorias Cadastradas</h2>
            <button
              type="button"
              class="brutal-btn brutal-btn--secondary brutal-btn--small"
              :disabled="isLoadingCategories"
              @click="loadCategories"
            >
              {{ isLoadingCategories ? 'Atualizando...' : 'Recarregar' }}
            </button>
          </div>

          <div class="card-body">
            <div v-if="isLoadingCategories" class="state-box" role="status" aria-live="polite">
              <p class="state-title">Carregando categorias...</p>
              <p class="state-text">Buscando dados atualizados do servidor.</p>
            </div>

            <div
              v-else-if="categoriesLoadError"
              class="state-box state-box--error"
              role="alert"
            >
              <p class="state-title">Falha ao carregar categorias</p>
              <p class="state-text">{{ categoriesLoadError }}</p>
              <button
                type="button"
                class="brutal-btn brutal-btn--secondary brutal-btn--small"
                @click="loadCategories"
              >
                Tentar Novamente
              </button>
            </div>

            <div v-else-if="categories.length === 0" class="state-box">
              <p class="state-title">Nenhuma categoria cadastrada</p>
              <p class="state-text">
                Use o formulário acima para criar a primeira categoria do sistema.
              </p>
            </div>

            <ul v-else class="category-list">
              <li
                v-for="category in categories"
                :key="category.id"
                class="category-item"
              >
                <div class="category-identity">
                  <span
                    class="category-swatch"
                    :style="{ backgroundColor: getSafeHexColor(category.cor) }"
                    aria-hidden="true"
                  ></span>
                  <span class="category-name">{{ category.nome }}</span>
                </div>
                <span class="category-code">{{ category.cor }}</span>
              </li>
            </ul>
          </div>
        </section>
      </aside>

      <!-- Coluna Principal: Registros -->
      <div class="column-stack">
        <section class="brutal-card" aria-labelledby="record-form-heading">
          <div
            class="card-header"
            :class="{ 'card-header--editing': isEditingRecord }"
          >
            <h2 id="record-form-heading" class="card-title">{{ recordFormTitle }}</h2>
            <span v-if="isEditingRecord" class="status-badge status-badge--active">
              Modo Edição
            </span>
          </div>

          <div class="card-body">
            <form class="brutal-form" novalidate @submit.prevent="submitRecordForm">
              <div class="form-row-split">
                <div class="field-group">
                  <label class="field-label" for="record-name-input">
                    <span>Nome do Registro *</span>
                    <span class="field-counter">{{ recordForm.nome.length }}/100</span>
                  </label>
                  <input
                    id="record-name-input"
                    v-model="recordForm.nome"
                    type="text"
                    maxlength="100"
                    placeholder="Digite o título do registro..."
                    class="field-input"
                    :class="{ 'field-input--invalid': Boolean(recordErrors.nome) }"
                    :aria-invalid="Boolean(recordErrors.nome)"
                    aria-describedby="record-name-error"
                  />
                  <p
                    v-if="recordErrors.nome"
                    id="record-name-error"
                    class="field-error"
                    role="alert"
                  >
                    [!] {{ recordErrors.nome }}
                  </p>
                </div>

                <div class="field-group">
                  <label class="field-label" for="record-category-select">
                    <span>Categoria Vinculada</span>
                  </label>
                  <select
                    id="record-category-select"
                    v-model="recordForm.categoria_id"
                    class="field-select"
                    :class="{ 'field-select--invalid': Boolean(recordErrors.categoria_id) }"
                    :aria-invalid="Boolean(recordErrors.categoria_id)"
                    aria-describedby="record-category-error"
                  >
                    <option value="">Sem categoria atribuída</option>
                    <option
                      v-for="category in categories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ category.nome }} ({{ category.cor }})
                    </option>
                  </select>
                  <p
                    v-if="recordErrors.categoria_id"
                    id="record-category-error"
                    class="field-error"
                    role="alert"
                  >
                    [!] {{ recordErrors.categoria_id }}
                  </p>
                </div>
              </div>

              <div class="field-group">
                <label class="field-label" for="record-description-input">
                  <span>Descrição Detalhada *</span>
                </label>
                <textarea
                  id="record-description-input"
                  v-model="recordForm.descricao"
                  rows="3"
                  placeholder="Descreva as especificações e observações deste registro..."
                  class="field-textarea"
                  :class="{ 'field-textarea--invalid': Boolean(recordErrors.descricao) }"
                  :aria-invalid="Boolean(recordErrors.descricao)"
                  aria-describedby="record-description-error"
                ></textarea>
                <p
                  v-if="recordErrors.descricao"
                  id="record-description-error"
                  class="field-error"
                  role="alert"
                >
                  [!] {{ recordErrors.descricao }}
                </p>
              </div>

              <div class="field-group">
                <label class="checkbox-card" for="record-active-checkbox">
                  <input
                    id="record-active-checkbox"
                    v-model="recordForm.ativo"
                    type="checkbox"
                    class="checkbox-input"
                  />
                  <span>
                    Registro ativo ({{ recordForm.ativo ? 'Visível / Operacional' : 'Arquivado / Inativo' }})
                  </span>
                </label>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="brutal-btn brutal-btn--primary"
                  :disabled="isSubmittingRecord"
                >
                  {{ recordSubmitLabel }}
                </button>

                <button
                  v-if="isEditingRecord"
                  type="button"
                  class="brutal-btn brutal-btn--secondary"
                  :disabled="isSubmittingRecord"
                  @click="cancelEditingRecord"
                >
                  Cancelar Edição
                </button>
              </div>
            </form>
          </div>
        </section>

        <section class="brutal-card" aria-labelledby="record-list-heading">
          <div class="card-header">
            <h2 id="record-list-heading" class="card-title">Registros Cadastrados</h2>
            <button
              type="button"
              class="brutal-btn brutal-btn--secondary brutal-btn--small"
              :disabled="isLoadingRecords"
              @click="loadRecords"
            >
              {{ isLoadingRecords ? 'Atualizando...' : 'Recarregar Lista' }}
            </button>
          </div>

          <div class="card-body">
            <div v-if="isLoadingRecords" class="state-box" role="status" aria-live="polite">
              <p class="state-title">Carregando registros...</p>
              <p class="state-text">Sincronizando registros com o banco de dados.</p>
            </div>

            <div
              v-else-if="recordsLoadError"
              class="state-box state-box--error"
              role="alert"
            >
              <p class="state-title">Erro ao carregar registros</p>
              <p class="state-text">{{ recordsLoadError }}</p>
              <button
                type="button"
                class="brutal-btn brutal-btn--secondary brutal-btn--small"
                @click="loadRecords"
              >
                Tentar Novamente
              </button>
            </div>

            <div v-else-if="enrichedRecords.length === 0" class="state-box">
              <p class="state-title">Nenhum registro encontrado</p>
              <p class="state-text">
                Cadastre seu primeiro registro no formulário acima para começar.
              </p>
            </div>

            <ul v-else class="records-grid">
              <li
                v-for="record in enrichedRecords"
                :key="record.id"
                class="record-card"
                :class="{
                  'record-card--inactive': !record.ativo,
                  'record-card--editing': editingRecordId === record.id,
                }"
              >
                <div class="record-top">
                  <h3 class="record-title">{{ record.nome }}</h3>
                  <div class="record-badges">
                    <span class="category-badge">
                      <span
                        class="category-badge-dot"
                        :style="{ backgroundColor: record.categoryColor }"
                        aria-hidden="true"
                      ></span>
                      <span>Categoria: {{ record.categoryName }}</span>
                    </span>

                    <span
                      class="status-badge"
                      :class="
                        record.ativo
                          ? 'status-badge--active'
                          : 'status-badge--inactive'
                      "
                    >
                      {{ record.statusText }}
                    </span>
                  </div>
                </div>

                <p class="record-description">{{ record.descricao }}</p>

                <div class="record-footer">
                  <div v-if="pendingDeleteId === record.id" class="confirm-bar" role="alert">
                    <span>Confirmar exclusão permanente de "{{ record.nome }}"?</span>
                    <div class="record-actions">
                      <button
                        type="button"
                        class="brutal-btn brutal-btn--danger brutal-btn--small"
                        :disabled="deletingRecordId === record.id"
                        @click="confirmDeleteRecord(record.id)"
                      >
                        {{
                          deletingRecordId === record.id
                            ? 'Excluindo...'
                            : 'Sim, Excluir'
                        }}
                      </button>
                      <button
                        type="button"
                        class="brutal-btn brutal-btn--secondary brutal-btn--small"
                        :disabled="deletingRecordId === record.id"
                        @click="cancelDeleteRecord"
                      >
                        Não, Manter
                      </button>
                    </div>
                  </div>

                  <template v-else>
                    <span class="stat-label">ID #{{ record.id }}</span>
                    <div class="record-actions">
                      <button
                        type="button"
                        class="brutal-btn brutal-btn--warning brutal-btn--small"
                        :disabled="
                          isSubmittingRecord || deletingRecordId === record.id
                        "
                        @click="startEditingRecord(record)"
                      >
                        {{
                          editingRecordId === record.id
                            ? 'Em Edição'
                            : 'Editar'
                        }}
                      </button>
                      <button
                        type="button"
                        class="brutal-btn brutal-btn--danger brutal-btn--small"
                        :disabled="
                          isSubmittingRecord || deletingRecordId === record.id
                        "
                        @click="promptDeleteRecord(record.id)"
                      >
                        Excluir
                      </button>
                    </div>
                  </template>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
