(function () {
  var panel = document.getElementById('chat-panel');
  var launcher = document.getElementById('chat-launcher');
  var closeButton = document.getElementById('chat-close');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');
  var sendButton = document.getElementById('chat-send');
  var messagesEl = document.getElementById('chat-messages');
  var suggestions = document.getElementById('chat-suggestions');
  var menuButton = document.getElementById('chat-menu');
  var backButton = document.getElementById('chat-back');
  var links = {
    '#committees': 'Committees',
    '#schedule': 'Schedule',
    '#resources': 'Resources',
    'login.html': 'Delegate sign in'
  };

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close chat' : 'Ask DXB MUN');
    if (open) input.focus();
    else launcher.focus();
  }

  function addMessage(role, text) {
    var message = document.createElement('div');
    message.className = 'chat-message ' + role;
    if (role === 'bot') {
      var pattern = /\[([^\]]{1,80})\]\((#[a-z-]+|login\.html)\)/g;
      var cursor = 0;
      var match;
      while ((match = pattern.exec(text))) {
        message.appendChild(document.createTextNode(text.slice(cursor, match.index)));
        if (links[match[2]]) {
          var link = document.createElement('a');
          link.href = match[2];
          link.textContent = match[1];
          message.appendChild(link);
        } else {
          message.appendChild(document.createTextNode(match[0]));
        }
        cursor = pattern.lastIndex;
      }
      message.appendChild(document.createTextNode(text.slice(cursor)));
    } else {
      message.textContent = text;
    }
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return message;
  }

  function getReply(question) {
    var text = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text)) {
      return 'Hello! I can help with committee names, the conference date, the schedule, delegate sign-in, and resources. What would you like to know?';
    }

    if (/\b(registration|register)\b/.test(text) && /\b(time|when|hour|day)\b/.test(text)) {
      if (/\b(day 1|day one|first day)\b/.test(text)) return 'Registration on Day 1 is listed at 12:30 PM. The schedule does not specify a timezone. [See the schedule](#schedule)';
      if (/\b(day 2|day two|second day)\b/.test(text)) return 'Registration on Day 2 is listed at 9:00 AM. The schedule does not specify a timezone. [See the schedule](#schedule)';
      if (/\b(day 3|day three|third day)\b/.test(text)) return 'Registration on Day 3 is listed at 9:00 AM. The schedule does not specify a timezone. [See the schedule](#schedule)';
      return 'Registration is listed at 12:30 PM on Day 1 and 9:00 AM on Days 2 and 3. The schedule does not specify a timezone. [See the schedule](#schedule)';
    }

    if (/\b(schedule|agenda|timings?|sessions?|opening ceremony|closing ceremony|dispersal|socials|day 1|day one|first day|day 2|day two|second day|day 3|day three|third day)\b/.test(text)) {
      if (/\b(day 1|day one|first day)\b/.test(text)) {
        return 'Day 1: Registration 12:30 PM; opening ceremony 1:30 PM; ROP briefing 2:30 PM; break 3:00 PM; committee session 1 at 4:00 PM; dispersal 5:30 PM. The site does not specify a timezone. [See the schedule](#schedule)';
      }
      if (/\b(day 2|day two|second day)\b/.test(text)) {
        return 'Day 2: Registration 9:00 AM; committee sessions at 9:30 AM, 11:45 AM, and 2:30 PM; lunch 1:30 PM; socials 4:30 PM; dispersal 7:00 PM. The site does not specify a timezone. [See the schedule](#schedule)';
      }
      if (/\b(day 3|day three|third day)\b/.test(text)) {
        return 'Day 3: Registration 9:00 AM; committee sessions at 9:30 AM and 12:00 PM; lunch 2:30 PM; closing ceremony 3:30 PM; dispersal 5:30 PM. The site does not specify a timezone. [See the schedule](#schedule)';
      }
      return 'The homepage lists a three-day schedule. Day 1 starts with registration at 12:30 PM; Days 2 and 3 start at 9:00 AM. Times are shown on the [schedule](#schedule), but no timezone is listed.';
    }

    if (/\b(committees|committee|council|commissions|bodies|ipmc|hcc|ipc|ecosoc|di sec|disec|unodc|unep|unoosa|unsc|unhrc|uncsw|uncstd|sochum|interpol|nato|world health organization)\b/.test(text)) {
      return 'The site lists 19 committees: IPMC, HCC, IPC, WHO, ECOSOC, AU, EU, ICJ, DISEC, UNODC, UNEP, UNOOSA, UNSC, UNHRC, UNCSW, UNCSTD, SOCHUM, INTERPOL, and NATO. Browse them on the [committees page](#committees).';
    }

    if (/\b(when|date|april|conference date|mun 2027)\b/.test(text)) {
      return 'The homepage countdown is set for 23 April 2027. It does not show a conference start time. [View the homepage](#home)';
    }

    if (/\b(sign in|signin|log in|login|access code|delegate portal|chair portal)\b/.test(text)) {
      return 'Delegates and chairs can sign in with their access code on the [sign-in page](login.html). Contact an organiser if you need help with your code.';
    }

    if (/\b(resources?|rules|procedure|position paper|rop)\b/.test(text)) {
      return 'The resources section is on the [homepage](#resources), but its document is still a placeholder. Please ask an organiser for the current rules or position-paper guidance.';
    }

    if (/\b(where|venue|location|campus|address|directions)\b/.test(text)) {
      return 'The homepage does not list a venue or campus. Please check with an organiser for location details.';
    }

    if (/\b(register|registration|fees?|cost|payment)\b/.test(text)) {
      return 'The homepage does not provide registration or fee details. Please check with an organiser for current information.';
    }

    return 'I can answer questions about the committee list, conference date, schedule, delegate sign-in, and resources. Try one of the suggested questions below.';
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 112) + 'px';
  }

  function addTypingIndicator() {
    var indicator = document.createElement('div');
    indicator.className = 'chat-message bot typing';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-label', 'Preparing a reply');
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('span');
      dot.className = 'typing-dot';
      dot.setAttribute('aria-hidden', 'true');
      indicator.appendChild(dot);
    }
    messagesEl.appendChild(indicator);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return indicator;
  }

  launcher.addEventListener('click', function () { setOpen(panel.hidden); });
  closeButton.addEventListener('click', function () { setOpen(false); });
  backButton.addEventListener('click', function () { setOpen(false); });
  menuButton.addEventListener('click', function () {
    suggestions.hidden = !suggestions.hidden;
    menuButton.setAttribute('aria-expanded', String(!suggestions.hidden));
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  messagesEl.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });

  suggestions.addEventListener('click', function (event) {
    if (event.target.tagName !== 'BUTTON') return;
    input.value = event.target.textContent;
    suggestions.hidden = true;
    form.requestSubmit();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question || sendButton.disabled) return;

    input.value = '';
    resizeInput();
    suggestions.hidden = true;
    addMessage('user', question);
    var typing = addTypingIndicator();
    sendButton.disabled = true;
    input.disabled = true;
    window.setTimeout(function () {
      typing.remove();
      addMessage('bot', getReply(question));
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }, 420);
  });
})();