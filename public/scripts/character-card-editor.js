const TAB_META = 'meta';
const TAB_ENTRIES = 'entries';
const TAB_REGEX = 'regex';

const REGEX_PLACEMENTS = [
    { value: 1, label: 'USER_INPUT' },
    { value: 2, label: 'AI_OUTPUT' },
    { value: 3, label: 'SLASH_COMMAND' },
    { value: 5, label: 'WORLD_INFO' },
    { value: 6, label: 'REASONING' },
];

const state = {
    activeTab: TAB_META,
    card: null,
    fileName: '',
    fileSize: 0,
    originalSnapshot: null,
    dirty: false,
    entriesSelection: 0,
    regexSelection: 0,
    filters: {
        entries: {
            search: '',
            filterOne: 'all',
            filterTwo: 'all',
            sort: 'display_index',
        },
        regex: {
            search: '',
            filterOne: 'all',
            filterTwo: 'all',
            sort: 'name',
        },
    },
};

const refs = {};

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) {
        return;
    }

    event.preventDefault();
    event.returnValue = '';
});

function init() {
    bindRefs();
    bindEvents();
    updateTopActions();
    render();
}

function bindRefs() {
    refs.fileInput = document.getElementById('fileInput');
    refs.reloadButton = document.getElementById('reloadButton');
    refs.exportButton = document.getElementById('exportButton');
    refs.fileBadge = document.getElementById('fileBadge');
    refs.dirtyBadge = document.getElementById('dirtyBadge');
    refs.tabSummary = document.getElementById('tabSummary');
    refs.messageBanner = document.getElementById('messageBanner');
    refs.cardNameStat = document.getElementById('cardNameStat');
    refs.cardSpecStat = document.getElementById('cardSpecStat');
    refs.entryCountStat = document.getElementById('entryCountStat');
    refs.entryMetaStat = document.getElementById('entryMetaStat');
    refs.regexCountStat = document.getElementById('regexCountStat');
    refs.regexMetaStat = document.getElementById('regexMetaStat');
    refs.fileNameStat = document.getElementById('fileNameStat');
    refs.fileSizeStat = document.getElementById('fileSizeStat');

    refs.tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    refs.metaSidebar = document.getElementById('metaSidebar');
    refs.listSidebar = document.getElementById('listSidebar');
    refs.listSearch = document.getElementById('listSearch');
    refs.listFilterOne = document.getElementById('listFilterOne');
    refs.listFilterTwo = document.getElementById('listFilterTwo');
    refs.listSort = document.getElementById('listSort');
    refs.filterOneLabel = document.getElementById('filterOneLabel');
    refs.filterTwoLabel = document.getElementById('filterTwoLabel');
    refs.addItemButton = document.getElementById('addItemButton');
    refs.duplicateItemButton = document.getElementById('duplicateItemButton');
    refs.deleteItemButton = document.getElementById('deleteItemButton');
    refs.listCount = document.getElementById('listCount');
    refs.itemList = document.getElementById('itemList');

    refs.emptyState = document.getElementById('emptyState');
    refs.metaForm = document.getElementById('metaForm');
    refs.entryForm = document.getElementById('entryForm');
    refs.regexForm = document.getElementById('regexForm');

    refs.metaName = document.getElementById('metaName');
    refs.metaTags = document.getElementById('metaTags');
    refs.metaDescription = document.getElementById('metaDescription');
    refs.metaPersonality = document.getElementById('metaPersonality');
    refs.metaScenario = document.getElementById('metaScenario');
    refs.metaFirstMessage = document.getElementById('metaFirstMessage');
    refs.metaMessageExample = document.getElementById('metaMessageExample');
    refs.metaSystemPrompt = document.getElementById('metaSystemPrompt');
    refs.metaPostHistoryInstructions = document.getElementById('metaPostHistoryInstructions');
    refs.metaCreatorNotes = document.getElementById('metaCreatorNotes');

    refs.entryIdentity = document.getElementById('entryIdentity');
    refs.entryHeading = document.getElementById('entryHeading');
    refs.entryId = document.getElementById('entryId');
    refs.entryComment = document.getElementById('entryComment');
    refs.entryPosition = document.getElementById('entryPosition');
    refs.entryInsertionOrder = document.getElementById('entryInsertionOrder');
    refs.entryDisplayIndex = document.getElementById('entryDisplayIndex');
    refs.entryDepth = document.getElementById('entryDepth');
    refs.entryEnabled = document.getElementById('entryEnabled');
    refs.entryConstant = document.getElementById('entryConstant');
    refs.entrySelective = document.getElementById('entrySelective');
    refs.entryUseRegex = document.getElementById('entryUseRegex');
    refs.entryKeys = document.getElementById('entryKeys');
    refs.entrySecondaryKeys = document.getElementById('entrySecondaryKeys');
    refs.entryContent = document.getElementById('entryContent');
    refs.entryProbability = document.getElementById('entryProbability');
    refs.entryGroup = document.getElementById('entryGroup');
    refs.entryOutletName = document.getElementById('entryOutletName');
    refs.entryRole = document.getElementById('entryRole');
    refs.entryAutomationId = document.getElementById('entryAutomationId');
    refs.entryScanDepth = document.getElementById('entryScanDepth');
    refs.entryUseProbability = document.getElementById('entryUseProbability');
    refs.entryVectorized = document.getElementById('entryVectorized');
    refs.entryExcludeRecursion = document.getElementById('entryExcludeRecursion');
    refs.entryPreventRecursion = document.getElementById('entryPreventRecursion');
    refs.entryIgnoreBudget = document.getElementById('entryIgnoreBudget');
    refs.entryRawJson = document.getElementById('entryRawJson');
    refs.entryResetRawButton = document.getElementById('entryResetRawButton');
    refs.entryApplyRawButton = document.getElementById('entryApplyRawButton');

    refs.regexIdentity = document.getElementById('regexIdentity');
    refs.regexHeading = document.getElementById('regexHeading');
    refs.regexId = document.getElementById('regexId');
    refs.regexName = document.getElementById('regexName');
    refs.regexSubstituteMode = document.getElementById('regexSubstituteMode');
    refs.regexMinDepth = document.getElementById('regexMinDepth');
    refs.regexMaxDepth = document.getElementById('regexMaxDepth');
    refs.regexTrimStrings = document.getElementById('regexTrimStrings');
    refs.regexDisabled = document.getElementById('regexDisabled');
    refs.regexRunOnEdit = document.getElementById('regexRunOnEdit');
    refs.regexMarkdownOnly = document.getElementById('regexMarkdownOnly');
    refs.regexPromptOnly = document.getElementById('regexPromptOnly');
    refs.regexPlacementCheckboxes = Array.from(document.querySelectorAll('.regex-placement'));
    refs.regexFindRegex = document.getElementById('regexFindRegex');
    refs.regexReplaceString = document.getElementById('regexReplaceString');
    refs.regexRawJson = document.getElementById('regexRawJson');
    refs.regexResetRawButton = document.getElementById('regexResetRawButton');
    refs.regexApplyRawButton = document.getElementById('regexApplyRawButton');
}

function bindEvents() {
    refs.fileInput.addEventListener('change', handleFileInput);
    refs.reloadButton.addEventListener('click', restoreOriginalSnapshot);
    refs.exportButton.addEventListener('click', exportCard);

    refs.tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            state.activeTab = button.dataset.tab;
            showBanner('');
            render();
        });
    });

    refs.listSearch.addEventListener('input', () => {
        currentFilters().search = refs.listSearch.value;
        renderList();
    });
    refs.listFilterOne.addEventListener('change', () => {
        currentFilters().filterOne = refs.listFilterOne.value;
        renderList();
    });
    refs.listFilterTwo.addEventListener('change', () => {
        currentFilters().filterTwo = refs.listFilterTwo.value;
        renderList();
    });
    refs.listSort.addEventListener('change', () => {
        currentFilters().sort = refs.listSort.value;
        renderList();
    });

    refs.addItemButton.addEventListener('click', addCurrentTabItem);
    refs.duplicateItemButton.addEventListener('click', duplicateCurrentTabItem);
    refs.deleteItemButton.addEventListener('click', deleteCurrentTabItem);

    bindMetaEvents();
    bindEntryEvents();
    bindRegexEvents();
}

function bindMetaEvents() {
    refs.metaName.addEventListener('input', () => setMirroredField('name', refs.metaName.value));
    refs.metaTags.addEventListener('input', () => setMirroredField('tags', parseCommaSeparated(refs.metaTags.value)));
    refs.metaDescription.addEventListener('input', () => setMirroredField('description', refs.metaDescription.value));
    refs.metaPersonality.addEventListener('input', () => setMirroredField('personality', refs.metaPersonality.value));
    refs.metaScenario.addEventListener('input', () => setMirroredField('scenario', refs.metaScenario.value));
    refs.metaFirstMessage.addEventListener('input', () => setMirroredField('first_mes', refs.metaFirstMessage.value));
    refs.metaMessageExample.addEventListener('input', () => setMirroredField('mes_example', refs.metaMessageExample.value));
    refs.metaSystemPrompt.addEventListener('input', () => setDataField('system_prompt', refs.metaSystemPrompt.value));
    refs.metaPostHistoryInstructions.addEventListener('input', () => setDataField('post_history_instructions', refs.metaPostHistoryInstructions.value));
    refs.metaCreatorNotes.addEventListener('input', () => {
        setDataField('creator_notes', refs.metaCreatorNotes.value);
        state.card.creatorcomment = refs.metaCreatorNotes.value;
        markDirtyAndRefresh();
    });
}

function bindEntryEvents() {
    refs.entryComment.addEventListener('input', () => updateEntryField('comment', refs.entryComment.value));
    refs.entryPosition.addEventListener('change', () => {
        const entry = getSelectedEntry();
        if (!entry) {
            return;
        }

        entry.position = refs.entryPosition.value;
        entry.extensions.position = entry.position === 'before_char' ? 0 : 1;
        markDirty();
        renderList();
        updateOverview();
        refs.entryRawJson.value = JSON.stringify(entry, null, 4);
    });
    refs.entryInsertionOrder.addEventListener('input', () => updateEntryField('insertion_order', parseNumber(refs.entryInsertionOrder.value, 100)));
    refs.entryDisplayIndex.addEventListener('input', () => updateEntryExtensionField('display_index', parseNumber(refs.entryDisplayIndex.value, getSelectedEntry()?.id ?? 0)));
    refs.entryDepth.addEventListener('input', () => updateEntryExtensionField('depth', parseNumber(refs.entryDepth.value, 4)));
    refs.entryEnabled.addEventListener('change', () => updateEntryField('enabled', refs.entryEnabled.checked));
    refs.entryConstant.addEventListener('change', () => updateEntryField('constant', refs.entryConstant.checked));
    refs.entrySelective.addEventListener('change', () => updateEntryField('selective', refs.entrySelective.checked));
    refs.entryUseRegex.addEventListener('change', () => updateEntryField('use_regex', refs.entryUseRegex.checked));
    refs.entryKeys.addEventListener('input', () => updateEntryField('keys', parseListArea(refs.entryKeys.value)));
    refs.entrySecondaryKeys.addEventListener('input', () => updateEntryField('secondary_keys', parseListArea(refs.entrySecondaryKeys.value)));
    refs.entryContent.addEventListener('input', () => updateEntryField('content', refs.entryContent.value));
    refs.entryProbability.addEventListener('input', () => updateEntryExtensionField('probability', clamp(parseNumber(refs.entryProbability.value, 100), 0, 100)));
    refs.entryGroup.addEventListener('input', () => updateEntryExtensionField('group', refs.entryGroup.value));
    refs.entryOutletName.addEventListener('input', () => updateEntryExtensionField('outlet_name', refs.entryOutletName.value));
    refs.entryRole.addEventListener('change', () => updateEntryExtensionField('role', parseNumber(refs.entryRole.value, 0)));
    refs.entryAutomationId.addEventListener('input', () => updateEntryExtensionField('automation_id', refs.entryAutomationId.value));
    refs.entryScanDepth.addEventListener('input', () => updateEntryExtensionField('scan_depth', parseNullableNumber(refs.entryScanDepth.value)));
    refs.entryUseProbability.addEventListener('change', () => updateEntryExtensionField('useProbability', refs.entryUseProbability.checked));
    refs.entryVectorized.addEventListener('change', () => updateEntryExtensionField('vectorized', refs.entryVectorized.checked));
    refs.entryExcludeRecursion.addEventListener('change', () => updateEntryExtensionField('exclude_recursion', refs.entryExcludeRecursion.checked));
    refs.entryPreventRecursion.addEventListener('change', () => updateEntryExtensionField('prevent_recursion', refs.entryPreventRecursion.checked));
    refs.entryIgnoreBudget.addEventListener('change', () => updateEntryExtensionField('ignore_budget', refs.entryIgnoreBudget.checked));
    refs.entryResetRawButton.addEventListener('click', populateEntryForm);
    refs.entryApplyRawButton.addEventListener('click', applyRawEntryJson);
}

function bindRegexEvents() {
    refs.regexName.addEventListener('input', () => updateRegexField('scriptName', refs.regexName.value));
    refs.regexSubstituteMode.addEventListener('change', () => updateRegexField('substituteRegex', parseNumber(refs.regexSubstituteMode.value, 0)));
    refs.regexMinDepth.addEventListener('input', () => updateRegexField('minDepth', parseNullableNumber(refs.regexMinDepth.value)));
    refs.regexMaxDepth.addEventListener('input', () => updateRegexField('maxDepth', parseNullableNumber(refs.regexMaxDepth.value)));
    refs.regexTrimStrings.addEventListener('input', () => updateRegexField('trimStrings', parseTrimStrings(refs.regexTrimStrings.value)));
    refs.regexDisabled.addEventListener('change', () => updateRegexField('disabled', refs.regexDisabled.checked));
    refs.regexRunOnEdit.addEventListener('change', () => updateRegexField('runOnEdit', refs.regexRunOnEdit.checked));
    refs.regexMarkdownOnly.addEventListener('change', () => updateRegexField('markdownOnly', refs.regexMarkdownOnly.checked));
    refs.regexPromptOnly.addEventListener('change', () => updateRegexField('promptOnly', refs.regexPromptOnly.checked));
    refs.regexPlacementCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const script = getSelectedRegex();
            if (!script) {
                return;
            }

            script.placement = refs.regexPlacementCheckboxes
                .filter((item) => item.checked)
                .map((item) => Number(item.value))
                .sort((a, b) => a - b);
            markDirty();
            renderList();
            updateOverview();
            refs.regexRawJson.value = JSON.stringify(script, null, 4);
        });
    });
    refs.regexFindRegex.addEventListener('input', () => updateRegexField('findRegex', refs.regexFindRegex.value));
    refs.regexReplaceString.addEventListener('input', () => updateRegexField('replaceString', refs.regexReplaceString.value));
    refs.regexResetRawButton.addEventListener('click', populateRegexForm);
    refs.regexApplyRawButton.addEventListener('click', applyRawRegexJson);
}

async function handleFileInput(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        loadCard(parsed, file.name, file.size);
        showBanner(`已载入 ${file.name}`, 'info');
    } catch (error) {
        console.error(error);
        showBanner(`读取失败：${error.message}`);
    } finally {
        refs.fileInput.value = '';
    }
}

function loadCard(card, fileName, fileSize) {
    state.card = normalizeCard(card);
    state.originalSnapshot = structuredClone(state.card);
    state.fileName = fileName;
    state.fileSize = fileSize;
    state.dirty = false;
    state.activeTab = TAB_META;
    state.entriesSelection = 0;
    state.regexSelection = 0;
    state.filters.entries = { search: '', filterOne: 'all', filterTwo: 'all', sort: 'display_index' };
    state.filters.regex = { search: '', filterOne: 'all', filterTwo: 'all', sort: 'name' };
    refs.emptyState.hidden = true;
    render();
}

function normalizeCard(card) {
    const normalized = structuredClone(card);
    normalized.data ??= {};
    normalized.data.character_book ??= {};
    normalized.data.character_book.entries ??= [];
    normalized.data.extensions ??= {};
    normalized.data.extensions.regex_scripts ??= [];

    if (!Array.isArray(normalized.data.character_book.entries)) {
        normalized.data.character_book.entries = [];
    }

    if (!Array.isArray(normalized.data.extensions.regex_scripts)) {
        normalized.data.extensions.regex_scripts = [];
    }

    if (!Array.isArray(normalized.tags)) {
        normalized.tags = Array.isArray(normalized.data.tags) ? structuredClone(normalized.data.tags) : [];
    }

    if (!Array.isArray(normalized.data.tags)) {
        normalized.data.tags = Array.isArray(normalized.tags) ? structuredClone(normalized.tags) : [];
    }

    normalized.data.character_book.entries = normalized.data.character_book.entries.map(normalizeEntry);
    normalized.data.extensions.regex_scripts = normalized.data.extensions.regex_scripts.map(normalizeRegexScript);
    return normalized;
}

function normalizeEntry(entry) {
    const normalized = structuredClone(entry);
    const fallbackId = nextEntryId(normalized);

    normalized.id = Number.isFinite(Number(normalized.id)) ? Number(normalized.id) : fallbackId;
    normalized.keys = ensureArray(normalized.keys);
    normalized.secondary_keys = ensureArray(normalized.secondary_keys);
    normalized.comment ??= '';
    normalized.content ??= '';
    normalized.constant = Boolean(normalized.constant);
    normalized.selective = normalized.selective ?? true;
    normalized.insertion_order = Number.isFinite(normalized.insertion_order) ? normalized.insertion_order : 100;
    normalized.enabled = normalized.enabled ?? true;
    normalized.position = normalized.position === 'before_char' ? 'before_char' : 'after_char';
    normalized.use_regex = Boolean(normalized.use_regex);
    normalized.extensions = {
        position: normalized.position === 'before_char' ? 0 : 1,
        exclude_recursion: false,
        display_index: normalized.id,
        probability: 100,
        useProbability: true,
        depth: 4,
        selectiveLogic: 0,
        outlet_name: '',
        group: '',
        group_override: false,
        group_weight: 100,
        prevent_recursion: false,
        delay_until_recursion: false,
        scan_depth: null,
        match_whole_words: null,
        use_group_scoring: null,
        case_sensitive: null,
        automation_id: '',
        role: 0,
        vectorized: false,
        sticky: null,
        cooldown: null,
        delay: null,
        match_persona_description: false,
        match_character_description: false,
        match_character_personality: false,
        match_character_depth_prompt: false,
        match_scenario: false,
        match_creator_notes: false,
        triggers: [],
        ignore_budget: false,
        ...(normalized.extensions ?? {}),
    };
    normalized.extensions.triggers = ensureArray(normalized.extensions.triggers);
    return normalized;
}

function normalizeRegexScript(script) {
    const normalized = structuredClone(script);
    normalized.id ??= createUuid();
    normalized.scriptName ??= '未命名正则';
    normalized.disabled = Boolean(normalized.disabled);
    normalized.runOnEdit = Boolean(normalized.runOnEdit);
    normalized.findRegex ??= '';
    normalized.trimStrings = ensureArray(normalized.trimStrings);
    normalized.replaceString ??= '';
    normalized.placement = ensureArray(normalized.placement).map(Number).filter((value) => Number.isFinite(value));
    normalized.substituteRegex = Number.isFinite(normalized.substituteRegex) ? normalized.substituteRegex : 0;
    normalized.minDepth = normalizeNullableNumber(normalized.minDepth);
    normalized.maxDepth = normalizeNullableNumber(normalized.maxDepth);
    normalized.markdownOnly = Boolean(normalized.markdownOnly);
    normalized.promptOnly = Boolean(normalized.promptOnly);
    return normalized;
}

function render() {
    updateTopActions();
    updateOverview();
    renderTabs();
    renderSidebars();
    renderActiveForm();
}

function updateTopActions() {
    const hasCard = Boolean(state.card);
    refs.exportButton.disabled = !hasCard;
    refs.reloadButton.disabled = !hasCard;
}

function updateOverview() {
    const entries = getEntries();
    const regexScripts = getRegexScripts();
    const enabledEntries = entries.filter((item) => item.enabled).length;
    const constantEntries = entries.filter((item) => item.constant).length;
    const enabledRegex = regexScripts.filter((item) => !item.disabled).length;
    const promptOnlyRegex = regexScripts.filter((item) => item.promptOnly).length;

    refs.fileBadge.textContent = state.fileName || '未载入文件';
    refs.dirtyBadge.textContent = state.card ? (state.dirty ? '有未导出修改' : '未修改') : '未修改';
    refs.tabSummary.textContent = state.card ? tabSummaryText() : '请选择角色卡 JSON';

    refs.cardNameStat.textContent = state.card ? (getMirroredField('name') || '未命名角色卡') : '未载入';
    refs.cardSpecStat.textContent = state.card
        ? `${state.card.spec ?? '无 spec'} / ${state.card.spec_version ?? '无 spec_version'}`
        : '等待文件';
    refs.entryCountStat.textContent = String(entries.length);
    refs.entryMetaStat.textContent = `启用 ${enabledEntries} / 常驻 ${constantEntries}`;
    refs.regexCountStat.textContent = String(regexScripts.length);
    refs.regexMetaStat.textContent = `启用 ${enabledRegex} / PromptOnly ${promptOnlyRegex}`;
    refs.fileNameStat.textContent = state.fileName || '未载入';
    refs.fileSizeStat.textContent = formatBytes(state.fileSize);
}

function renderTabs() {
    refs.tabButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === state.activeTab);
    });
}

function renderSidebars() {
    const showList = state.card && state.activeTab !== TAB_META;
    refs.metaSidebar.hidden = true;
    refs.listSidebar.hidden = !showList;

    if (!showList) {
        return;
    }

    configureListControls();
    renderList();
}

function configureListControls() {
    const filters = currentFilters();
    refs.listSearch.value = filters.search;
    refs.listFilterOne.innerHTML = '';
    refs.listFilterTwo.innerHTML = '';
    refs.listSort.innerHTML = '';

    if (state.activeTab === TAB_ENTRIES) {
        refs.listSearch.placeholder = '搜索注释名、关键词、内容';
        refs.filterOneLabel.textContent = '位置';
        refs.filterTwoLabel.textContent = '状态';
        fillSelect(refs.listFilterOne, [
            ['all', '全部位置'],
            ['before_char', 'before_char'],
            ['after_char', 'after_char'],
        ], filters.filterOne);
        fillSelect(refs.listFilterTwo, [
            ['all', '全部状态'],
            ['enabled', '仅启用'],
            ['disabled', '仅停用'],
        ], filters.filterTwo);
        fillSelect(refs.listSort, [
            ['display_index', '按显示顺序'],
            ['insertion_order', '按插入顺序'],
            ['comment', '按注释名'],
            ['id', '按 ID'],
        ], filters.sort);
        refs.addItemButton.textContent = '新增词条';
    } else {
        refs.listSearch.placeholder = '搜索脚本名、正则、替换内容';
        refs.filterOneLabel.textContent = 'Placement';
        refs.filterTwoLabel.textContent = '状态';
        fillSelect(refs.listFilterOne, [
            ['all', '全部位置'],
            ...REGEX_PLACEMENTS.map((item) => [String(item.value), `${item.value} ${item.label}`]),
        ], filters.filterOne);
        fillSelect(refs.listFilterTwo, [
            ['all', '全部状态'],
            ['enabled', '仅启用'],
            ['disabled', '仅停用'],
        ], filters.filterTwo);
        fillSelect(refs.listSort, [
            ['name', '按脚本名'],
            ['placement', '按 placement'],
            ['id', '按 ID'],
        ], filters.sort);
        refs.addItemButton.textContent = '新增正则';
    }
}

function renderList() {
    if (!state.card) {
        refs.itemList.innerHTML = '';
        refs.listCount.textContent = '暂无数据';
        refs.addItemButton.disabled = true;
        refs.duplicateItemButton.disabled = true;
        refs.deleteItemButton.disabled = true;
        return;
    }

    const items = state.activeTab === TAB_ENTRIES ? getFilteredEntries() : getFilteredRegexScripts();
    const selectedIndex = state.activeTab === TAB_ENTRIES ? state.entriesSelection : state.regexSelection;
    const hasSelected = state.activeTab === TAB_ENTRIES ? Boolean(getSelectedEntry()) : Boolean(getSelectedRegex());

    refs.addItemButton.disabled = false;
    refs.duplicateItemButton.disabled = !hasSelected;
    refs.deleteItemButton.disabled = !hasSelected;
    refs.listCount.textContent = `当前显示 ${items.length} 条`;
    refs.itemList.innerHTML = '';

    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'list-item';
        empty.innerHTML = '<strong>没有匹配结果</strong><p class="list-item-subtitle">调整筛选条件或新建一条。</p>';
        refs.itemList.append(empty);
        return;
    }

    for (const item of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'list-item';
        button.classList.toggle('active', item.index === selectedIndex);
        button.addEventListener('click', () => {
            if (state.activeTab === TAB_ENTRIES) {
                state.entriesSelection = item.index;
            } else {
                state.regexSelection = item.index;
            }

            renderList();
            renderActiveForm();
        });

        if (state.activeTab === TAB_ENTRIES) {
            const summary = makeEntryListSummary(item.value);
            button.innerHTML = `
                <div class="list-item-title">
                    <strong>${escapeHtml(summary.title)}</strong>
                    <span class="inline-badge">#${summary.id}</span>
                </div>
                <p class="list-item-subtitle">${escapeHtml(summary.subtitle)}</p>
                <div class="badge-row">${summary.badges.map((badge) => `<span class="inline-badge">${escapeHtml(badge)}</span>`).join('')}</div>
            `;
        } else {
            const summary = makeRegexListSummary(item.value);
            button.innerHTML = `
                <div class="list-item-title">
                    <strong>${escapeHtml(summary.title)}</strong>
                    <span class="inline-badge">${escapeHtml(summary.id)}</span>
                </div>
                <p class="list-item-subtitle">${escapeHtml(summary.subtitle)}</p>
                <div class="badge-row">${summary.badges.map((badge) => `<span class="inline-badge">${escapeHtml(badge)}</span>`).join('')}</div>
            `;
        }

        refs.itemList.append(button);
    }
}

function renderActiveForm() {
    const hasCard = Boolean(state.card);
    const showMeta = hasCard && state.activeTab === TAB_META;
    const showEntry = hasCard && state.activeTab === TAB_ENTRIES;
    const showRegex = hasCard && state.activeTab === TAB_REGEX;

    refs.emptyState.hidden = showMeta || showEntry || showRegex;
    refs.metaForm.hidden = !showMeta;
    refs.entryForm.hidden = !showEntry;
    refs.regexForm.hidden = !showRegex;

    if (showMeta) {
        populateMetaForm();
    } else if (showEntry) {
        populateEntryForm();
    } else if (showRegex) {
        populateRegexForm();
    }
}

function populateMetaForm() {
    if (!state.card) {
        return;
    }

    refs.metaName.value = getMirroredField('name');
    refs.metaTags.value = ensureArray(getMirroredField('tags')).join(', ');
    refs.metaDescription.value = getMirroredField('description');
    refs.metaPersonality.value = getMirroredField('personality');
    refs.metaScenario.value = getMirroredField('scenario');
    refs.metaFirstMessage.value = getMirroredField('first_mes');
    refs.metaMessageExample.value = getMirroredField('mes_example');
    refs.metaSystemPrompt.value = state.card.data?.system_prompt ?? '';
    refs.metaPostHistoryInstructions.value = state.card.data?.post_history_instructions ?? '';
    refs.metaCreatorNotes.value = state.card.data?.creator_notes ?? state.card.creatorcomment ?? '';
}

function populateEntryForm() {
    const entry = getSelectedEntry();
    if (!entry) {
        refs.entryHeading.textContent = '暂无词条';
        refs.entryIdentity.textContent = 'Entry';
        clearEntryForm();
        return;
    }

    refs.entryIdentity.textContent = `Entry #${entry.id}`;
    refs.entryHeading.textContent = entry.comment || '未命名词条';
    refs.entryId.value = String(entry.id);
    refs.entryComment.value = entry.comment ?? '';
    refs.entryPosition.value = entry.position ?? 'after_char';
    refs.entryInsertionOrder.value = String(entry.insertion_order ?? 100);
    refs.entryDisplayIndex.value = String(entry.extensions?.display_index ?? entry.id ?? 0);
    refs.entryDepth.value = String(entry.extensions?.depth ?? 4);
    refs.entryEnabled.checked = Boolean(entry.enabled);
    refs.entryConstant.checked = Boolean(entry.constant);
    refs.entrySelective.checked = Boolean(entry.selective);
    refs.entryUseRegex.checked = Boolean(entry.use_regex);
    refs.entryKeys.value = ensureArray(entry.keys).join('\n');
    refs.entrySecondaryKeys.value = ensureArray(entry.secondary_keys).join('\n');
    refs.entryContent.value = entry.content ?? '';
    refs.entryProbability.value = String(entry.extensions?.probability ?? 100);
    refs.entryGroup.value = entry.extensions?.group ?? '';
    refs.entryOutletName.value = entry.extensions?.outlet_name ?? '';
    refs.entryRole.value = String(entry.extensions?.role ?? 0);
    refs.entryAutomationId.value = entry.extensions?.automation_id ?? '';
    refs.entryScanDepth.value = entry.extensions?.scan_depth ?? '';
    refs.entryUseProbability.checked = Boolean(entry.extensions?.useProbability);
    refs.entryVectorized.checked = Boolean(entry.extensions?.vectorized);
    refs.entryExcludeRecursion.checked = Boolean(entry.extensions?.exclude_recursion);
    refs.entryPreventRecursion.checked = Boolean(entry.extensions?.prevent_recursion);
    refs.entryIgnoreBudget.checked = Boolean(entry.extensions?.ignore_budget);
    refs.entryRawJson.value = JSON.stringify(entry, null, 4);
}

function populateRegexForm() {
    const script = getSelectedRegex();
    if (!script) {
        refs.regexHeading.textContent = '暂无正则';
        refs.regexIdentity.textContent = 'Regex';
        clearRegexForm();
        return;
    }

    refs.regexIdentity.textContent = `Regex ${script.id}`;
    refs.regexHeading.textContent = script.scriptName || '未命名正则';
    refs.regexId.value = script.id;
    refs.regexName.value = script.scriptName ?? '';
    refs.regexSubstituteMode.value = String(script.substituteRegex ?? 0);
    refs.regexMinDepth.value = script.minDepth ?? '';
    refs.regexMaxDepth.value = script.maxDepth ?? '';
    refs.regexTrimStrings.value = ensureArray(script.trimStrings).join('\n');
    refs.regexDisabled.checked = Boolean(script.disabled);
    refs.regexRunOnEdit.checked = Boolean(script.runOnEdit);
    refs.regexMarkdownOnly.checked = Boolean(script.markdownOnly);
    refs.regexPromptOnly.checked = Boolean(script.promptOnly);
    refs.regexPlacementCheckboxes.forEach((checkbox) => {
        checkbox.checked = ensureArray(script.placement).includes(Number(checkbox.value));
    });
    refs.regexFindRegex.value = script.findRegex ?? '';
    refs.regexReplaceString.value = script.replaceString ?? '';
    refs.regexRawJson.value = JSON.stringify(script, null, 4);
}

function clearEntryForm() {
    [
        refs.entryId,
        refs.entryComment,
        refs.entryInsertionOrder,
        refs.entryDisplayIndex,
        refs.entryDepth,
        refs.entryKeys,
        refs.entrySecondaryKeys,
        refs.entryContent,
        refs.entryProbability,
        refs.entryGroup,
        refs.entryOutletName,
        refs.entryAutomationId,
        refs.entryScanDepth,
        refs.entryRawJson,
    ].forEach((element) => {
        element.value = '';
    });
    refs.entryEnabled.checked = false;
    refs.entryConstant.checked = false;
    refs.entrySelective.checked = false;
    refs.entryUseRegex.checked = false;
    refs.entryUseProbability.checked = false;
    refs.entryVectorized.checked = false;
    refs.entryExcludeRecursion.checked = false;
    refs.entryPreventRecursion.checked = false;
    refs.entryIgnoreBudget.checked = false;
    refs.entryPosition.value = 'after_char';
    refs.entryRole.value = '0';
}

function clearRegexForm() {
    [
        refs.regexId,
        refs.regexName,
        refs.regexMinDepth,
        refs.regexMaxDepth,
        refs.regexTrimStrings,
        refs.regexFindRegex,
        refs.regexReplaceString,
        refs.regexRawJson,
    ].forEach((element) => {
        element.value = '';
    });
    refs.regexSubstituteMode.value = '0';
    refs.regexDisabled.checked = false;
    refs.regexRunOnEdit.checked = false;
    refs.regexMarkdownOnly.checked = false;
    refs.regexPromptOnly.checked = false;
    refs.regexPlacementCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
    });
}

function addCurrentTabItem() {
    if (!state.card) {
        return;
    }

    if (state.activeTab === TAB_ENTRIES) {
        const entry = createDefaultEntry();
        getEntries().push(entry);
        state.entriesSelection = getEntries().length - 1;
        markDirty();
        render();
        showBanner(`已新增词条 #${entry.id}`, 'info');
        return;
    }

    const script = createDefaultRegexScript();
    getRegexScripts().push(script);
    state.regexSelection = getRegexScripts().length - 1;
    markDirty();
    render();
    showBanner(`已新增正则 ${script.scriptName}`, 'info');
}

function duplicateCurrentTabItem() {
    if (!state.card) {
        return;
    }

    if (state.activeTab === TAB_ENTRIES) {
        const source = getSelectedEntry();
        if (!source) {
            return;
        }

        const copy = structuredClone(source);
        copy.id = getNextEntryId();
        copy.comment = source.comment ? `${source.comment} - 副本` : `新词条 ${copy.id}`;
        copy.extensions.display_index = getNextDisplayIndex();
        getEntries().splice(state.entriesSelection + 1, 0, copy);
        state.entriesSelection += 1;
        markDirty();
        render();
        showBanner(`已复制词条 #${source.id}`, 'info');
        return;
    }

    const source = getSelectedRegex();
    if (!source) {
        return;
    }

    const copy = structuredClone(source);
    copy.id = createUuid();
    copy.scriptName = source.scriptName ? `${source.scriptName} - 副本` : '未命名正则 - 副本';
    getRegexScripts().splice(state.regexSelection + 1, 0, copy);
    state.regexSelection += 1;
    markDirty();
    render();
    showBanner(`已复制正则 ${source.scriptName || source.id}`, 'info');
}

function deleteCurrentTabItem() {
    if (!state.card) {
        return;
    }

    if (state.activeTab === TAB_ENTRIES) {
        const entry = getSelectedEntry();
        if (!entry) {
            return;
        }

        const confirmed = window.confirm(`删除词条 #${entry.id} 吗？此操作不可撤销。`);
        if (!confirmed) {
            return;
        }

        getEntries().splice(state.entriesSelection, 1);
        state.entriesSelection = Math.max(0, Math.min(state.entriesSelection, getEntries().length - 1));
        markDirty();
        render();
        showBanner(`已删除词条 #${entry.id}`, 'info');
        return;
    }

    const script = getSelectedRegex();
    if (!script) {
        return;
    }

    const confirmed = window.confirm(`删除正则 ${script.scriptName || script.id} 吗？此操作不可撤销。`);
    if (!confirmed) {
        return;
    }

    getRegexScripts().splice(state.regexSelection, 1);
    state.regexSelection = Math.max(0, Math.min(state.regexSelection, getRegexScripts().length - 1));
    markDirty();
    render();
    showBanner(`已删除正则 ${script.scriptName || script.id}`, 'info');
}

function updateEntryField(field, value) {
    const entry = getSelectedEntry();
    if (!entry) {
        return;
    }

    entry[field] = value;
    markDirty();
    renderList();
    updateOverview();

    if (field === 'comment') {
        refs.entryHeading.textContent = entry.comment || '未命名词条';
    }

    refs.entryRawJson.value = JSON.stringify(entry, null, 4);
}

function updateEntryExtensionField(field, value) {
    const entry = getSelectedEntry();
    if (!entry) {
        return;
    }

    entry.extensions ??= {};
    entry.extensions[field] = value;
    markDirty();
    renderList();
    updateOverview();
    refs.entryRawJson.value = JSON.stringify(entry, null, 4);
}

function updateRegexField(field, value) {
    const script = getSelectedRegex();
    if (!script) {
        return;
    }

    script[field] = value;
    markDirty();
    renderList();
    updateOverview();

    if (field === 'scriptName') {
        refs.regexHeading.textContent = script.scriptName || '未命名正则';
    }

    refs.regexRawJson.value = JSON.stringify(script, null, 4);
}

function applyRawEntryJson() {
    if (!getSelectedEntry()) {
        return;
    }

    try {
        const parsed = normalizeEntry(JSON.parse(refs.entryRawJson.value));
        getEntries()[state.entriesSelection] = parsed;
        markDirty();
        render();
        showBanner(`已应用词条 #${parsed.id} 的高级 JSON`, 'info');
    } catch (error) {
        console.error(error);
        showBanner(`词条 JSON 解析失败：${error.message}`);
    }
}

function applyRawRegexJson() {
    if (!getSelectedRegex()) {
        return;
    }

    try {
        const parsed = normalizeRegexScript(JSON.parse(refs.regexRawJson.value));
        getRegexScripts()[state.regexSelection] = parsed;
        markDirty();
        render();
        showBanner(`已应用正则 ${parsed.scriptName || parsed.id} 的高级 JSON`, 'info');
    } catch (error) {
        console.error(error);
        showBanner(`正则 JSON 解析失败：${error.message}`);
    }
}

function restoreOriginalSnapshot() {
    if (!state.originalSnapshot) {
        return;
    }

    const confirmed = state.dirty ? window.confirm('恢复到刚载入的版本？未导出的修改会丢失。') : true;
    if (!confirmed) {
        return;
    }

    state.card = structuredClone(state.originalSnapshot);
    state.dirty = false;
    state.entriesSelection = 0;
    state.regexSelection = 0;
    state.activeTab = TAB_META;
    render();
    showBanner('已恢复到载入时的版本', 'info');
}

function exportCard() {
    if (!state.card) {
        return;
    }

    const exportName = state.fileName
        ? state.fileName.replace(/\.json$/i, '') + '-edited.json'
        : 'character-card-edited.json';
    const blob = new Blob([JSON.stringify(state.card, null, 4)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportName;
    link.click();
    URL.revokeObjectURL(url);
    state.dirty = false;
    updateOverview();
    showBanner(`已导出 ${exportName}`, 'info');
}

function getFilteredEntries() {
    const filters = state.filters.entries;
    return getEntries()
        .map((value, index) => ({ value, index }))
        .filter(({ value }) => {
            const search = filters.search.trim().toLowerCase();
            if (search) {
                const haystack = [
                    value.comment,
                    value.content,
                    ensureArray(value.keys).join(' '),
                    ensureArray(value.secondary_keys).join(' '),
                ].join(' ').toLowerCase();
                if (!haystack.includes(search)) {
                    return false;
                }
            }

            if (filters.filterOne !== 'all' && value.position !== filters.filterOne) {
                return false;
            }

            if (filters.filterTwo === 'enabled' && !value.enabled) {
                return false;
            }

            if (filters.filterTwo === 'disabled' && value.enabled) {
                return false;
            }

            return true;
        })
        .sort((a, b) => compareEntries(a.value, b.value, filters.sort));
}

function getFilteredRegexScripts() {
    const filters = state.filters.regex;
    return getRegexScripts()
        .map((value, index) => ({ value, index }))
        .filter(({ value }) => {
            const search = filters.search.trim().toLowerCase();
            if (search) {
                const haystack = [value.scriptName, value.findRegex, value.replaceString].join(' ').toLowerCase();
                if (!haystack.includes(search)) {
                    return false;
                }
            }

            if (filters.filterOne !== 'all' && !ensureArray(value.placement).includes(Number(filters.filterOne))) {
                return false;
            }

            if (filters.filterTwo === 'enabled' && value.disabled) {
                return false;
            }

            if (filters.filterTwo === 'disabled' && !value.disabled) {
                return false;
            }

            return true;
        })
        .sort((a, b) => compareRegexScripts(a.value, b.value, filters.sort));
}

function compareEntries(a, b, sortKey) {
    if (sortKey === 'comment') {
        return String(a.comment || '').localeCompare(String(b.comment || ''), 'zh-CN');
    }

    if (sortKey === 'insertion_order') {
        return (a.insertion_order ?? 0) - (b.insertion_order ?? 0) || (a.id ?? 0) - (b.id ?? 0);
    }

    if (sortKey === 'id') {
        return (a.id ?? 0) - (b.id ?? 0);
    }

    return (a.extensions?.display_index ?? 0) - (b.extensions?.display_index ?? 0) || (a.id ?? 0) - (b.id ?? 0);
}

function compareRegexScripts(a, b, sortKey) {
    if (sortKey === 'placement') {
        return Math.min(...ensureArray(a.placement), 99) - Math.min(...ensureArray(b.placement), 99);
    }

    if (sortKey === 'id') {
        return String(a.id).localeCompare(String(b.id), 'en');
    }

    return String(a.scriptName || '').localeCompare(String(b.scriptName || ''), 'zh-CN');
}

function makeEntryListSummary(entry) {
    const title = entry.comment || `未命名词条 #${entry.id}`;
    const keySummary = ensureArray(entry.keys).slice(0, 4).join(', ');
    return {
        id: entry.id ?? 'n/a',
        title,
        subtitle: keySummary || compactSnippet(entry.content) || '无关键词与内容摘要',
        badges: [
            entry.enabled ? 'enabled' : 'disabled',
            entry.position || 'after_char',
            entry.constant ? 'constant' : 'selective',
            `order:${entry.insertion_order ?? 0}`,
            `display:${entry.extensions?.display_index ?? 0}`,
        ],
    };
}

function makeRegexListSummary(script) {
    return {
        id: script.id ?? 'n/a',
        title: script.scriptName || '未命名正则',
        subtitle: compactSnippet(script.findRegex) || '无 findRegex',
        badges: [
            script.disabled ? 'disabled' : 'enabled',
            script.markdownOnly ? 'markdownOnly' : 'display+prompt',
            script.promptOnly ? 'promptOnly' : 'history-visible',
            ...ensureArray(script.placement).map(formatPlacementLabel),
        ],
    };
}

function setMirroredField(field, value) {
    if (!state.card) {
        return;
    }

    state.card[field] = structuredClone(value);
    state.card.data[field] = structuredClone(value);
    markDirtyAndRefresh();
}

function setDataField(field, value) {
    if (!state.card) {
        return;
    }

    state.card.data[field] = value;
    markDirtyAndRefresh();
}

function getMirroredField(field) {
    if (!state.card) {
        return field === 'tags' ? [] : '';
    }

    if (field in state.card.data) {
        return state.card.data[field];
    }

    return state.card[field] ?? (field === 'tags' ? [] : '');
}

function markDirtyAndRefresh() {
    markDirty();
    updateOverview();
}

function markDirty() {
    state.dirty = true;
    updateOverview();
}

function tabSummaryText() {
    if (state.activeTab === TAB_META) {
        return '当前在编辑卡片概览';
    }

    if (state.activeTab === TAB_ENTRIES) {
        const entry = getSelectedEntry();
        return entry ? `当前词条：${entry.comment || `#${entry.id}`}` : '当前没有选中词条';
    }

    const script = getSelectedRegex();
    return script ? `当前正则：${script.scriptName || script.id}` : '当前没有选中正则';
}

function getEntries() {
    return state.card?.data?.character_book?.entries ?? [];
}

function getRegexScripts() {
    return state.card?.data?.extensions?.regex_scripts ?? [];
}

function getSelectedEntry() {
    return getEntries()[state.entriesSelection] ?? null;
}

function getSelectedRegex() {
    return getRegexScripts()[state.regexSelection] ?? null;
}

function currentFilters() {
    return state.activeTab === TAB_ENTRIES ? state.filters.entries : state.filters.regex;
}

function createDefaultEntry() {
    const id = getNextEntryId();
    return normalizeEntry({
        id,
        keys: [],
        secondary_keys: [],
        comment: `新词条 ${id}`,
        content: '',
        constant: false,
        selective: true,
        insertion_order: 100,
        enabled: true,
        position: 'after_char',
        use_regex: false,
        extensions: {
            position: 1,
            exclude_recursion: false,
            display_index: getNextDisplayIndex(),
            probability: 100,
            useProbability: true,
            depth: 4,
            selectiveLogic: 0,
            outlet_name: '',
            group: '',
            group_override: false,
            group_weight: 100,
            prevent_recursion: false,
            delay_until_recursion: false,
            scan_depth: null,
            match_whole_words: null,
            use_group_scoring: null,
            case_sensitive: null,
            automation_id: '',
            role: 0,
            vectorized: false,
            sticky: null,
            cooldown: null,
            delay: null,
            match_persona_description: false,
            match_character_description: false,
            match_character_personality: false,
            match_character_depth_prompt: false,
            match_scenario: false,
            match_creator_notes: false,
            triggers: [],
            ignore_budget: false,
        },
    });
}

function createDefaultRegexScript() {
    return normalizeRegexScript({
        id: createUuid(),
        scriptName: '新正则脚本',
        disabled: false,
        runOnEdit: false,
        findRegex: '',
        trimStrings: [],
        replaceString: '',
        placement: [2],
        substituteRegex: 0,
        minDepth: null,
        maxDepth: null,
        markdownOnly: false,
        promptOnly: false,
    });
}

function getNextEntryId() {
    return getEntries().reduce((max, entry) => Math.max(max, Number(entry.id) || 0), 0) + 1;
}

function getNextDisplayIndex() {
    return getEntries().reduce((max, entry) => Math.max(max, Number(entry.extensions?.display_index) || 0), 0) + 1;
}

function showBanner(message, type = 'error') {
    if (!message) {
        refs.messageBanner.hidden = true;
        refs.messageBanner.textContent = '';
        refs.messageBanner.className = 'message-banner';
        return;
    }

    refs.messageBanner.hidden = false;
    refs.messageBanner.textContent = message;
    refs.messageBanner.className = `message-banner ${type}`;
}

function fillSelect(element, options, selectedValue) {
    for (const [value, label] of options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        element.append(option);
    }

    element.value = selectedValue;
}

function parseListArea(value) {
    return value
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseTrimStrings(value) {
    return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseCommaSeparated(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseNullableNumber(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableNumber(value) {
    if (value === '' || value === undefined) {
        return null;
    }

    return value === null ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
}

function parseNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function compactSnippet(value, length = 96) {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    return normalized.length > length ? `${normalized.slice(0, length)}...` : normalized;
}

function formatPlacementLabel(value) {
    const match = REGEX_PLACEMENTS.find((item) => item.value === Number(value));
    return match ? `${match.value} ${match.label}` : String(value);
}

function formatBytes(size) {
    if (!size) {
        return '0 KB';
    }

    const kb = size / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
}

function createUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `uuid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextEntryId(entry) {
    return Number(entry?.uid) || Number(entry?.id) || Date.now();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
