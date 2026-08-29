/* GORGOR V25.1 - 3 NOKTA DOT MENU + ANKET + WHEEL + GIZLI MOD + GENEL MOD FIX */
console.log("V25.1 DOT MENU + TUM FIXLER YUKLENDI");

let replyToData = null;
let editingMsgId = null;
let editingOriginalText = "";
let pinnedMessage = null;
let starredMessages = new Map();
let viewOnceEnabled = false;
let searchResults = [];
let currentSearchIdx = -1;
let pollsData = new Map();

try{
  const saved = JSON.parse(localStorage.getItem("gorgor_starred")||"[]");
  saved.forEach(s=>starredMessages.set(s.id, s));
}catch(e){}

function initHarmanUI(){
  const replyCancel = document.getElementById("replyCancel");
  if(replyCancel) replyCancel.onclick = ()=>{ replyToData=null; hideReplyBar(); };
  const editCancel = document.getElementById("editCancel");
  const editSave = document.getElementById("editSave");
  if(editCancel) editCancel.onclick = cancelEdit;
  if(editSave) editSave.onclick = saveEdit;
  const pinClose = document.getElementById("pinClose");
  const pinGoto = document.getElementById("pinGoto");
  if(pinClose) pinClose.onclick = ()=>{ pinnedMessage=null; hidePinBar(); try{ socket.emit("pin-message", {action:"unpin"}); }catch(e){} };
  if(pinGoto) pinGoto.onclick = ()=>{
    if(pinnedMessage && pinnedMessage.msgId){
      const el = document.getElementById(pinnedMessage.msgId);
      if(el){ el.scrollIntoView({behavior:"smooth", block:"center"}); el.style.outline="2px solid #00c853"; setTimeout(()=>el.style.outline="", 2000); }
    }
  };
  const searchToggle = document.getElementById("searchToggleBtn");
  const searchBar = document.getElementById("searchBar");
  const searchClose = document.getElementById("searchClose");
  const searchInput = document.getElementById("searchInput");
  const searchUp = document.getElementById("searchUp");
  const searchDown = document.getElementById("searchDown");
  if(searchToggle) searchToggle.onclick = ()=>{ searchBar.style.display = searchBar.style.display==="none"||!searchBar.style.display?"flex":"none"; if(searchBar.style.display!="none") searchInput.focus(); };
  if(searchClose) searchClose.onclick = ()=>{ searchBar.style.display="none"; clearSearch(); };
  if(searchInput){
    searchInput.addEventListener("input", ()=>{ performSearch(searchInput.value); });
    searchInput.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ if(e.shiftKey) navigateSearch(-1); else navigateSearch(1);} });
  }
  if(searchUp) searchUp.onclick = ()=>navigateSearch(-1);
  if(searchDown) searchDown.onclick = ()=>navigateSearch(1);
  const starredToggle = document.getElementById("starredToggleBtn");
  const starredPanel = document.getElementById("starredPanel");
  const starredClose = document.getElementById("starredClose");
  if(starredToggle) starredToggle.onclick = ()=>{ renderStarredPanel(); starredPanel.style.display="flex"; };
  if(starredClose) starredClose.onclick = ()=>{ starredPanel.style.display="none"; };
  const viewOnceBtn = document.getElementById("viewOnceToggleBtn");
  if(viewOnceBtn){ viewOnceBtn.style.display="none"; viewOnceEnabled=false; }
  const pollBtn = document.getElementById("pollBtn");
  const checklistBtn = document.getElementById("checklistBtn");
  const pollModal = document.getElementById("pollModal");
  const pollModalClose = document.getElementById("pollModalClose");
  const pollAddOption = document.getElementById("pollAddOption");
  const pollCreate = document.getElementById("pollCreate");
  if(pollBtn) pollBtn.onclick = ()=>{ openPollModal("poll"); };
  if(checklistBtn) checklistBtn.onclick = ()=>{ openPollModal("checklist"); };
  if(pollModalClose) pollModalClose.onclick = closePollModal;
  if(pollModal) pollModal.addEventListener("click", (e)=>{ if(e.target===pollModal) closePollModal(); });
  if(pollAddOption) pollAddOption.onclick = ()=>{
    const container = document.getElementById("pollOptionsContainer");
    if(container.children.length >= 6){ showToast("Max 6 seçenek"); return; }
    const inp = document.createElement("input");
    inp.className = "pollOptionInput";
    inp.placeholder = `Seçenek ${container.children.length+1}`;
    inp.style.cssText = "width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;";
    container.appendChild(inp);
  };
  if(pollCreate) pollCreate.onclick = createPollOrChecklist;
  const liveLocationBtn = document.getElementById("liveLocationBtn");
  if(liveLocationBtn) liveLocationBtn.onclick = startLiveLocation;
  const translateClose = document.getElementById("translateClose");
  if(translateClose) translateClose.onclick = ()=>{ document.getElementById("translatePopup").style.display="none"; };
  const quickReactBar = document.getElementById("quickReactBar");
  if(quickReactBar){
    quickReactBar.querySelectorAll("span").forEach(s=>{
      s.onclick = ()=>{
        if(window._lastReactTarget){
          const emoji = s.dataset.react;
          try{ socket.emit('fly-emoji',{emoji, effect:'heart'}); }catch(e){}
          if(typeof createFlyingEmoji==="function") createFlyingEmoji(emoji,'heart',true);
          quickReactBar.style.display="none";
        }
      };
    });
  }
  document.addEventListener("click", (e)=>{
    const menu = document.getElementById("msgActionMenu");
    const dotBtn = e.target.closest(".msgDotBtn");
    if(menu && menu.style.display!="none" && !menu.contains(e.target) && !dotBtn){
      if(!e.target.closest(".myMessage") && !e.target.closest(".otherMessage")){
        menu.style.display="none";
      }
    }
  });
}

function openPollModal(type){
  const modal = document.getElementById("pollModal");
  const title = document.getElementById("pollModalTitle");
  modal.dataset.type = type;
  if(title) title.textContent = type==="poll" ? "Anket Oluştur" : "Checklist Oluştur";
  document.getElementById("pollQuestion").value="";
  const container = document.getElementById("pollOptionsContainer");
  container.innerHTML="";
  for(let i=0;i<2;i++){
    const inp=document.createElement("input");
    inp.className="pollOptionInput";
    inp.placeholder=`Seçenek ${i+1}`;
    inp.style.cssText="width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;";
    container.appendChild(inp);
  }
  modal.style.display="flex";
}
function closePollModal(){
  const modal=document.getElementById("pollModal");
  if(modal) modal.style.display="none";
}

async function createPollOrChecklist(){
  const modal = document.getElementById("pollModal");
  const type = modal.dataset.type || "poll";
  const q = document.getElementById("pollQuestion").value.trim();
  const opts = Array.from(document.querySelectorAll(".pollOptionInput")).map(i=>i.value.trim()).filter(v=>v);
  if(!q){ showToast("Soru yaz"); return; }
  if(opts.length<2){ showToast("En az 2 seçenek"); return; }
  const expire = typeof getExpireFromSelect==="function" ? getExpireFromSelect() : (window.defaultExpire||43200);
  const payload = {
    type,
    question: q,
    options: opts,
    votes: type==="poll" ? opts.map(()=>0) : null,
    checks: type==="checklist" ? opts.map(()=>false) : null,
    voters: {}
  };
  const prefix = type==="poll" ? "__GORGOR_POLL__" : "__GORGOR_CHECKLIST__";
  const text = prefix + JSON.stringify(payload);
  try{
    const enc = await encryptText(text, currentPassword);
    const msgId = `poll-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const sentAt = Date.now();
    await addPollMessage(msgId, payload, true, sentAt, expire);
    socket.emit("chat-message", {msgId, enc, expireSec: expire, sentAt, deleteAt: Date.now()+expire*1000, realUsername: myRealUsername});
    closePollModal();
    const attachMenu = document.getElementById("attachMenu");
    if(attachMenu) attachMenu.classList.remove("show");
  }catch(e){
    console.error("poll create error", e);
    showToast("Anket oluşturulamadı");
  }
}

function addPollMessage(msgId, payload, isMine, sentAt, expireSec){
  const messagesEl = document.getElementById("messages");
  if(!messagesEl) return;
  const old = document.getElementById(msgId);
  if(old) old.remove();
  const div=document.createElement("div");
  div.className = isMine ? "myMessage" : "otherMessage";
  div.id = msgId;
  div._sentAt = sentAt||Date.now();
  div._expireSec = expireSec||window.defaultExpire||43200;
  div._deleteAt = div._sentAt + div._expireSec*1000;
  div._clock = formatClock(new Date(div._sentAt));
  const initial = (isMine ? (myRealUsername||"B") : "K").trim().charAt(0).toUpperCase();
  const isChecklist = payload.type==="checklist";
  const bubbleClass = isChecklist ? "msgBubble checklistBubble" : "msgBubble pollBubble";
  let html = `<div class="msgAvatar">${initial}</div><div class="${bubbleClass}"><span class="expireInfo">${div._clock} • ${isChecklist ? "✅ Checklist" : "📊 Anket"} • ⏰ ${formatTimeShort(div._expireSec)}</span>`;
  html += `<div class="pollQuestion">${escapeHtml(payload.question)}</div>`;
  payload.options.forEach((opt, idx)=>{
    if(isChecklist){
      const checked = payload.checks && payload.checks[idx] ? "checked" : "";
      html += `<div class="checklistItem"><input type="checkbox" data-idx="${idx}" ${checked} /> <span>${escapeHtml(opt)}</span></div>`;
    }else{
      const votes = payload.votes ? payload.votes[idx] : 0;
      const total = payload.votes ? payload.votes.reduce((a,b)=>a+b,0) : 0;
      const perc = total>0 ? Math.round(votes/total*100) : 0;
      html += `<div class="pollOption" data-idx="${idx}"><div class="pollOptionBar" style="width:${perc}%"></div><div class="pollOptionText"><span>${escapeHtml(opt)}</span><span class="pollVotes">${votes} oy • ${perc}%</span></div></div>`;
    }
  });
  html += `<span class="ticks ${isMine ? "single" : "double"}"> ${isMine ? "✓" : "✓✓"}</span></div>`;
  div.innerHTML = html;
  messagesEl.appendChild(div);
  setTimeout(()=>{ messagesEl.scrollTop=messagesEl.scrollHeight; },20);
  pollsData.set(msgId, payload);
  if(typeof startSelfDestruct==="function"){
    startSelfDestruct(div, msgId, div._expireSec, div._deleteAt);
  }else if(typeof startExpireTimer==="function"){
    startExpireTimer(msgId, div._deleteAt, div._expireSec);
  }
  if(isChecklist){
    div.querySelectorAll("input[type=checkbox]").forEach(chk=>{
      chk.addEventListener("change", ()=>{
        const idx = parseInt(chk.dataset.idx);
        payload.checks[idx] = chk.checked;
        pollsData.set(msgId, payload);
        try{ socket.emit("checklist-toggle", {msgId, idx, checked: chk.checked}); }catch(e){}
      });
    });
  }else{
    div.querySelectorAll(".pollOption").forEach(opt=>{
      opt.addEventListener("click", ()=>{
        const idx = parseInt(opt.dataset.idx);
        const voterKey = myRealUsername||"anon";
        const prev = payload.voters ? payload.voters[voterKey] : undefined;
        if(prev!==undefined && prev!==idx){
          if(payload.votes[prev]>0) payload.votes[prev]--;
        }
        if(prev===idx) return;
        payload.votes[idx] = (payload.votes[idx]||0)+1;
        if(!payload.voters) payload.voters={};
        payload.voters[voterKey]=idx;
        const total = payload.votes.reduce((a,b)=>a+b,0);
        div.querySelectorAll(".pollOption").forEach((o,i)=>{
          const perc = total>0 ? Math.round(payload.votes[i]/total*100) : 0;
          const bar=o.querySelector(".pollOptionBar");
          if(bar) bar.style.width = perc+"%";
          const v=o.querySelector(".pollVotes");
          if(v) v.textContent = `${payload.votes[i]} oy • ${perc}%`;
        });
        try{ socket.emit("poll-vote", {msgId, idx, voter: voterKey}); }catch(e){}
      });
    });
  }
  addDotMenuButton(div, msgId, isMine, payload.question);
  return msgId;
}

function addDotMenuButton(msgEl, msgId, isMine, textContent){
  if(msgEl.querySelector(".msgDotBtn")) return;
  const realIsMine = isMine || msgEl.classList.contains("myMessage");
  const dot = document.createElement("button");
  dot.className = "msgDotBtn";
  dot.innerHTML = "⋯";
  dot.title = "Seçenekler";
  dot.onclick = (e)=>{
    e.stopPropagation();
    openActionMenu(msgId, realIsMine, textContent, msgEl, e);
  };
  msgEl.appendChild(dot);
  let pressTimer=null;
  const startPress = (e)=>{
    if(e.target.closest(".msgDotBtn") || e.target.closest(".pollOption") || e.target.closest("input")) return;
    pressTimer = setTimeout(()=>{ openActionMenu(msgId, realIsMine, textContent, msgEl, e); }, 600);
  };
  const cancelPress = ()=>{ if(pressTimer) clearTimeout(pressTimer); };
  msgEl.addEventListener("touchstart", startPress, {passive:true});
  msgEl.addEventListener("touchend", cancelPress);
  msgEl.addEventListener("mousedown", startPress);
  msgEl.addEventListener("mouseup", cancelPress);
  msgEl.addEventListener("mouseleave", cancelPress);
}

function wrapMessageFunctions(){
  const _origAddMy = window.addMyMessage;
  const _origAddLocked = window.addLockedMessage;
  if(!_origAddMy || !_origAddLocked) return;
  window.addMyMessage = async function(text, expireSec, realName){
    let payload = {t:text};
    if(replyToData) payload.r = replyToData;
    if(viewOnceEnabled) payload.vo = true;
    const jsonText = JSON.stringify(payload);
    const isRich = replyToData || viewOnceEnabled;
    const finalText = isRich ? `__GORGOR_JSON__${jsonText}` : text;
    const msgId = await _origAddMy.call(this, finalText, expireSec, realName);
    setTimeout(()=>enhanceMessageDOM(msgId, payload, true), 50);
    if(replyToData){ replyToData=null; hideReplyBar(); }
    if(viewOnceEnabled){
      viewOnceEnabled=false;
      const btn = document.getElementById("viewOnceToggleBtn");
      if(btn){ btn.textContent="👁️ Bir Kez Gör (Kapalı)"; btn.style.background="#1a1a1a"; btn.style.color="#aaa"; }
    }
    return msgId;
  };
  window.addLockedMessage = async function(msgId, expireSec, enc, mediaType, senderReal, sentAt){
    let plain = null;
    try{ plain = await decryptText(enc, currentPassword); }catch(e){}
    if(plain){
      if(plain.startsWith("__GORGOR_POLL__") || plain.startsWith("__GORGOR_CHECKLIST__")){
        try{
          const isPoll = plain.startsWith("__GORGOR_POLL__");
          const jsonStr = plain.replace("__GORGOR_POLL__","").replace("__GORGOR_CHECKLIST__","");
          const data = JSON.parse(jsonStr);
          if(!data.type) data.type = isPoll ? "poll" : "checklist";
          await addPollMessage(msgId, data, false, sentAt, expireSec);
          try{ socket.emit("message-opened",{msgId}); socket.emit("message-read",{msgId, reader:myRealUsername}); }catch(e){}
          return;
        }catch(e){ console.error("poll parse error", e); }
      }
      if(plain.startsWith("__GORGOR_JSON__")){
        try{
          const inner = plain.replace("__GORGOR_JSON__","");
          const data = JSON.parse(inner);
          const text = data.t || "";
          const res = await _origAddLocked.call(this, msgId, expireSec, await encryptText(text, currentPassword), mediaType, senderReal, sentAt);
          setTimeout(()=>enhanceMessageDOM(msgId, data, false), 100);
          return res;
        }catch(e){}
      }
    }
    const res = await _origAddLocked.call(this, msgId, expireSec, enc, mediaType, senderReal, sentAt);
    setTimeout(async ()=>{
      try{
        const p = await decryptText(enc, currentPassword);
        if(p && p.startsWith('__GORGOR_')){
          if(p.startsWith('__GORGOR_POLL__') || p.startsWith('__GORGOR_CHECKLIST__')){
            let jsonStr = p.replace('__GORGOR_POLL__','').replace('__GORGOR_CHECKLIST__','');
            let data = JSON.parse(jsonStr);
            if(!data.type) data.type = p.includes('CHECKLIST') ? 'checklist' : 'poll';
            const el = document.getElementById(msgId);
            if(el) el.remove();
            await addPollMessage(msgId, data, false, sentAt, expireSec);
          }else if(p.startsWith('__GORGOR_JSON__')){
            const inner = p.replace('__GORGOR_JSON__','');
            const data = JSON.parse(inner);
            enhanceMessageDOM(msgId, data, false);
          }
        }else{
          const el = document.getElementById(msgId);
          if(el && !el.querySelector(".msgDotBtn")){
            const isMyEl = el.classList.contains("myMessage");
            const txt = el.querySelector(".msgText")?.textContent || p || "";
            addDotMenuButton(el, msgId, isMyEl, txt);
          }
        }
      }catch(e){}
    }, 150);
    return res;
  };
}

function enhanceMessageDOM(msgId, data, isMine){
  const el = document.getElementById(msgId);
  if(!el) return;
  const bubble = el.querySelector(".msgBubble");
  if(!bubble) return;
  if(data.r){
    if(!bubble.querySelector(".replyQuote")){
      const rq = document.createElement("div");
      rq.className = "replyQuote";
      const snippet = (data.r.snippet||data.r.text||"").substring(0,60);
      const sender = data.r.sender||"Bilinmeyen";
      rq.innerHTML = `<span class="rqName">${escapeHtml(sender)}</span><span class="rqText">${escapeHtml(snippet)}</span>`;
      bubble.insertBefore(rq, bubble.firstChild);
    }
  }
  if(!el.querySelector(".msgDotBtn")){
    const realIsMine = isMine || el.classList.contains("myMessage");
    addDotMenuButton(el, msgId, realIsMine, data.t||"");
  }
}

function handleMessageAction(act, msgId, isMine, text, msgEl){
  const menu = document.getElementById("msgActionMenu");
  if(menu) menu.style.display="none";
  switch(act){
    case "reply":
      replyToData = {
        msgId,
        snippet: text.substring(0,80),
        text: text,
        sender: isMine ? (myRealUsername||"Ben") : (msgEl.querySelector(".msgAvatar")?.textContent||"Karşı")
      };
      showReplyBar(replyToData);
      document.getElementById("messageInput").focus();
      break;
    case "edit":
      if(!isMine){ showToast("Sadece kendi mesajını düzenleyebilirsin"); return; }
      const age = Date.now() - (msgEl._sentAt||0);
      if(age > 15*60*1000){ showToast("Düzenleme süresi doldu (15dk)"); return; }
      editingMsgId = msgId;
      editingOriginalText = text;
      showEditBanner(text);
      break;
    case "pin":
      pinMessage(msgId, text, isMine);
      break;
    case "star":
      toggleStar(msgId, text, isMine, msgEl);
      break;
    case "forward":
      forwardMessage(text);
      break;
    case "translate":
      translateText(text);
      break;
    case "copy":
      navigator.clipboard.writeText(text).then(()=>showToast("Kopyalandı"));
      break;
    case "delete":
      if(isMine){
        const el = document.getElementById(msgId);
        if(el){ el.style.transition="opacity 0.3s"; el.style.opacity="0"; setTimeout(()=>el.remove(),300); }
        try{ socket.emit("delete-message", {msgId}); }catch(e){}
        showToast("Mesaj geri çekildi");
      }else{
        showToast("Sadece kendi mesajını silebilirsin");
      }
      break;
  }
}

function openActionMenu(msgId, isMine, text, msgEl, ev){
  const menu = document.getElementById("msgActionMenu");
  if(!menu) return;
  menu.innerHTML="";
  const actions = [
    {icon:"↩️", label:"Alıntıla / Yanıtla", act:"reply"},
    {icon:"📌", label:"Sabitle", act:"pin"},
    {icon:"⭐", label: starredMessages.has(msgId) ? "Yıldızı kaldır" : "Yıldızla", act:"star"},
    {icon:"↪️", label:"İlet", act:"forward"},
    {icon:"🌐", label:"Çevir", act:"translate"},
    {icon:"📋", label:"Kopyala", act:"copy"},
  ];
  if(isMine){
    actions.unshift({icon:"✏️", label:"Düzenle", act:"edit"});
    actions.push({icon:"🗑️", label:"Geri çek / Sil", act:"delete"});
  }
  actions.forEach(a=>{
    const btn = document.createElement("button");
    btn.innerHTML = `<span>${a.icon}</span> ${a.label}`;
    btn.onclick = ()=>{ menu.style.display="none"; handleMessageAction(a.act, msgId, isMine, text, msgEl); };
    menu.appendChild(btn);
  });
  let x=20, y=100;
  if(ev && ev.touches && ev.touches[0]){ x=ev.touches[0].clientX; y=ev.touches[0].clientY; }
  else if(ev && ev.clientX){ x=ev.clientX; y=ev.clientY; }
  else {
    const rect = msgEl.getBoundingClientRect();
    x = rect.right - 200;
    y = rect.top + 30;
  }
  menu.style.left = Math.min(Math.max(x, 10), window.innerWidth-210)+"px";
  menu.style.top = Math.min(Math.max(y, 10), window.innerHeight-250)+"px";
  menu.style.display="block";
}

function showReplyBar(data){
  const bar = document.getElementById("replyPreviewBar");
  if(!bar) return;
  const nameEl = document.getElementById("replyToName");
  const snipEl = document.getElementById("replyToSnippet");
  if(nameEl) nameEl.textContent = data.sender;
  if(snipEl) snipEl.textContent = data.snippet;
  bar.style.display="flex";
}
function hideReplyBar(){ const bar=document.getElementById("replyPreviewBar"); if(bar) bar.style.display="none"; replyToData=null; }
function showEditBanner(text){
  const b=document.getElementById("editBanner");
  const o=document.getElementById("editOriginal");
  if(b && o){ o.textContent=text; b.style.display="flex"; const inp=document.getElementById("messageInput"); if(inp){ inp.value=text; inp.focus(); } }
}
function cancelEdit(){
  editingMsgId=null; editingOriginalText=""; const b=document.getElementById("editBanner"); if(b) b.style.display="none"; const inp=document.getElementById("messageInput"); if(inp) inp.value="";
}
async function saveEdit(){
  if(!editingMsgId) return;
  const newText = document.getElementById("messageInput").value.trim();
  if(!newText){ showToast("Boş olamaz"); return; }
  if(newText===editingOriginalText){ cancelEdit(); return; }
  try{
    const enc = await encryptText(newText, currentPassword);
    socket.emit("chat-edit", {msgId: editingMsgId, enc});
    socket.emit("message-edit", {msgId: editingMsgId, enc});
    const el = document.getElementById(editingMsgId);
    if(el){
      const msgText = el.querySelector(".msgText");
      if(msgText){ msgText.textContent=newText; }
      const bubble = el.querySelector(".msgBubble");
      if(bubble && !bubble.querySelector(".editedLabel")){
        const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)"; bubble.appendChild(ed);
      }
    }
    cancelEdit();
    showToast("Düzenlendi");
  }catch(e){ showToast("Düzenlenemedi"); }
}
function pinMessage(msgId, text, isMine){
  const data = {msgId, text: text.substring(0,100), sender: isMine ? (myRealUsername||"Ben") : "Karşı"};
  pinnedMessage=data;
  showPinBar(data);
  try{ socket.emit("pin-message", data); }catch(e){}
}
function showPinBar(data){
  const bar=document.getElementById("pinBar");
  if(!bar) return;
  const senderEl=document.getElementById("pinSender");
  const snipEl=document.getElementById("pinSnippet");
  if(senderEl) senderEl.textContent=data.sender;
  if(snipEl) snipEl.textContent=data.text;
  bar.style.display="block";
}
function hidePinBar(){ const bar=document.getElementById("pinBar"); if(bar) bar.style.display="none"; }
function toggleStar(msgId, text, isMine, msgEl){
  if(starredMessages.has(msgId)){
    starredMessages.delete(msgId);
    const bubble = msgEl.querySelector(".msgBubble");
    const star = bubble?.querySelector(".starIcon");
    if(star) star.remove();
    showToast("Yıldız kaldırıldı");
  }else{
    starredMessages.set(msgId, {id:msgId, text, sender: isMine? (myRealUsername||"Ben"):"Karşı", time:Date.now()});
    const bubble = msgEl.querySelector(".msgBubble");
    if(bubble && !bubble.querySelector(".starIcon")){
      const s=document.createElement("span"); s.className="starIcon"; s.textContent="⭐"; bubble.appendChild(s);
    }
    showToast("Yıldızlandı");
  }
  localStorage.setItem("gorgor_starred", JSON.stringify(Array.from(starredMessages.values())));
}
function renderStarredPanel(){
  const list=document.getElementById("starredList");
  if(!list) return;
  list.innerHTML="";
  if(starredMessages.size===0){ list.innerHTML='<div style="color:#888;text-align:center;padding:20px;">Yıldızlı mesaj yok</div>'; return; }
  starredMessages.forEach(m=>{
    const d=document.createElement("div");
    d.style.cssText="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:10px;";
    d.innerHTML=`<div style="font-size:11px;color:#00ff88;">${escapeHtml(m.sender)}</div><div style="font-size:13px;color:#fff;margin:4px 0;">${escapeHtml(m.text)}</div><div style="font-size:10px;color:#888;">${new Date(m.time).toLocaleString()}</div>`;
    d.onclick=()=>{
      const el=document.getElementById(m.id);
      if(el){ el.scrollIntoView({behavior:"smooth", block:"center"}); el.style.outline="2px solid #ffcc00"; setTimeout(()=>el.style.outline="",2000); document.getElementById("starredPanel").style.display="none"; }
    };
    list.appendChild(d);
  });
}
function forwardMessage(text){ navigator.clipboard.writeText(text).then(()=>showToast("Kopyalandı - başka odaya yapıştırabilirsin")); }
async function translateText(text){
  const popup=document.getElementById("translatePopup");
  const orig=document.getElementById("translateOriginal");
  const res=document.getElementById("translateResult");
  const load=document.getElementById("translateLoading");
  if(!popup) return;
  orig.textContent=text;
  res.textContent="";
  load.style.display="block";
  popup.style.display="block";
  try{
    const target = /[a-zA-Z]/.test(text) ? "tr" : "en";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${target}`;
    const r = await fetch(url);
    const j = await r.json();
    load.style.display="none";
    res.textContent = j.responseData?.translatedText || "Çeviri yapılamadı";
  }catch(e){ load.style.display="none"; res.textContent="Çeviri hatası"; }
}
function performSearch(q){
  clearHighlights();
  searchResults=[]; currentSearchIdx=-1;
  if(!q || q.trim().length<2){ updateSearchCount(); return; }
  const lower = q.toLowerCase();
  const allMsgs = document.querySelectorAll(".myMessage, .otherMessage");
  allMsgs.forEach(el=>{
    const textEl = el.querySelector(".msgText") || el.querySelector(".pollQuestion");
    if(!textEl) return;
    const txt = textEl.textContent.toLowerCase();
    if(txt.includes(lower)){
      searchResults.push(el);
      highlightText(textEl, lower);
    }
  });
  if(searchResults.length>0){ currentSearchIdx=0; focusSearchResult(0); }
  updateSearchCount();
}
function highlightText(el, lower){
  const original = el.textContent;
  const regex = new RegExp(`(${escapeRegExp(lower)})`, "gi");
  el.innerHTML = escapeHtml(original).replace(regex, '<span class="searchHighlight">$1</span>');
}
function clearHighlights(){
  document.querySelectorAll(".searchHighlight, .searchCurrent").forEach(s=>{
    const parent = s.parentNode;
    if(!parent) return;
    parent.replaceChild(document.createTextNode(s.textContent), s);
    parent.normalize();
  });
}
function clearSearch(){ clearHighlights(); searchResults=[]; currentSearchIdx=-1; updateSearchCount(); const inp=document.getElementById("searchInput"); if(inp) inp.value=""; }
function navigateSearch(dir){
  if(searchResults.length===0) return;
  currentSearchIdx = (currentSearchIdx + dir + searchResults.length) % searchResults.length;
  focusSearchResult(currentSearchIdx);
  updateSearchCount();
}
function focusSearchResult(idx){
  clearCurrentMark();
  const el = searchResults[idx];
  if(!el) return;
  el.scrollIntoView({behavior:"smooth", block:"center"});
  const hl = el.querySelector(".searchHighlight");
  if(hl){ hl.classList.add("searchCurrent"); }
}
function clearCurrentMark(){ document.querySelectorAll(".searchCurrent").forEach(e=>{ e.classList.remove("searchCurrent"); e.classList.add("searchHighlight"); }); }
function updateSearchCount(){ const c=document.getElementById("searchCount"); if(c) c.textContent = searchResults.length ? `${currentSearchIdx+1}/${searchResults.length}` : "0/0"; }
async function startLiveLocation(){
  if(!navigator.geolocation){ showToast("Konum desteklenmiyor"); return; }
  showToast("Canlı konum paylaşılıyor (5dk)");
  let count=0; const max=10;
  const sendLocation = async (pos)=>{
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    const text=`📍 Konum: https://maps.google.com/?q=${lat},${lon}`;
    const expire = typeof getExpireFromSelect==="function" ? getExpireFromSelect() : 3600;
    const msgId=`loc-${Date.now()}-${count}`;
    const enc=await encryptText(text, currentPassword);
    const sentAt=Date.now();
    if(typeof addMyMessage==="function"){
      await addMyMessage(text, expire, myRealUsername);
    }
    try{ socket.emit("chat-message", {msgId, enc, expireSec: expire, sentAt, deleteAt: Date.now()+expire*1000, realUsername: myRealUsername}); }catch(e){}
  };
  navigator.geolocation.getCurrentPosition(pos=>{ sendLocation(pos); count++; let watchId = navigator.geolocation.watchPosition(pos2=>{
    count++; if(count>=max){ if(watchId) navigator.geolocation.clearWatch(watchId); showToast("Canlı konum bitti"); return; } sendLocation(pos2);
  }, null, {enableHighAccuracy:true}); setTimeout(()=>{ if(watchId) navigator.geolocation.clearWatch(watchId); showToast("Canlı konum sona erdi"); }, 5*60*1000); }, null, {enableHighAccuracy:true});
}
function initSocketHarman(){
  try{
    socket.on("chat-edit", async (data)=>{
      const el = document.getElementById(data.msgId);
      if(!el) return;
      try{
        const plain = await decryptText(data.enc, currentPassword);
        let txt = plain;
        if(plain.startsWith("__GORGOR_JSON__")){
          const j = JSON.parse(plain.replace("__GORGOR_JSON__",""));
          txt = j.t;
        }
        const bubble = el.querySelector(".msgBubble");
        const msgText = bubble.querySelector(".msgText");
        if(msgText){
          msgText.textContent = txt;
          if(!bubble.querySelector(".editedLabel")){
            const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)"; bubble.appendChild(ed);
          }
        }
      }catch(e){}
    });
    socket.on("message-edit", async (data)=>{
      const el = document.getElementById(data.msgId);
      if(!el) return;
      try{
        const plain = await decryptText(data.enc, currentPassword);
        let txt = plain;
        if(plain.startsWith("__GORGOR_JSON__")){
          const j = JSON.parse(plain.replace("__GORGOR_JSON__",""));
          txt = j.t;
        }
        const bubble = el.querySelector(".msgBubble");
        const msgText = bubble.querySelector(".msgText");
        if(msgText){
          msgText.textContent = txt;
          if(!bubble.querySelector(".editedLabel")){
            const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)"; bubble.appendChild(ed);
          }
        }
      }catch(e){}
    });
    socket.on("pin-message", (data)=>{
      if(data.action==="unpin"){ pinnedMessage=null; hidePinBar(); return; }
      if(data.msgId){ pinnedMessage = {msgId: data.msgId, text: data.text||"Sabit mesaj", sender: data.sender||"Karşı"}; showPinBar(pinnedMessage); }
    });
    socket.on("poll-vote", (data)=>{
      const poll = pollsData.get(data.msgId);
      if(!poll || poll.type==="checklist") return;
      const prev = poll.voters ? poll.voters[data.voter] : undefined;
      if(prev!==undefined && poll.votes[prev]>0) poll.votes[prev]--;
      poll.votes[data.idx] = (poll.votes[data.idx]||0)+1;
      if(!poll.voters) poll.voters={};
      poll.voters[data.voter]=data.idx;
      const div = document.getElementById(data.msgId);
      if(!div) return;
      const total = poll.votes.reduce((a,b)=>a+b,0);
      div.querySelectorAll(".pollOption").forEach((o,i)=>{
        const perc = total>0 ? Math.round(poll.votes[i]/total*100) : 0;
        const bar=o.querySelector(".pollOptionBar");
        if(bar) bar.style.width = perc+"%";
        const v=o.querySelector(".pollVotes");
        if(v) v.textContent = `${poll.votes[i]} oy • ${perc}%`;
      });
    });
    socket.on("checklist-toggle", (data)=>{
      const poll = pollsData.get(data.msgId);
      if(!poll) return;
      poll.checks[data.idx]=data.checked;
      const div = document.getElementById(data.msgId);
      if(!div) return;
      const chk = div.querySelectorAll("input[type=checkbox]")[data.idx];
      if(chk) chk.checked = data.checked;
    });
    socket.on("delete-message", (data)=>{
      const el=document.getElementById(data.msgId);
      if(el){ el.style.transition="opacity 0.3s"; el.style.opacity="0"; setTimeout(()=>el.remove(),300); showToast("Mesaj geri çekildi"); }
    });
    socket.on("pending-messages", async(list)=>{
      setTimeout(async ()=>{
        for(const m of list){
          try{
            const plain = await decryptText(m.enc, currentPassword);
            if(plain && (plain.startsWith("__GORGOR_POLL__") || plain.startsWith("__GORGOR_CHECKLIST__"))){
              const isPoll = plain.startsWith("__GORGOR_POLL__");
              const jsonStr = plain.replace("__GORGOR_POLL__","").replace("__GORGOR_CHECKLIST__","");
              const data = JSON.parse(jsonStr);
              if(!data.type) data.type = isPoll ? "poll" : "checklist";
              const el = document.getElementById(m.msgId);
              if(el) el.remove();
              await addPollMessage(m.msgId, data, m.username===myUsername, m.expireAt ? m.expireAt - m.expireSec*1000 : Date.now(), m.expireSec);
            }
          }catch(e){}
        }
      }, 500);
    });
  }catch(e){ console.log("harman socket init hata", e); }
}
function escapeHtml(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
if(typeof showToast!=="function"){
  window.showToast = function(msg){
    let t=document.getElementById("gorgorToast");
    if(!t){ t=document.createElement("div"); t.id="gorgorToast"; t.style.cssText="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #333;color:#fff;padding:10px 16px;border-radius:20px;font-size:12px;z-index:99999;max-width:80%;text-align:center;"; document.body.appendChild(t); }
    t.textContent=msg; t.style.display="block"; t.style.opacity="1"; setTimeout(()=>{ t.style.opacity="0"; setTimeout(()=>t.style.display="none",300); },3000);
  };
}
document.addEventListener("DOMContentLoaded", ()=>{
  initHarmanUI();
  setTimeout(()=>{ wrapMessageFunctions(); initSocketHarman(); }, 300);
});
console.log("V25.1 DOT MENU + TUM FIXLER - 3 nokta aktif, wheel, gizli mod, genel mod duzeltildi");