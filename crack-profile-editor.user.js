// ==UserScript==
// @name         크랙 대화 프로필 편집기
// @namespace    https://crack.wrtn.ai/
// @version      1.0.0
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

  const SELECTORS = {
    nativeCard: 'div.flex.flex-col.p-4.gap-2.rounded-lg',
    nativeName: 'span.text-text_primary',
    nativeInformation: 'p',
  };

  const STYLE = `
    div[role="dialog"]:has(> #cp-editor) {
      width: 94vw !important;
      max-width: none !important;
      height: 92vh !important;
      height: 92dvh !important;
    }

    #cp-editor {
      display: flex;
      height: 90%;
      min-height: 0;
      border-top: 1px solid var(--border, #3d3d3d);
      color: var(--text-text_primary, #f5f5f5);
    }

    #cp-editor * {
      box-sizing: border-box;
    }

    #cp-editor .cp-sidebar {
      display: flex;
      flex: 0 0 32%;
      flex-direction: column;
      width: 32%;
      border-right: 1px solid var(--border, #3d3d3d);
      background: var(--surface-tertiary, #242424);
    }

    #cp-editor .cp-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 8%;
      padding: 0 16px;
      border-bottom: 1px solid var(--border, #3d3d3d);
      font-weight: 700;
    }

    #cp-editor .cp-list {
      flex: 1;
      overflow: auto;
      padding: 12px;
    }

    #cp-editor .cp-item {
      width: 100%;
      margin: 0 0 8px;
      padding: 12px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: var(--background, #171717);
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    #cp-editor .cp-item:hover {
      filter: brightness(1.14);
    }

    #cp-editor .cp-item.is-selected {
      border-color: var(--outline-primary, #8b5cf6);
      box-shadow: 0 0 0 1px var(--outline-primary, #8b5cf6);
    }

    #cp-editor .cp-item-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
    }

    #cp-editor .cp-current-badge {
      padding: 2px 5px;
      border-radius: 4px;
      background: var(--surface-chat-primary, #7c3aed);
      color: #fff;
      font-size: 11px;
    }

    #cp-editor .cp-preview {
      display: block;
      margin-top: 7px;
      overflow: hidden;
      color: var(--text-text_secondary, #aaa);
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #cp-editor .cp-main {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      gap: 18px;
      padding: 28px;
      background: var(--background, #171717);
    }

    #cp-editor label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
    }

    #cp-editor input,
    #cp-editor textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--input, #555);
      border-radius: 8px;
      outline: none;
      background: var(--surface-tertiary, #242424);
      color: inherit;
      font: inherit;
      font-weight: 400;
    }

    #cp-editor input:focus,
    #cp-editor textarea:focus {
      border-color: var(--ring, #8b5cf6);
      box-shadow: 0 0 0 2px #8b5cf655;
    }

    #cp-editor textarea {
      flex: 1;
      min-height: 35%;
      resize: vertical;
      line-height: 1.55;
    }

    #cp-editor .cp-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 14px;
    }

    div[role="dialog"]:has(> #cp-editor) .cp-status {
      display: inline-block;
      margin-left: 0.75em;
      min-width: 0;
      max-width: 40%;
      overflow: hidden;
      color: var(--text-text_tertiary, #999);
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
      gap: 8px;
    }

    #cp-editor .cp-button,
    #cp-editor .cp-add {
      border: 0;
      border-radius: 8px;
      color: inherit;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    #cp-editor .cp-button {
      padding: 11px 16px;
      background: var(--surface-tertiary, #333);
    }

    #cp-editor .cp-button.is-primary,
    #cp-editor .cp-add {
      background: var(--primary, #7c3aed);
      color: #fff;
    }

    #cp-editor .cp-button.is-danger {
      background: #991b1b;
      color: #fff;
    }

    #cp-editor .cp-add {
      width: 2em;
      height: 2em;
      font-size: 23px;
    }

    #cp-editor button:disabled {
      opacity: 0.5;
      cursor: wait;
    }

    @media (max-width: 47.5rem) {
      div[role="dialog"]:has(> #cp-editor) {
        width: 96vw !important;
        height: 96vh !important;
        height: 96dvh !important;
      }

      #cp-editor {
        min-height: 0;
        flex-direction: row;
      }

      #cp-editor .cp-sidebar {
        flex: 0 0 34%;
        width: 34%;
      }

      #cp-editor .cp-main {
        padding: 18px;
      }

      #cp-editor .cp-actions {
        flex-wrap: nowrap;
      }

      #cp-editor .cp-actions .cp-button {
        flex: 1 1 0;
        min-width: 0;
        padding-right: 2%;
        padding-left: 2%;
        font-size: 0.75em;
      }
    }
  `;

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

  function readNativeProfiles(dialog) {
    return [...dialog.querySelectorAll(SELECTORS.nativeCard)].map((card) => {
      const nameNodes = [...card.querySelectorAll(SELECTORS.nativeName)];
      const current = card.classList.contains('border-outline_primary')
        || [...card.querySelectorAll('span')].some((span) => {
          return span.textContent.trim() === '현재';
        });

      return {
        id: null,
        name: nameNodes.at(-1)?.textContent.trim() || '이름 없음',
        information: card.querySelector(SELECTORS.nativeInformation)?.textContent.trim() || '',
        current,
      };
    });
  }

  function hideNativeProfileList(dialog) {
    const firstCard = dialog.querySelector(SELECTORS.nativeCard);
    const nativeBody = firstCard?.closest('div.px-5.py-1')
      ?? firstCard?.parentElement?.parentElement;

    if (!nativeBody) return;

    nativeBody.style.cssText = [
      'position:fixed!important',
      'left:-100000px!important',
      'top:0!important',
      'width:40vw!important',
      'height:50vh!important',
      'display:block!important',
      'visibility:visible!important',
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

  function createEditorMarkup() {
    return `
      <aside class="cp-sidebar">
        <div class="cp-sidebar-header">
          <span>대화 프로필</span>
          <button class="cp-add" type="button" title="프로필 추가">+</button>
        </div>
        <div class="cp-list"></div>
      </aside>
      <main class="cp-main">
        <label>
          이름
          <input class="cp-name" maxlength="12" placeholder="나의 이름">
        </label>
        <label style="flex: 1">
          정보
          <textarea class="cp-information" maxlength="500" placeholder="나이, 성별, 외형 등"></textarea>
        </label>
        <div class="cp-footer">
          <div class="cp-actions">
            <button class="cp-button cp-use" type="button">이 프로필 사용</button>
            <button class="cp-button cp-delete is-danger" type="button">삭제</button>
            <button class="cp-button cp-save is-primary" type="button">적용</button>
          </div>
        </div>
      </main>
    `;
  }

  async function enhanceDialog(dialog) {
    if (dialog.querySelector('#cp-editor')) return;

    const nativeProfiles = readNativeProfiles(dialog);
    if (!nativeProfiles.length) return;

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
    const nameInput = root.querySelector('.cp-name');
    const informationInput = root.querySelector('.cp-information');
    const addButton = root.querySelector('.cp-add');
    const useButton = root.querySelector('.cp-use');
    const deleteButton = root.querySelector('.cp-delete');
    const saveButton = root.querySelector('.cp-save');

    let accountProfileId = null;
    let profiles = nativeProfiles;
    let selected = profiles.find((profile) => profile.current) ?? profiles[0];
    let busy = false;

    function setStatus(message, _isError = false) {
      status.textContent = message;
    }

    function setBusy(nextBusy) {
      busy = nextBusy;
      render();
    }

    function render() {
      const sortedProfiles = [...profiles].sort((left, right) => {
        return Number(right.current) - Number(left.current)
          || left.name.localeCompare(right.name, 'ko');
      });

      list.replaceChildren();

      for (const profile of sortedProfiles) {
        const button = document.createElement('button');
        const currentBadge = profile.current
          ? '<span class="cp-current-badge">현재</span>'
          : '';

        button.type = 'button';
        button.className = `cp-item${profile === selected ? ' is-selected' : ''}`;
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
        list.append(button);
      }

      nameInput.value = selected?.name ?? '';
      informationInput.value = selected?.information ?? '';

      addButton.disabled = busy;
      saveButton.disabled = busy;
      useButton.disabled = busy || !selected?.id || selected.current;
      deleteButton.disabled = busy || !selected?.id || selected.current;
    }

    async function refresh({ preserveSelection = false } = {}) {
      const previousId = preserveSelection ? selected?.id : null;
      const previousName = preserveSelection ? selected?.name : null;
      const state = await loadProfileState();

      accountProfileId = state.profileId;
      profiles = state.profiles;
      selected = profiles.find((profile) => profile.id === previousId)
        ?? profiles.find((profile) => profile.name === previousName)
        ?? profiles.find((profile) => profile.current)
        ?? profiles[0]
        ?? null;

      render();
    }

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

    deleteButton.addEventListener('click', async () => {
      if (!selected?.id || !accountProfileId) return;
      if (!confirm(`'${selected.name}' 프로필을 삭제할까요?`)) return;

      setBusy(true);
      setStatus('삭제 중...');

      try {
        await profileRequest(
          'DELETE',
          `/profiles/${accountProfileId}/chat-profiles/${selected.id}`,
        );
        await refresh();
        setStatus('프로필을 삭제했습니다.');
      } catch (error) {
        console.error('[대화 프로필 편집기] 삭제 실패', error);
        setStatus(`삭제 실패: ${error.message}`, true);
      } finally {
        setBusy(false);
      }
    });

    render();

    try {
      await refresh();
      setStatus('현재 적용 중인 프로필을 선택했습니다.');
    } catch (error) {
      console.error('[대화 프로필 편집기] 불러오기 실패', error);
      setStatus(`프로필 불러오기 실패: ${error.message}`, true);
    }
  }

  function initialize() {
    installStyle();

    const observer = new MutationObserver(() => {
      const dialog = findProfileDialog();
      if (dialog && !dialog.querySelector('#cp-editor')) {
        enhanceDialog(dialog);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const dialog = findProfileDialog();
    if (dialog) enhanceDialog(dialog);
  }

  initialize();
})();
