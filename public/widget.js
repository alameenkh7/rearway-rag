;(function () {
  'use strict'

  // ─── Read config from the script tag ────────────────────────────────────────
  var scriptTag = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script')
      return scripts[scripts.length - 1]
    })()

  var BOT_ID = scriptTag.getAttribute('data-bot-id') || ''
  var COMPANY = scriptTag.getAttribute('data-company') || 'Assistant'
  var EMBED_TOKEN = scriptTag.getAttribute('data-embed-token') || ''

  // Derive the API base from the script src so the widget works in any env
  // e.g. https://resolve.rearway.com/widget/widget.js  →  https://resolve.rearway.com
  var scriptSrc = scriptTag.src || ''
  var API_BASE = scriptSrc.replace(/\/widget\/widget\.js.*$/, '')
  if (!API_BASE) {
    API_BASE = window.location.origin
  }

  // Issued by POST /bots/:botId/session on load — no longer client-generated
  var SESSION_ID = ''
  var SESSION_TOKEN = ''

  // ─── Create Shadow DOM host ──────────────────────────────────────────────────
  var host = document.createElement('div')
  host.id = 'resolve-widget-host'
  host.style.cssText = 'position:fixed;z-index:2147483647;bottom:24px;right:24px;'
  document.body.appendChild(host)

  var shadow = host.attachShadow({ mode: 'open' })

  // ─── Styles (scoped inside Shadow DOM — zero bleed) ─────────────────────────
  var style = document.createElement('style')
  style.textContent = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

    /* ── Bubble ── */
    #rw-bubble{
      width:56px;height:56px;border-radius:50%;
      background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
      box-shadow:0 4px 16px rgba(99,102,241,.45);
      cursor:pointer;border:none;outline:none;
      display:flex;align-items:center;justify-content:center;
      transition:transform .2s ease,box-shadow .2s ease;
      position:relative;
    }
    #rw-bubble:hover{
      transform:scale(1.08);
      box-shadow:0 6px 22px rgba(99,102,241,.55);
    }
    #rw-bubble svg{transition:opacity .2s,transform .2s;}
    #rw-bubble .icon-chat{position:absolute;}
    #rw-bubble .icon-close{position:absolute;opacity:0;transform:rotate(-90deg);}
    #rw-bubble.open .icon-chat{opacity:0;transform:rotate(90deg);}
    #rw-bubble.open .icon-close{opacity:1;transform:rotate(0);}

    /* ── Panel ── */
    #rw-panel{
      position:absolute;bottom:68px;right:0;
      width:370px;height:520px;
      background:#ffffff;
      border-radius:16px;
      box-shadow:0 8px 40px rgba(15,23,42,.18);
      display:flex;flex-direction:column;overflow:hidden;
      transform:translateY(20px) scale(.96);
      opacity:0;pointer-events:none;
      transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s ease;
    }
    #rw-panel.open{
      transform:translateY(0) scale(1);
      opacity:1;pointer-events:all;
    }

    /* ── Header ── */
    #rw-header{
      background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
      padding:14px 16px;
      display:flex;align-items:center;gap:10px;
      flex-shrink:0;
    }
    #rw-avatar{
      width:36px;height:36px;border-radius:50%;
      background:rgba(255,255,255,.25);
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
    }
    #rw-header-text{flex:1;min-width:0;}
    #rw-header-name{
      color:#fff;font-weight:600;font-size:.9rem;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    }
    #rw-header-status{
      color:rgba(255,255,255,.75);font-size:.75rem;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    }
    #rw-status-dot{
      display:inline-block;width:7px;height:7px;border-radius:50%;
      background:#4ade80;margin-right:4px;vertical-align:middle;
    }

    /* ── Messages ── */
    #rw-messages{
      flex:1;overflow-y:auto;padding:16px;
      display:flex;flex-direction:column;gap:10px;
      scroll-behavior:smooth;
    }
    #rw-messages::-webkit-scrollbar{width:4px;}
    #rw-messages::-webkit-scrollbar-track{background:transparent;}
    #rw-messages::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}

    .rw-msg{
      max-width:82%;
      padding:10px 13px;
      border-radius:14px;
      font-size:.875rem;line-height:1.5;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      word-break:break-word;
      animation:rw-fade-in .2s ease;
    }
    @keyframes rw-fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

    .rw-msg.bot{
      align-self:flex-start;
      background:#f1f5f9;color:#1e293b;
      border-bottom-left-radius:4px;
    }
    .rw-msg.user{
      align-self:flex-end;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      color:#fff;
      border-bottom-right-radius:4px;
    }
    .rw-msg.fallback{
      align-self:flex-start;
      background:#fff7ed;color:#7c2d12;
      border:1px solid #fed7aa;
      border-bottom-left-radius:4px;
    }
    .rw-msg.fallback a{color:#c2410c;font-weight:600;}

    /* ── Typing indicator ── */
    #rw-typing{
      align-self:flex-start;
      background:#f1f5f9;
      padding:10px 14px;border-radius:14px;border-bottom-left-radius:4px;
      display:none;gap:4px;align-items:center;
    }
    #rw-typing.visible{display:flex;}
    .rw-dot{
      width:7px;height:7px;border-radius:50%;background:#94a3b8;
      animation:rw-bounce .9s infinite ease-in-out;
    }
    .rw-dot:nth-child(2){animation-delay:.15s;}
    .rw-dot:nth-child(3){animation-delay:.3s;}
    @keyframes rw-bounce{
      0%,80%,100%{transform:translateY(0)}
      40%{transform:translateY(-6px)}
    }

    /* ── Input area ── */
    #rw-input-area{
      padding:12px;border-top:1px solid #f1f5f9;
      display:flex;gap:8px;align-items:flex-end;
      flex-shrink:0;
    }
    #rw-input{
      flex:1;border:1.5px solid #e2e8f0;border-radius:10px;
      padding:9px 12px;font-size:.875rem;resize:none;
      outline:none;max-height:100px;min-height:40px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      color:#1e293b;line-height:1.5;transition:border-color .2s;
    }
    #rw-input:focus{border-color:#6366f1;}
    #rw-input::placeholder{color:#94a3b8;}
    #rw-send{
      width:38px;height:38px;border-radius:10px;border:none;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      color:#fff;cursor:pointer;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      transition:opacity .2s,transform .15s;
    }
    #rw-send:hover{opacity:.9;transform:scale(1.05);}
    #rw-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}

    /* ── Powered by ── */
    #rw-footer{
      text-align:center;padding:6px 0 8px;
      font-size:.7rem;color:#cbd5e1;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      flex-shrink:0;
    }
    #rw-footer a{color:#a5b4fc;text-decoration:none;}
    #rw-footer a:hover{text-decoration:underline;}

    /* ── Mobile (<480px) ── */
    @media(max-width:480px){
      #rw-panel{
        width:calc(100vw - 32px);
        right:calc(-24px + 16px);
        bottom:68px;
      }
    }
  `
  shadow.appendChild(style)

  // ─── HTML structure ──────────────────────────────────────────────────────────
  var container = document.createElement('div')
  container.innerHTML = `
    <button id="rw-bubble" aria-label="Open chat" aria-expanded="false">
      <!-- Chat icon -->
      <svg class="icon-chat" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <!-- Close icon -->
      <svg class="icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <div id="rw-panel" role="dialog" aria-label="${COMPANY} chat assistant">
      <div id="rw-header">
        <div id="rw-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <div id="rw-header-text">
          <div id="rw-header-name">${COMPANY}</div>
          <div id="rw-header-status"><span id="rw-status-dot"></span>Online</div>
        </div>
      </div>

      <div id="rw-messages" aria-live="polite" aria-relevant="additions"></div>

      <div id="rw-typing" aria-hidden="true">
        <div class="rw-dot"></div>
        <div class="rw-dot"></div>
        <div class="rw-dot"></div>
      </div>

      <div id="rw-input-area">
        <textarea
          id="rw-input"
          placeholder="Ask me anything…"
          rows="1"
          aria-label="Your message"
        ></textarea>
        <button id="rw-send" aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <div id="rw-footer">
        Powered by <a href="https://rearway.com" target="_blank" rel="noopener">Resolve</a>
      </div>
    </div>
  `
  shadow.appendChild(container)

  // ─── Element references ──────────────────────────────────────────────────────
  var bubble = shadow.getElementById('rw-bubble')
  var panel = shadow.getElementById('rw-panel')
  var messages = shadow.getElementById('rw-messages')
  var typingEl = shadow.getElementById('rw-typing')
  var input = shadow.getElementById('rw-input')
  var sendBtn = shadow.getElementById('rw-send')

  // ─── State ───────────────────────────────────────────────────────────────────
  var isOpen = false
  var isBusy = false
  var welcomeShown = false

  // ─── Toggle panel ────────────────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen
    bubble.classList.toggle('open', isOpen)
    panel.classList.toggle('open', isOpen)
    bubble.setAttribute('aria-expanded', isOpen ? 'true' : 'false')

    if (isOpen && !welcomeShown) {
      welcomeShown = true
      // Welcome message — hardcoded, no API call (spec requirement)
      appendMessage('bot', 'Hi! I\'m ' + COMPANY + '\'s assistant. Ask me anything!')
      input.focus()
    }
  }

  bubble.addEventListener('click', togglePanel)

  // ─── Append a message bubble ─────────────────────────────────────────────────
  function appendMessage(role, text) {
    var el = document.createElement('div')
    el.className = 'rw-msg ' + role
    el.textContent = text
    messages.appendChild(el)
    messages.scrollTop = messages.scrollHeight
  }

  // Fallback message + contact email are admin-supplied, so this builds the
  // DOM via textContent/property assignment rather than string-concatenated
  // HTML, even though the mailto link itself is a nice-to-have, not user input.
  function appendFallbackMessage(text, contactEmail) {
    var el = document.createElement('div')
    el.className = 'rw-msg fallback'
    el.appendChild(document.createTextNode(text))
    if (contactEmail) {
      el.appendChild(document.createElement('br'))
      var link = document.createElement('a')
      link.href = 'mailto:' + contactEmail
      link.textContent = contactEmail
      el.appendChild(link)
    }
    messages.appendChild(el)
    messages.scrollTop = messages.scrollHeight
  }

  // ─── Typing indicator ────────────────────────────────────────────────────────
  function showTyping() {
    typingEl.classList.add('visible')
    messages.scrollTop = messages.scrollHeight
  }

  function hideTyping() {
    typingEl.classList.remove('visible')
  }

  // ─── Auto-resize textarea ────────────────────────────────────────────────────
  input.addEventListener('input', function () {
    this.style.height = 'auto'
    this.style.height = Math.min(this.scrollHeight, 100) + 'px'
  })

  // ─── Send on Enter (Shift+Enter = newline) ───────────────────────────────────
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  sendBtn.addEventListener('click', sendMessage)

  // ─── Start a chat session ────────────────────────────────────────────────────
  // Called once on script load, and again (once) if a chat call comes back
  // 401 with an expired/invalid session token.
  function startSession(callback) {
    var xhr = new XMLHttpRequest()
    xhr.open('POST', API_BASE + '/api/v1/bots/' + BOT_ID + '/session', true)
    xhr.setRequestHeader('X-Embed-Token', EMBED_TOKEN)
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText)
          SESSION_ID = data.data.sessionId
          SESSION_TOKEN = data.data.sessionToken
          callback(true)
        } catch (e) {
          callback(false)
        }
      } else {
        callback(false)
      }
    }
    xhr.onerror = function () {
      callback(false)
    }
    xhr.send()
  }

  // ─── Send message ────────────────────────────────────────────────────────────
  // Public entry point (click/Enter): reads + clears the input, then hands
  // the captured text to doSend. doSend takes text explicitly (rather than
  // re-reading input.value) so the 401-retry path resends the exact same
  // message after the input field has already been cleared.
  function sendMessage() {
    var text = input.value.trim()
    if (!text || isBusy) return

    appendMessage('user', text)
    input.value = ''
    input.style.height = 'auto'
    doSend(text, false)
  }

  function doSend(text, isRetry) {
    isBusy = true
    sendBtn.disabled = true
    showTyping()

    var payload = JSON.stringify({ message: text })

    var xhr = new XMLHttpRequest()
    xhr.open('POST', API_BASE + '/api/v1/bots/' + BOT_ID + '/chat', true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('X-Embed-Token', EMBED_TOKEN)
    xhr.setRequestHeader('Authorization', 'Bearer ' + SESSION_TOKEN)

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        hideTyping()
        isBusy = false
        sendBtn.disabled = false
        try {
          var data = JSON.parse(xhr.responseText)
          if (data.type === 'fallback') {
            appendFallbackMessage(data.fallback.message, data.fallback.contactEmail)
          } else {
            appendMessage('bot', data.answer || 'Sorry, I couldn\'t get a response.')
          }
        } catch (e) {
          appendMessage('bot', 'Sorry, something went wrong parsing the response.')
        }
        input.focus()
        return
      }

      if (xhr.status === 401 && !isRetry) {
        // Session token expired/invalid — get a fresh one and retry this
        // exact message once before giving up.
        isBusy = false
        startSession(function (ok) {
          if (ok) {
            doSend(text, true)
          } else {
            hideTyping()
            sendBtn.disabled = false
            appendMessage('bot', 'Sorry, I\'m having trouble connecting right now. Please try again.')
            input.focus()
          }
        })
        return
      }

      hideTyping()
      isBusy = false
      sendBtn.disabled = false

      if (xhr.status === 402) {
        try {
          var expiredData = JSON.parse(xhr.responseText)
          appendMessage('bot', expiredData.message || 'This trial has ended. Please upgrade to continue.')
        } catch (e) {
          appendMessage('bot', 'This trial has ended. Please upgrade to continue.')
        }
        input.disabled = true
        input.placeholder = 'This trial has ended'
        sendBtn.disabled = true
      } else if (xhr.status === 429) {
        try {
          var errorData = JSON.parse(xhr.responseText)
          appendMessage('bot', errorData.message || 'Daily limit reached. Please try again tomorrow.')
        } catch (e) {
          appendMessage('bot', 'Daily message limit reached. Please try again tomorrow.')
        }
        // Disable the input area to prevent further typing
        input.disabled = true
        input.placeholder = 'Daily limit reached'
        sendBtn.disabled = true
      } else {
        appendMessage('bot', 'Sorry, I\'m having trouble connecting right now. Please try again.')
      }

      input.focus()
    }

    xhr.onerror = function () {
      hideTyping()
      isBusy = false
      sendBtn.disabled = false
      appendMessage('bot', 'Network error — please check your connection and try again.')
      input.focus()
    }

    xhr.send(payload)
  }

  // ─── Establish the session before the widget accepts input ──────────────────
  input.disabled = true
  sendBtn.disabled = true
  input.placeholder = 'Connecting…'
  startSession(function (ok) {
    if (ok) {
      input.disabled = false
      sendBtn.disabled = false
      input.placeholder = 'Ask me anything…'
    } else {
      input.placeholder = 'Connection error — please refresh'
    }
  })

})()
