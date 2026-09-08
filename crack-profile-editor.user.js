// ==UserScript==
// @name         크랙 대화 프로필 편집기
// @namespace    https://crack.wrtn.ai/
// @version      1.2.0
// @description  대화 프로필을 2패널에서 추가, 수정, 삭제하고 현재 대화에 적용합니다. (version 관리방식: 크랙UI변경.기능추가및수정.핫픽스)
// @author       gpt
// @match        https://crack.wrtn.ai/*
// @updateURL    https://github.com/hamster4762/crack-profile-editor/raw/refs/heads/main/crack-profile-editor.user.js
// @downloadURL  https://github.com/hamster4762/crack-profile-editor/raw/refs/heads/main/crack-profile-editor.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const API_GATEWAY = 'https://crack-api.wrtn.ai';
  const PROFILE_API_BASE = `${API_GATEWAY}/crack-api`;
  const CHAT_API_BASE = `${API_GATEWAY}/crack-gen`;
  const DIALOG_TITLE = '대화 프로필';
  const REQUEST_TIMEOUT_MS = 15_000;
  const DEFAULT_SORT_MODE = 'updated-desc';

  const SELECTORS = {
    nativeCard: 'div.flex.flex-col.p-4.gap-2.rounded-lg',
  };

  // ── UI 스타일: 편집기와 해당 팝업에만 적용 ──
  const STYLE = `
    div[role="dialog"]:has(> #cp-editor) {
      --cp-bg: #ffffff;
      --cp-sidebar-bg: #f9fafb;
      --cp-card-bg: #ffffff;
      --cp-card-hover: #f3f4f6;
      --cp-input-bg: #ffffff;
      --cp-border: #d1d5db;
      --cp-text: #1f2937;
      --cp-muted: #6b7280;
      --cp-neutral-button: #e5e7eb;
      --cp-neutral-button-hover: #d1d5db;
      --cp-accent: #2563eb;
      --cp-accent-hover: #1d4ed8;
      --cp-accent-ring: #2563eb55;
      --cp-danger: #dc2626;
      --cp-danger-hover: #b91c1c;
      animation: none !important;
      transition: none !important;
      /* 모바일 bottom-sheet와 데스크톱 중앙정렬을 같은 좌표계로 통일한다.
         측정값은 키보드를 제외한 실제 표시 영역이며 사이트 레이어는 건드리지 않는다. */
      box-sizing: border-box;
      position: fixed !important;
      top: var(--cp-dialog-top, 0px) !important;
      left: var(--cp-dialog-left, 0px) !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      translate: none !important;
      margin: 0 !important;
      width: var(--cp-dialog-width, 100vw) !important;
      height: var(--cp-dialog-height, 100dvh) !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden;
      background: var(--cp-bg) !important;
      color: var(--cp-text) !important;
    }

    body[data-theme="dark"] div[role="dialog"]:has(> #cp-editor) {
      --cp-bg: #242321;
      --cp-sidebar-bg: #2e2d2b;
      --cp-card-bg: #1a1918;
      --cp-card-hover: #353431;
      --cp-input-bg: #141413;
      --cp-border: #42413d;
      --cp-text: #f0efeb;
      --cp-muted: #9ca3af;
      --cp-neutral-button: #2e2d2b;
      --cp-neutral-button-hover: #42413d;
      --cp-accent: #3b82f6;
      --cp-accent-hover: #2563eb;
      --cp-accent-ring: #3b82f655;
      --cp-danger: #991b1b;
      --cp-danger-hover: #7f1d1d;
    }

    #cp-editor {
      display: flex;
      flex: 1 1 0;
      width: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border-top: 1px solid var(--cp-border);
      color: var(--cp-text);
    }

    #cp-editor * {
      box-sizing: border-box;
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }

    #cp-editor .cp-sidebar {
      display: flex;
      flex: 0 0 32%;
      flex-direction: column;
      width: 32%;
      min-width: 0;
      min-height: 0;
      border-right: 1px solid var(--cp-border);
      background: var(--cp-sidebar-bg);
    }

    #cp-editor .cp-sidebar-header {
      display: flex;
      align-items: center;
      position: relative;
      gap: 0.375rem;
      min-height: 0;
      flex-shrink: 0;
      padding: 0.5rem;
      border-bottom: 1px solid var(--cp-border);
      font-weight: 700;
    }

    #cp-editor .cp-sidebar-header .cp-search {
      flex: 1;
      min-width: 0;
      width: 0;
      height: 2.25rem;
      padding: 0.5rem;
      font-size: 0.8125rem;
    }

    #cp-editor .cp-sort,
    #cp-editor .cp-sidebar-header .cp-add {
      display: grid;
      place-items: center;
      flex: 0 0 1.875rem;
      width: 1.875rem;
      height: 2.25rem;
      padding: 0;
      border: 0;
      border-radius: 0.5rem;
      background: var(--cp-neutral-button);
      color: inherit;
      cursor: pointer;
    }

    #cp-editor .cp-sort:hover { background: var(--cp-neutral-button-hover); }
    #cp-editor .cp-sort-menu {
      position: absolute;
      top: 100%;
      right: var(--cp-sort-menu-right, 0px);
      z-index: 1;
      width: 13.125rem;
      max-width: var(--cp-dialog-width, 100vw);
      max-height: 60%;
      max-height: min(18rem, calc(var(--cp-dialog-height, 100dvh) * 0.6));
      overflow: auto;
      padding: 0.375rem;
      border: 1px solid var(--cp-border);
      border-radius: 0.5rem;
      background: var(--cp-bg);
      box-shadow: 0 0.25rem 0.75rem #0002;
    }
    #cp-editor .cp-sort-menu button {
      display: block;
      width: 100%;
      padding: 0.625rem;
      border: 0;
      border-radius: 0.25rem;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    #cp-editor .cp-sort-menu button:hover,
    #cp-editor .cp-sort-menu button[aria-pressed="true"] {
      background: var(--cp-card-hover);
      color: var(--cp-accent);
    }
    #cp-editor .cp-empty { padding: 0.75rem; color: var(--cp-muted); font-size: 0.8125rem; }

    #cp-editor .cp-list {
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 0.75rem;
    }

    #cp-editor .cp-item {
      position: relative;
      width: 100%;
      margin: 0 0 0.5rem;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 0.625rem;
      background: var(--cp-card-bg);
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    #cp-editor .cp-item-select {
      display: block;
      width: 100%;
      padding: 0.75rem 2.75rem 0.75rem 0.75rem;
      border: 0;
      border-radius: inherit;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    #cp-editor .cp-delete {
      position: absolute;
      top: 0.375rem;
      right: 0.375rem;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      border: 0;
      border-radius: 0.375rem;
      background: transparent;
      color: var(--cp-muted);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
    }

    #cp-editor .cp-delete:hover:not(:disabled) {
      background: var(--cp-danger);
      color: #fff;
    }

    #cp-editor .cp-item:hover {
      background: var(--cp-card-hover);
    }

    #cp-editor .cp-item.is-selected {
      border-color: var(--cp-accent);
      box-shadow: 0 0 0 1px var(--cp-accent);
    }

    #cp-editor .cp-item-title {
      display: flex;
      align-items: center;
      gap: 0.4375rem;
      overflow-wrap: anywhere;
      font-weight: 700;
    }

    #cp-editor .cp-current-badge {
      flex-shrink: 0;
      white-space: nowrap;
      padding: 0.125rem 0.3125rem;
      border-radius: 0.25rem;
      background: var(--cp-accent);
      color: #fff;
      font-size: 0.6875rem;
    }

    #cp-editor .cp-preview {
      display: block;
      margin-top: 0.4375rem;
      overflow: hidden;
      color: var(--cp-muted);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #cp-editor .cp-main {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      gap: clamp(0.375rem, 1.2vmin, 1.125rem);
      padding: clamp(0.375rem, 1.5vmin, 1.75rem);
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--cp-bg);
    }

    #cp-editor label {
      min-width: 0;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
    }

    #cp-editor input,
    #cp-editor textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--cp-border);
      border-radius: 0.5rem;
      outline: none;
      background: var(--cp-input-bg);
      color: inherit;
      font: inherit;
      font-weight: 400;
    }

    #cp-editor input:focus,
    #cp-editor textarea:focus {
      border-color: var(--cp-accent);
      box-shadow: 0 0 0 0.125rem var(--cp-accent-ring);
    }

    #cp-editor textarea {
      flex: 1;
      min-height: 6em;
      resize: vertical;
      line-height: 1.55;
    }

    #cp-editor .cp-information-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #cp-editor .cp-information-count {
      color: var(--cp-muted);
      font-size: 0.75rem;
      font-weight: 400;
      font-variant-numeric: tabular-nums;
    }

    #cp-editor .cp-information-label {
      flex: 1 0 auto;
      min-height: 8em;
    }

    #cp-editor .cp-footer {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.875rem;
    }

    div[role="dialog"]:has(> #cp-editor) .cp-status {
      display: inline-block;
      margin-left: 0.75em;
      min-width: 0;
      max-width: 40%;
      overflow: hidden;
      color: var(--cp-muted);
      font-size: 0.7em;
      font-weight: 400;
      text-overflow: ellipsis;
      vertical-align: middle;
      white-space: nowrap;
    }

    #cp-editor .cp-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      width: 100%;
      gap: 0.5rem;
    }

    #cp-editor .cp-button,
    #cp-editor .cp-add {
      border: 0;
      border-radius: 0.5rem;
      color: inherit;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    #cp-editor .cp-button {
      padding: 0.6875rem 1rem;
      background-color: var(--cp-neutral-button) !important;
      color: var(--cp-text) !important;
    }

    #cp-editor .cp-button:hover {
      background-color: var(--cp-neutral-button-hover) !important;
    }

    #cp-editor .cp-button.is-primary,
    #cp-editor .cp-add {
      background-color: var(--cp-accent) !important;
      color: #fff !important;
    }

    #cp-editor .cp-button.is-primary:hover,
    #cp-editor .cp-add:hover {
      background-color: var(--cp-accent-hover) !important;
    }

    #cp-editor .cp-button.is-danger {
      background-color: var(--cp-danger) !important;
      color: #fff !important;
    }

    #cp-editor .cp-button.is-danger:hover {
      background-color: var(--cp-danger-hover) !important;
    }

    #cp-editor .cp-add {
      width: 2em;
      height: 2em;
      font-size: 1.4375rem;
    }

    #cp-editor button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #cp-editor[aria-busy="true"] button:disabled {
      cursor: wait;
    }

    /* 좁은 화면에서도 좌우 2패널 유지. 여백을 줄여 편집 폭을 우선 확보한다. */
    @media (max-width: 47.5rem) {
      /* 모바일에서는 정렬 목록이 좁은 버튼 열에 갇히지 않게 패널 왼쪽에 맞춘다. */
      #cp-editor .cp-sort-menu { right: auto; left: 0; }
      #cp-editor .cp-sidebar { flex-basis: 34%; width: 34%; }
      #cp-editor .cp-sidebar-header { gap: 0.2rem; padding: 0.25rem; }
      #cp-editor .cp-sidebar-header .cp-search {
        height: 2rem;
        padding: 0.2rem;
        font-size: 1rem;
      }
      #cp-editor .cp-sort,
      #cp-editor .cp-sidebar-header .cp-add {
        flex-basis: 1.5rem;
        width: 1.5rem;
        height: 2rem;
      }
      #cp-editor .cp-sort svg { width: 1em; height: 1em; }
      #cp-editor .cp-list { padding: 0.25rem; }
      #cp-editor .cp-item-select { padding: 0.5rem 1.5rem 0.5rem 0.375rem; }
      #cp-editor .cp-item-title { flex-wrap: wrap; gap: 0.25rem; font-size: 0.8rem; }
      #cp-editor .cp-delete { top: 0.15rem; right: 0; width: 1.5rem; height: 1.75rem; }
      #cp-editor .cp-main { padding: 0.375rem; gap: 0.375rem; }
      #cp-editor label { gap: 0.25rem; }
      #cp-editor input, #cp-editor textarea { padding: 0.375rem; font-size: 1rem; }
      #cp-editor .cp-actions { flex-wrap: wrap; gap: 0.25rem; }
      #cp-editor .cp-actions .cp-button {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0.5rem 0.25rem;
        font-size: 0.8rem;
      }
    }

  `;

  // ── 사이트 팝업 식별 및 인증 세션 읽기 (저장하지 않음) ──
  function installStyle() {
    if (document.getElementById('cp-editor-style')) return;

    const style = document.createElement('style');
    style.id = 'cp-editor-style';
    style.textContent = STYLE;
    document.head.append(style);
  }

  function findProfileDialog() {
    return [...document.querySelectorAll('[role="dialog"]')].find((dialog) => {
      return dialog.querySelector('h2')?.textContent.trim() === DIALOG_TITLE;
    });
  }

  function getChatId() {
    return location.pathname.match(/\/episodes\/([a-f0-9]+)/i)?.[1] ?? null;
  }

  function getAccessToken() {
    return document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1] ?? null;
  }

  function unwrapData(response) {
    return response?.data ?? response;
  }

  // ── API 통신: 브라우저 HTTP 캐시를 사용하거나 남기지 않음 ──
  async function apiRequest(baseUrl, method, path, body) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('로그인 세션을 찾지 못했습니다.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          platform: 'web',
          'wrtn-locale': 'ko-KR',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

      const text = await response.text();
      let responseBody = null;

      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch (_) {
          responseBody = text;
        }
      }

      if (!response.ok) {
        const serverMessage = responseBody?.message ?? responseBody?.data?.message;
        throw new Error(serverMessage || `API 요청 실패 (${response.status})`);
      }

      return responseBody;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('API 응답 시간이 초과되었습니다.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function profileRequest(method, path, body) {
    return apiRequest(PROFILE_API_BASE, method, path, body);
  }

  function chatRequest(method, path, body) {
    return apiRequest(CHAT_API_BASE, method, path, body);
  }

  // ── 원본 데이터 조회: 매번 API 응답에서만 구성 ──
  async function loadAccountProfileId() {
    const response = await profileRequest('GET', '/profiles');
    const profile = unwrapData(response);
    const profileId = profile?._id ?? profile?.id;

    if (!profileId) {
      throw new Error('계정 프로필 ID를 가져오지 못했습니다.');
    }

    return profileId;
  }

  async function loadChatProfiles(profileId) {
    const response = await profileRequest(
      'GET',
      `/profiles/${profileId}/chat-profiles`,
    );
    const data = unwrapData(response);
    const profiles = data?.chatProfiles ?? data;

    if (!Array.isArray(profiles)) {
      throw new Error('대화 프로필 목록 응답 형식이 올바르지 않습니다.');
    }

    return profiles.map((profile) => ({
      id: profile._id ?? profile.id,
      name: profile.name ?? '',
      information: profile.information ?? '',
      createdAt: profile.createdAt ?? null,
      updatedAt: profile.updatedAt ?? null,
      current: false,
      isRepresentative: Boolean(profile.isRepresentative),
    }));
  }

  async function loadCurrentChatProfileId() {
    const chatId = getChatId();
    if (!chatId) {
      throw new Error('대화 ID를 찾지 못했습니다.');
    }

    const response = await chatRequest('GET', `/v3/chats/${chatId}`);
    const chat = unwrapData(response);
    return chat?.chatProfile?._id ?? null;
  }

  async function loadProfileState() {
    const profileId = await loadAccountProfileId();
    const [profiles, currentProfileId] = await Promise.all([
      loadChatProfiles(profileId),
      loadCurrentChatProfileId(),
    ]);

    profiles.forEach((profile) => {
      profile.current = profile.id === currentProfileId;
    });

    return { profileId, profiles, currentProfileId };
  }

  // ── 기존 목록은 숨기기만 하며 원본 데이터로 읽지 않음 ──
  function hideNativeProfileList(dialog) {
    const firstCard = dialog.querySelector(SELECTORS.nativeCard);
    const nativeBody = firstCard?.closest('div.px-5.py-1')
      ?? firstCard?.parentElement?.parentElement;

    if (!nativeBody) return;

    nativeBody.style.cssText = [
      'position:absolute!important',
      'inset:0!important',
      'width:0!important',
      'height:0!important',
      'overflow:hidden!important',
      'display:block!important',
      'visibility:hidden!important',
      'pointer-events:none!important',
    ].join(';');
  }

  function escapeHtml(value) {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return String(value).replace(/[&<>"']/g, (character) => {
      return replacements[character];
    });
  }

  // ── 검색 및 정렬: 날짜 누락 항목은 양방향 모두 마지막에 배치 ──
  const SORT_OPTIONS = [
    { value: 'created-asc', label: '생성일자 오름차순', field: 'createdAt', direction: 1 },
    { value: 'created-desc', label: '생성일자 내림차순', field: 'createdAt', direction: -1 },
    { value: 'updated-asc', label: '마지막수정일 오름차순', field: 'updatedAt', direction: 1 },
    { value: 'updated-desc', label: '마지막수정일 내림차순', field: 'updatedAt', direction: -1 },
    { value: 'name', label: '이름순 (가나다순)' },
  ];

  function getVisibleProfiles(profiles, query, sortMode) {
    const keyword = query.trim().normalize('NFC').toLocaleLowerCase('ko');
    const option = SORT_OPTIONS.find((item) => item.value === sortMode)
      ?? SORT_OPTIONS.find((item) => item.value === DEFAULT_SORT_MODE);
    const byName = (a, b) => a.name.localeCompare(b.name, 'ko');
    return profiles.filter((profile) => [profile.name, profile.information].some((text) => {
      return text.normalize('NFC').toLocaleLowerCase('ko').includes(keyword);
    })).sort((a, b) => {
      if (!option.field) return byName(a, b);
      const left = Date.parse(a[option.field]);
      const right = Date.parse(b[option.field]);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return Number(!Number.isFinite(left)) - Number(!Number.isFinite(right)) || byName(a, b);
      }
      return (left - right) * option.direction || byName(a, b);
    });
  }

  // ── 편집기 마크업 ──
  function createEditorMarkup() {
    return `
      <aside class="cp-sidebar">
        <div class="cp-sidebar-header">
          <input class="cp-search" type="search" placeholder="이름·내용 검색" aria-label="프로필 이름과 내용 검색" autocomplete="off">
          <button class="cp-sort" type="button" title="정렬: ${SORT_OPTIONS.find((option) => option.value === DEFAULT_SORT_MODE).label}" aria-label="프로필 정렬" aria-expanded="false" aria-controls="cp-sort-menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h12M4 12h8M4 18h4M18 10v10m-3-3 3 3 3-3"/></svg>
          </button>
          <button class="cp-add" type="button" title="프로필 추가" aria-label="프로필 추가">+</button>
          <div id="cp-sort-menu" class="cp-sort-menu" role="group" aria-label="정렬 기준" hidden>
            ${SORT_OPTIONS.map((option) => `
              <button type="button" data-sort="${option.value}" aria-pressed="${option.value === DEFAULT_SORT_MODE}">${option.label}</button>
            `).join('')}
          </div>
        </div>
        <div class="cp-list"></div>
      </aside>
      <main class="cp-main">
        <label>
          이름
          <input class="cp-name" maxlength="12" placeholder="나의 이름">
        </label>
        <label class="cp-information-label">
          <span class="cp-information-heading">
            <span>정보</span>
            <span class="cp-information-count">0/500</span>
          </span>
          <textarea class="cp-information" maxlength="500" placeholder="나이, 성별, 외형 등"></textarea>
        </label>
        <div class="cp-footer">
          <div class="cp-actions">
            <button class="cp-button cp-use" type="button">이 프로필 사용</button>
            <button class="cp-button cp-save is-primary" type="button">적용</button>
          </div>
        </div>
      </main>
    `;
  }

  // ── 팝업별 임시 상태: 닫으면 폐기하며 재개방 시 새로 조회 ──
  async function enhanceDialog(dialog) {
    if (dialog.querySelector('#cp-editor')) return;

    hideNativeProfileList(dialog);

    const root = document.createElement('section');
    root.id = 'cp-editor';
    root.innerHTML = createEditorMarkup();
    dialog.append(root);

    const status = document.createElement('span');
    status.className = 'cp-status';
    status.textContent = '프로필 정보를 불러오는 중...';
    dialog.querySelector('h2')?.insertAdjacentElement('afterend', status);

    const list = root.querySelector('.cp-list');
    const searchInput = root.querySelector('.cp-search');
    const sortButton = root.querySelector('.cp-sort');
    const sortMenu = root.querySelector('.cp-sort-menu');
    const nameInput = root.querySelector('.cp-name');
    const informationInput = root.querySelector('.cp-information');
    const addButton = root.querySelector('.cp-add');
    const useButton = root.querySelector('.cp-use');
    const informationCount = root.querySelector('.cp-information-count');
    const saveButton = root.querySelector('.cp-save');

    let accountProfileId = null;
    let profiles = [];
    let selected = null;
    let busy = true;
    let sortMode = DEFAULT_SORT_MODE;

    function setStatus(message, _isError = false) {
      status.textContent = message;
    }

    function setBusy(nextBusy) {
      busy = nextBusy;
      render({ syncForm: false });
    }

    function updateInformationCount() {
      informationCount.textContent = `${informationInput.value.length}/${informationInput.maxLength}`;
    }

    informationInput.addEventListener('input', updateInformationCount);

    // 목록만 갱신하여 검색·정렬 시 편집 중 입력을 보존한다.
    function renderList() {
      const sortedProfiles = getVisibleProfiles(profiles, searchInput.value, sortMode);

      list.replaceChildren();

      for (const profile of sortedProfiles) {
        const item = document.createElement('div');
        item.className = `cp-item${profile === selected ? ' is-selected' : ''}`;
        const button = document.createElement('button');
        const currentBadge = profile.current
          ? '<span class="cp-current-badge">현재</span>'
          : '';

        button.type = 'button';
        button.className = 'cp-item-select';
        button.innerHTML = `
          <span class="cp-item-title">
            ${currentBadge}${escapeHtml(profile.name || '이름 없음')}
          </span>
          <span class="cp-preview">${escapeHtml(profile.information)}</span>
        `;
        button.disabled = busy;
        button.addEventListener('click', () => {
          selected = profile;
          render();
        });
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'cp-delete';
        deleteButton.textContent = '×';
        deleteButton.title = '프로필 삭제';
        deleteButton.setAttribute('aria-label', `${profile.name || '이름 없음'} 프로필 삭제`);
        deleteButton.disabled = busy || !profile.id || profile.current || !accountProfileId;
        deleteButton.addEventListener('click', () => deleteProfile(profile));
        item.append(button, deleteButton);
        list.append(item);
      }

      if (!sortedProfiles.length) {
        const empty = document.createElement('p');
        empty.className = 'cp-empty';
        empty.textContent = busy ? '불러오는 중...' : !accountProfileId
          ? '목록을 다시 열어 주세요.' : profiles.length ? '검색 결과가 없습니다.' : '프로필이 없습니다.';
        list.append(empty);
      }
    }

    function render({ syncForm = true } = {}) {
      root.setAttribute('aria-busy', String(busy));
      renderList();
      if (syncForm) {
        nameInput.value = selected?.name ?? '';
        informationInput.value = selected?.information ?? '';
        updateInformationCount();
      }
      nameInput.disabled = busy || !selected || !accountProfileId;
      informationInput.disabled = nameInput.disabled;
      addButton.disabled = busy || !accountProfileId;
      saveButton.disabled = busy || !selected || !accountProfileId;
      useButton.disabled = busy || !selected?.id || selected.current;
    }

    // 검색·정렬 설정은 이 팝업 안에서만 유지한다.
    searchInput.addEventListener('input', renderList);
    function positionSortMenu() {
      const header = sortButton.closest('.cp-sidebar-header');
      const dialogRect = dialog.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const buttonRect = sortButton.getBoundingClientRect();
      const desiredRight = Math.max(0, headerRect.right - buttonRect.right);
      const availableRight = Math.max(0, headerRect.right - dialogRect.left - sortMenu.offsetWidth);
      header.style.setProperty('--cp-sort-menu-right', `${Math.min(desiredRight, availableRight)}px`);
    }
    function closeSortMenu() {
      sortMenu.hidden = true;
      sortButton.setAttribute('aria-expanded', 'false');
    }
    sortButton.addEventListener('click', () => {
      sortMenu.hidden = !sortMenu.hidden;
      sortButton.setAttribute('aria-expanded', String(!sortMenu.hidden));
      if (!sortMenu.hidden) {
        positionSortMenu();
        sortMenu.querySelector('[aria-pressed="true"]').focus();
      }
    });
    sortMenu.addEventListener('click', (event) => {
      const button = event.target.closest('[data-sort]');
      if (!button) return;
      sortMode = button.dataset.sort;
      sortMenu.querySelectorAll('[data-sort]').forEach((item) => {
        item.setAttribute('aria-pressed', String(item.dataset.sort === sortMode));
      });
      sortButton.title = '정렬: ' + button.textContent;
      closeSortMenu();
      sortButton.focus();
      renderList();
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !sortMenu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeSortMenu();
        sortButton.focus();
      }
    });
    root.addEventListener('click', (event) => {
      if (!event.target.closest('.cp-sidebar-header')) closeSortMenu();
    });

    // API 응답으로 목록을 교체하고 선택 항목만 이어받는다.
    async function refresh({ preserveSelection = false } = {}) {
      const previousId = preserveSelection ? selected?.id : null;
      const previousName = preserveSelection ? selected?.name : null;
      const state = await loadProfileState();
      if (!root.isConnected || dialog.dataset.state === 'closed' || dialog.hidden) return;

      accountProfileId = state.profileId;
      profiles = state.profiles;
      selected = profiles.find((profile) => profile.id === previousId)
        ?? profiles.find((profile) => profile.name === previousName)
        ?? profiles.find((profile) => profile.current)
        ?? profiles[0]
        ?? null;

      render();
    }

    // ── 기존 추가·사용·저장·삭제 동작 ──
    addButton.addEventListener('click', () => {
      selected = {
        id: null,
        name: '',
        information: '',
        current: false,
        isNew: true,
      };

      render();
      nameInput.focus();
      setStatus('새 프로필을 입력한 뒤 적용을 누르세요.');
    });

    useButton.addEventListener('click', async () => {
      if (!selected?.id) return;

      const chatId = getChatId();
      if (!chatId) {
        setStatus('대화 ID를 찾지 못했습니다.', true);
        return;
      }

      setBusy(true);
      setStatus('프로필을 변경하는 중...');

      try {
        await chatRequest(
          'PATCH',
          `/v3/chats/${chatId}`,
          { chatProfileId: selected.id },
        );
        await refresh();
        setStatus('현재 프로필을 변경했습니다.');
      } catch (error) {
        console.error('[대화 프로필 편집기] 프로필 변경 실패', error);
        setStatus(`프로필 변경 실패: ${error.message}`, true);
      } finally {
        setBusy(false);
      }
    });

    saveButton.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const information = informationInput.value;

      if (!name) {
        setStatus('이름을 입력해 주세요.', true);
        return;
      }

      if (!accountProfileId) {
        setStatus('계정 프로필 ID가 없습니다. 목록을 다시 열어 주세요.', true);
        return;
      }

      setBusy(true);
      setStatus('저장 중...');

      try {
        const payload = { name, information };

        if (selected?.isNew) {
          await profileRequest(
            'POST',
            `/profiles/${accountProfileId}/chat-profiles`,
            payload,
          );
        } else if (selected?.id) {
          await profileRequest(
            'PATCH',
            `/profiles/${accountProfileId}/chat-profiles/${selected.id}`,
            payload,
          );
        } else {
          throw new Error('수정할 프로필 ID를 찾지 못했습니다.');
        }

        selected = { ...selected, name, information };
        await refresh({ preserveSelection: true });
        setStatus('프로필 정보를 저장했습니다.');
      } catch (error) {
        console.error('[대화 프로필 편집기] 저장 실패', error);
        setStatus(`저장 실패: ${error.message}`, true);
      } finally {
        setBusy(false);
      }
    });

    async function deleteProfile(profile) {
      if (busy || !profile?.id || profile.current || !accountProfileId) return;
      if (!confirm(`'${profile.name}' 프로필을 삭제할까요?`)) return;

      setBusy(true);
      setStatus('삭제 중...');

      try {
        await profileRequest(
          'DELETE',
          `/profiles/${accountProfileId}/chat-profiles/${profile.id}`,
        );
        await refresh();
        setStatus('프로필을 삭제했습니다.');
      } catch (error) {
        console.error('[대화 프로필 편집기] 삭제 실패', error);
        setStatus(`삭제 실패: ${error.message}`, true);
      } finally {
        setBusy(false);
      }
    }

    render();

    try {
      await refresh();
      setStatus('현재 적용 중인 프로필을 선택했습니다.');
    } catch (error) {
      console.error('[대화 프로필 편집기] 불러오기 실패', error);
      setStatus(`프로필 불러오기 실패: ${error.message}`, true);
    } finally {
      setBusy(false);
    }
  }

  // ── 팝업 배치: PC는 기존 여백, 모바일은 실제 표시 영역을 가득 사용 ──
  function updateDialogInset(dialog) {
    const viewport = window.visualViewport;
    const viewTop = viewport?.offsetTop ?? 0;
    const viewHeight = viewport?.height ?? window.innerHeight;
    const viewLeft = viewport?.offsetLeft ?? 0;
    const viewWidth = viewport?.width ?? document.documentElement.clientWidth;
    const siteTop = dialog.closest('main')?.getBoundingClientRect().top ?? 0;
    const contentTop = Math.max(viewTop, Math.min(Math.max(0, siteTop), viewTop + viewHeight));
    const contentHeight = Math.max(0, viewTop + viewHeight - contentTop);
    const isMobile = window.matchMedia('(max-width: 47.5rem)').matches;

    // PC는 기존 94% × 92% 크기를 복원하고 모바일만 여백 없이 채운다.
    const inlineMargin = isMobile ? 0 : viewWidth * 0.03;
    const blockMargin = isMobile ? 0 : contentHeight * 0.02;
    const geometry = {
      '--cp-dialog-top': contentTop + blockMargin,
      '--cp-dialog-left': viewLeft + inlineMargin,
      '--cp-dialog-width': Math.max(0, viewWidth - inlineMargin * 2),
      '--cp-dialog-height': Math.max(0, contentHeight - blockMargin * 2),
    };
    // px는 직접적인 수치 명시 대신 브라우저가 측정한 CSS 좌표의 단위다.
    for (const [property, value] of Object.entries(geometry)) {
      dialog.style.setProperty(property, value + 'px');
    }
  }

  // ── 팝업 생명주기: 숨김/닫힘 시 이전 편집기를 폐기 ──
  function initialize() {
    installStyle();
    function syncDialog() {
      const dialog = findProfileDialog();
      if (!dialog) return;
      if (dialog.dataset.state === 'closed' || dialog.hidden) {
        dialog.querySelector('#cp-editor')?.remove();
        dialog.querySelector('.cp-status')?.remove();
        return;
      }
      updateDialogInset(dialog);
      hideNativeProfileList(dialog);
      if (!dialog.querySelector('#cp-editor')) enhanceDialog(dialog);
    }
    const observer = new MutationObserver(syncDialog);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'hidden'],
    });
    // 입력 중에는 데이터나 폼을 다시 그리지 않고 위치·높이만 갱신한다.
    function syncViewport() {
      const dialog = findProfileDialog();
      if (dialog?.querySelector('#cp-editor')) updateDialogInset(dialog);
    }
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    syncDialog();
  }

  initialize();
})();
