/* GORGOR V22 HARMAN - Dünya chat özelliklerini koruyarak ekle
   Temel kurallar korunuyor: fakeCalc 0000, oda1, varım/yokum, panic, 300 satır
   Bu dosya script.js'den SONRA yüklenir, mevcut fonksiyonları sarmalar
*/
console.log("V22 HARMAN YUKLENDI - Dunya chat harmani aktif");

let replyToData = null;
let editingMsgId = null;
let editingOriginalText = "";
let pinnedMessage = null;
let starredMessages = new Map(); // msgId -> data
let viewOnceEnabled = false; // V22.1 - PASIF EDILDI - 48 yok
let searchResults = [];
let currentSearchIdx = -1;
let pollsData = new Map(); // msgId -> poll
let checklistData = new Map();

// LocalStorage load starred
try{
  const saved = JSON.parse(localStorage.getItem("gorgor_starred")||"[]");
  saved.forEach(s=>starredMessages.set(s.id, s));
}catch(e){}

let originalAddMyMessage = window.addMyMessage || null;
let originalAddLocked = null;

// We'll wait for DOM and original functions
document.addEventListener("DOMContentLoaded", ()=>{
  originalAddMyMessage = window.addMyMessage || addMyMessage;
  originalAddLocked = window.addLockedMessage || addLockedMessage;
  initHarmanUI();
  wrapMessageFunctions();
  initSocketHarman();
});

function initHarmanUI(){
  const replyBar = document.getElementById("replyPreviewBar");
  const replyCancel = document.getElementById("replyCancel");
  if(replyCancel) replyCancel.onclick = ()=>{ replyToData=null; hideReplyBar(); };

  const editBanner = document.getElementById("editBanner");
  const editCancel = document.getElementById("editCancel");
  const editSave = document.getElementById("editSave");
  if(editCancel) editCancel.onclick = cancelEdit;
  if(editSave) editSave.onclick = saveEdit;

  const pinBar = document.getElementById("pinBar");
  const pinClose = document.getElementById("pinClose");
  const pinGoto = document.getElementById("pinGoto");
  if(pinClose) pinClose.onclick = ()=>{ pinnedMessage=null; hidePinBar(); try{ socket.emit("pin-message", {action:"unpin"}); }catch(e){} };
  if(pinGoto && pinBar) pinGoto.onclick = ()=>{
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
  if(searchToggle) searchToggle.onclick = ()=>{ searchBar.style.display = searchBar.style.display==="none"||!searchBar.style.display?"flex":"none"; if(searchBar.style.display!=="none") searchInput.focus(); };
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
  if(viewOnceBtn){ viewOnceBtn.style.display="none"; viewOnceEnabled=false; } // 48 pasif

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

  const translatePopup = document.getElementById("translatePopup");
  const translateClose = document.getElementById("translateClose");
  if(translateClose) translateClose.onclick = ()=>{ translatePopup.style.display="none"; };

  // Quick react bar
  const quickReactBar = document.getElementById("quickReactBar");
  if(quickReactBar){
    quickReactBar.querySelectorAll("span").forEach(s=>{
      s.onclick = ()=>{
        if(window._lastReactTarget){
          const emoji = s.dataset.react;
          // use existing fly-emoji or reaction
          try{ socket.emit('fly-emoji',{emoji, effect:'heart'}); }catch(e){}
          if(typeof createFlyingEmoji==="function") createFlyingEmoji(emoji,'heart',true);
          quickReactBar.style.display="none";
        }
      };
    });
  }

  // Close menus on click outside
  document.addEventListener("click", (e)=>{
    const menu = document.getElementById("msgActionMenu");
    if(menu && menu.style.display!=="none" && !menu.contains(e.target)){
      // check if click is not on message
      if(!e.target.closest(".myMessage") && !e.target.closest(".otherMessage")){
        menu.style.display="none";
      }
    }
  });
}

function openPollModal(type){
  const modal = document.getElementById("pollModal");
  const title = document.getElementById("pollModalTitle");
  if(title) title.textContent = type==="checklist" ? "✅ Checklist Oluştur" : "📊 Anket Oluştur";
  modal.dataset.type = type;
  modal.style.display="flex";
  document.getElementById("pollQuestion").value="";
  const container = document.getElementById("pollOptionsContainer");
  container.innerHTML="";
  const ph1 = type==="checklist" ? "Madde 1" : "Seçenek 1";
  const ph2 = type==="checklist" ? "Madde 2" : "Seçenek 2";
  container.innerHTML = `<input class="pollOptionInput" placeholder="${ph1}" style="width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;" />
                         <input class="pollOptionInput" placeholder="${ph2}" style="width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;" />`;
}
function closePollModal(){ document.getElementById("pollModal").style.display="none"; }

async function createPollOrChecklist(){
  const modal = document.getElementById("pollModal");
  const type = modal.dataset.type || "poll";
  const q = document.getElementById("pollQuestion").value.trim();
  const opts = Array.from(document.querySelectorAll(".pollOptionInput")).map(i=>i.value.trim()).filter(v=>v);
  if(!q){ showToast("Soru yaz"); return; }
  if(opts.length<2){ showToast("En az 2 seçenek/madde"); return; }
  const expire = typeof getExpireFromSelect==="function" ? getExpireFromSelect() : 43200;
  const payload = {
    type,
    question: q,
    options: opts,
    votes: type==="poll" ? opts.map(()=>0) : null,
    checks: type==="checklist" ? opts.map(()=>false) : null,
    voters: {}
  };
  const text = `__GORGOR_${type.toUpperCase()}__`+JSON.stringify(payload);
  const enc = await encryptText(text, currentPassword);
  const msgId = `poll-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const sentAt = Date.now();
  // local add
  await addPollMessage(msgId, payload, true, sentAt);
  try{ socket.emit("chat-message", {msgId, enc, expireSec: expire, sentAt, deleteAt: Date.now()+expire*1000, realUsername: myRealUsername}); }catch(e){}
  closePollModal();
  const attachMenu = document.getElementById("attachMenu");
  if(attachMenu) attachMenu.classList.remove("show");
}

function wrapMessageFunctions(){
  // Wrap addMyMessage
  const _origAddMy = window.addMyMessage || addMyMessage;
  window.addMyMessage = async function(text, expireSec, realName){
    // check if reply or viewOnce
    let payload = {t:text};
    if(replyToData) payload.r = replyToData;
    if(viewOnceEnabled) payload.vo = true;
    // if editing, this is not add but edit
    const jsonText = JSON.stringify(payload);
    const isRich = replyToData || viewOnceEnabled;
    const finalText = isRich ? `__GORGOR_JSON__${jsonText}` : text;
    const msgId = await _origAddMy.call(this, finalText, expireSec, realName);
    // enhance DOM
    setTimeout(()=>enhanceMessageDOM(msgId, payload, true), 50);
    // clear reply
    if(replyToData){ replyToData=null; hideReplyBar(); }
    if(viewOnceEnabled){
      // auto off after one use
      viewOnceEnabled=false;
      const btn = document.getElementById("viewOnceToggleBtn");
      if(btn){ btn.textContent="👁️ Bir Kez Gör (Kapalı)"; btn.style.background="#1a1a1a"; btn.style.color="#aaa"; }
    }
    return msgId;
  };

  const _origAddLocked = window.addLockedMessage || addLockedMessage;
  window.addLockedMessage = async function(msgId, expireSec, enc, mediaType, senderReal, sentAt){
    // decrypt first to check json
    let plain = null;
    try{ plain = await decryptText(enc, currentPassword); }catch(e){}
    if(plain && plain.startsWith("__GORGOR_JSON__")){
      try{
        const inner = plain.replace("__GORGOR_JSON__","");
        const data = JSON.parse(inner);
        // it's rich text message
        const text = data.t || "";
        // create element via original but with text, then enhance
        const res = await _origAddLocked.call(this, msgId, expireSec, await encryptText(text, currentPassword), mediaType, senderReal, sentAt);
        // enhance after
        setTimeout(()=>enhanceMessageDOM(msgId, data, false), 100);
        return res;
      }catch(e){
        // fallback
      }
    }else if(plain && plain.startsWith("__GORGOR_POLL__")){
      try{
        const inner = plain.replace("__GORGOR_POLL__","");
        const poll = JSON.parse(inner);
        await addPollMessage(msgId, poll, false, sentAt);
        return;
      }catch(e){}
    }else if(plain && plain.startsWith("__GORGOR_CHECKLIST__")){
      try{
        const inner = plain.replace("__GORGOR_CHECKLIST__","");
        const cl = JSON.parse(inner);
        cl.type="checklist";
        await addPollMessage(msgId, cl, false, sentAt);
        return;
      }catch(e){}
    }else if(plain && (plain.startsWith('__GORGOR_JSON__')===false)){
      // check if it's poll json inside __GORGOR_POLL__
      if(plain.includes("__GORGOR_POLL__") || plain.includes("__GORGOR_CHECKLIST__")){
        // already handled
      }
    }
    // For poll detection via prefix __GORGOR_POLL__ etc inside original decrypt path, we need to handle after original
    const res = await _origAddLocked.call(this, msgId, expireSec, enc, mediaType, senderReal, sentAt);
    // after, try enhance
    setTimeout(async ()=>{
      try{
        const p = await decryptText(enc, currentPassword);
        if(p && p.startsWith('__GORGOR_')){
          // poll
          if(p.startsWith('__GORGOR_POLL__') || p.startsWith('__GORGOR_CHECKLIST__')){
            let jsonStr = p.replace('__GORGOR_POLL__','').replace('__GORGOR_CHECKLIST__','');
            let data = JSON.parse(jsonStr);
            if(p.includes('CHECKLIST')) data.type='checklist';
            // remove the auto-created text bubble and replace with poll
            const el = document.getElementById(msgId);
            if(el) el.remove();
            await addPollMessage(msgId, data, false, sentAt);
          }else if(p.startsWith('__GORGOR_JSON__')){
            const inner = p.replace('__GORGOR_JSON__','');
            const data = JSON.parse(inner);
            enhanceMessageDOM(msgId, data, false);
          }
        }else if(p){
          // normal message, but might still have reply data stored differently? check if message element exists, enhance for actions
          const el = document.getElementById(msgId);
          if(el && !el.querySelector(".msgActions")){
            addActionButtonsToMessage(el, msgId, false, p);
          }
        }
      }catch(e){}
    }, 150);
    return res;
  };

  // Also override poll messages creation to go through same flow
  window.addMyMessage = window.addMyMessage; // keep
}

function enhanceMessageDOM(msgId, data, isMine){
  const el = document.getElementById(msgId);
  if(!el) return;
  const bubble = el.querySelector(".msgBubble");
  if(!bubble) return;

  // Reply quote
  if(data.r){
    if(!bubble.querySelector(".replyQuote")){
      const rq = document.createElement("div");
      rq.className = "replyQuote";
      const snippet = (data.r.snippet||data.r.text||"").substring(0,60);
      const sender = data.r.sender||"Bilinmeyen";
      rq.innerHTML = `<span class="rqName">${escapeHtml(sender)}</span><span class="rqText">${escapeHtml(snippet)}</span>`;
      rq.onclick = ()=>{
        if(data.r.msgId){
          const target = document.getElementById(data.r.msgId);
          if(target){ target.scrollIntoView({behavior:"smooth", block:"center"}); target.style.outline="2px solid #00c853"; setTimeout(()=>target.style.outline="",2000); }
        }
      };
      bubble.insertBefore(rq, bubble.firstChild);
    }
  }

  // View Once
  if(data.vo){
    bubble.classList.add("viewOncePending");
    if(!bubble.querySelector(".viewOnceBadge")){
      const badge = document.createElement("span");
      badge.className = "viewOnceBadge";
      badge.textContent = "👁️ Bir kez";
      const expireInfo = bubble.querySelector(".expireInfo");
      if(expireInfo) expireInfo.appendChild(badge);
    }
    // add overlay for other side
    if(!isMine && !bubble.querySelector(".viewOnceOverlay")){
      const overlay = document.createElement("div");
      overlay.className = "viewOnceOverlay";
      overlay.innerHTML = `<div style="font-size:24px;">👁️</div><div>Bir kez gör</div><div style="font-size:10px; opacity:0.7;">Dokun ve basılı tut</div>`;
      overlay.onclick = ()=>{
        bubble.classList.remove("viewOnceBlur");
        overlay.style.display="none";
        // after 5 sec, delete
        setTimeout(()=>{
          const el2 = document.getElementById(msgId);
          if(el2){ el2.style.opacity="0"; setTimeout(()=>el2.remove(), 300); }
          showToast("👁️ Bir kez görüldü ve silindi");
          try{ socket.emit("view-once-opened", {msgId}); }catch(e){}
        }, 5000);
        // mark as opened
        try{ socket.emit("message-opened", {msgId, deleteAt: Date.now()+5000, expireSec:5}); }catch(e){}
      };
      bubble.style.position="relative";
      bubble.appendChild(overlay);
      // blur content
      const msgText = bubble.querySelector(".msgText");
      if(msgText) msgText.classList.add("viewOnceBlur");
      const media = bubble.querySelector(".mediaMessage");
      if(media) media.classList.add("viewOnceBlur");
    }
  }

  // Edited label
  if(data.edited){
    if(!bubble.querySelector(".editedLabel")){
      const ed = document.createElement("span");
      ed.className = "editedLabel";
      ed.textContent = "(düzenlendi)";
      const ticks = bubble.querySelector(".ticks");
      if(ticks) ticks.parentNode.insertBefore(ed, ticks);
      else bubble.appendChild(ed);
    }
  }

  addActionButtonsToMessage(el, msgId, isMine, data.t||"");
}

function addActionButtonsToMessage(msgEl, msgId, isMine, textContent){
  if(msgEl.querySelector(".msgActions")) return;
  const actions = document.createElement("div");
  actions.className = "msgActions";
  // buttons
  const btns = [
    {icon:"↩️", title:"Alıntıla", act:"reply"},
    {icon:"📌", title:"Sabitle", act:"pin"},
    {icon:"⭐", title:"Yıldızla", act:"star"},
    {icon:"↪️", title:"İlet", act:"forward"},
    {icon:"🌐", title:"Çevir", act:"translate"},
  ];
  if(isMine){
    btns.unshift({icon:"✏️", title:"Düzenle", act:"edit"});
  }
  btns.push({icon:"⋯", title:"Daha fazla", act:"more"});

  btns.forEach(b=>{
    const btn = document.createElement("button");
    btn.textContent = b.icon;
    btn.title = b.title;
    btn.dataset.act = b.act;
    btn.onclick = (e)=>{
      e.stopPropagation();
      handleMessageAction(b.act, msgId, isMine, textContent, msgEl);
    };
    actions.appendChild(btn);
  });
  msgEl.appendChild(actions);

  // long press to open menu
  let pressTimer=null;
  const startPress = (e)=>{
    pressTimer = setTimeout(()=>{ openActionMenu(msgId, isMine, textContent, msgEl, e); }, 600);
  };
  const cancelPress = ()=>{ if(pressTimer) clearTimeout(pressTimer); };
  msgEl.addEventListener("touchstart", startPress, {passive:true});
  msgEl.addEventListener("touchend", cancelPress);
  msgEl.addEventListener("mousedown", startPress);
  msgEl.addEventListener("mouseup", cancelPress);
  msgEl.addEventListener("mouseleave", cancelPress);

  // double click quick reply
  msgEl.addEventListener("dblclick", (e)=>{
    e.preventDefault();
    handleMessageAction("reply", msgId, isMine, textContent, msgEl);
  });
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
    case "more":
      openActionMenu(msgId, isMine, text, msgEl, null);
      break;
    case "copy":
      navigator.clipboard.writeText(text).then(()=>showToast("Kopyalandı"));
      break;
    case "delete":
      if(isMine){
        const el = document.getElementById(msgId);
        if(el){ el.style.opacity="0"; setTimeout(()=>el.remove(),300); }
        try{ socket.emit("delete-message", {msgId}); }catch(e){}
        showToast("Silindi");
      }
      break;
  }
}

function openActionMenu(msgId, isMine, text, msgEl, ev){
  const menu = document.getElementById("msgActionMenu");
  if(!menu) return;
  menu.innerHTML="";
  const actions = [
    {icon:"↩️", label:"Alıntıla", act:"reply"},
    {icon:"📌", label:"Sabitle", act:"pin"},
    {icon:"⭐", label: starredMessages.has(msgId) ? "Yıldızı kaldır" : "Yıldızla", act:"star"},
    {icon:"↪️", label:"İlet", act:"forward"},
    {icon:"🌐", label:"Çevir", act:"translate"},
    {icon:"📋", label:"Kopyala", act:"copy"},
  ];
  if(isMine){
    actions.unshift({icon:"✏️", label:"Düzenle", act:"edit"});
    actions.push({icon:"🗑️", label:"Sil", act:"delete"});
  }
  actions.forEach(a=>{
    const btn = document.createElement("button");
    btn.innerHTML = `<span class="icon">${a.icon}</span> ${a.label}`;
    btn.onclick = ()=>{ menu.style.display="none"; handleMessageAction(a.act, msgId, isMine, text, msgEl); };
    menu.appendChild(btn);
  });
  // position
  let x=20, y=100;
  if(ev && ev.touches && ev.touches[0]){ x=ev.touches[0].clientX; y=ev.touches[0].clientY; }
  else if(ev && ev.clientX){ x=ev.clientX; y=ev.clientY; }
  else {
    const rect = msgEl.getBoundingClientRect();
    x = rect.left + 20;
    y = rect.top + 20;
  }
  menu.style.left = Math.min(x, window.innerWidth-200)+"px";
  menu.style.top = Math.min(y, window.innerHeight-200)+"px";
  menu.style.display="block";
}

function showReplyBar(data){
  const bar = document.getElementById("replyPreviewBar");
  if(!bar) return;
  document.getElementById("replyToName").textContent = data.sender;
  document.getElementById("replyToSnippet").textContent = data.snippet;
  bar.style.display="flex";
}
function hideReplyBar(){ const bar=document.getElementById("replyPreviewBar"); if(bar) bar.style.display="none"; }

function showEditBanner(text){
  const bar=document.getElementById("editBanner");
  if(!bar) return;
  document.getElementById("editOriginal").textContent = text.substring(0,60);
  bar.style.display="flex";
  const input=document.getElementById("messageInput");
  if(input){ input.value=text; input.focus(); }
  // hide reply
  hideReplyBar();
}
function cancelEdit(){
  editingMsgId=null;
  editingOriginalText="";
  const bar=document.getElementById("editBanner");
  if(bar) bar.style.display="none";
  const input=document.getElementById("messageInput");
  if(input) input.value="";
}
async function saveEdit(){
  const input=document.getElementById("messageInput");
  const newText = input.value.trim();
  if(!newText || !editingMsgId){ cancelEdit(); return; }
  const el = document.getElementById(editingMsgId);
  if(!el){ cancelEdit(); return; }
  const bubble = el.querySelector(".msgBubble");
  const msgText = bubble.querySelector(".msgText");
  if(msgText){
    const linked = newText.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    msgText.innerHTML = linked;
    // add edited label
    if(!bubble.querySelector(".editedLabel")){
      const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)";
      bubble.appendChild(ed);
    }
  }
  // encrypt and emit edit
  try{
    const payload = {t:newText, edited:true, r: null};
    // try preserve reply if exists
    const rq = bubble.querySelector(".replyQuote");
    if(rq){
      // keep existing replyToData? we lost it, but keep
    }
    const enc = await encryptText(`__GORGOR_JSON__${JSON.stringify({t:newText, edited:true})}`, currentPassword);
    socket.emit("chat-edit", {msgId: editingMsgId, enc, newText, edited:true});
    socket.emit("message-edit", {msgId: editingMsgId, enc}); // try both event names
  }catch(e){}
  showToast("Düzenlendi ✏️");
  cancelEdit();
}

function pinMessage(msgId, text, isMine){
  pinnedMessage = {msgId, text, sender: isMine ? "Ben" : "Karşı", time: Date.now()};
  showPinBar(pinnedMessage);
  try{ socket.emit("pin-message", {msgId, text, sender: myRealUsername, action:"pin"}); }catch(e){}
  showToast("📌 Sabitlendi");
}
function showPinBar(data){
  const bar=document.getElementById("pinBar");
  if(!bar) return;
  document.getElementById("pinSender").textContent = data.sender;
  document.getElementById("pinSnippet").textContent = data.text.substring(0,60);
  bar.style.display="block";
  bar.dataset.msgId = data.msgId;
}
function hidePinBar(){ const bar=document.getElementById("pinBar"); if(bar) bar.style.display="none"; }

function toggleStar(msgId, text, isMine, msgEl){
  if(starredMessages.has(msgId)){
    starredMessages.delete(msgId);
    msgEl.querySelector(".starIcon")?.remove();
    showToast("⭐ Yıldız kaldırıldı");
  }else{
    const data = {id:msgId, text, sender: isMine ? "Ben" : "Karşı", time: Date.now(), isMine};
    starredMessages.set(msgId, data);
    const bubble = msgEl.querySelector(".msgBubble");
    if(bubble && !bubble.querySelector(".starIcon")){
      const star=document.createElement("span"); star.className="starIcon"; star.textContent="⭐";
      bubble.appendChild(star);
    }
    showToast("⭐ Yıldızlandı");
  }
  saveStarred();
}
function saveStarred(){
  try{
    const arr = Array.from(starredMessages.values());
    localStorage.setItem("gorgor_starred", JSON.stringify(arr));
  }catch(e){}
}
function renderStarredPanel(){
  const list=document.getElementById("starredList");
  if(!list) return;
  list.innerHTML="";
  if(starredMessages.size===0){
    list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#666;">Henüz yıldızlı mesaj yok<br/><span style="font-size:12px;">Mesajlara ⭐ basarak kaydedebilirsin</span></div>`;
    return;
  }
  starredMessages.forEach((data, id)=>{
    const div=document.createElement("div");
    div.style.cssText="background:#111; border:1px solid #333; border-radius:12px; padding:10px; cursor:pointer;";
    div.innerHTML = `<div style="font-size:11px; color:#00ff88; margin-bottom:4px;">${escapeHtml(data.sender)} • ${new Date(data.time).toLocaleTimeString()}</div><div style="font-size:13px; color:#fff;">${escapeHtml(data.text.substring(0,120))}</div>`;
    div.onclick = ()=>{
      document.getElementById("starredPanel").style.display="none";
      const target=document.getElementById(id);
      if(target){ target.scrollIntoView({behavior:"smooth", block:"center"}); target.style.outline="2px solid #ffcc00"; setTimeout(()=>target.style.outline="",2000); }
    };
    list.appendChild(div);
  });
}

function forwardMessage(text){
  const fwd = prompt("İletilecek mesaj (düzenleyebilirsin):", text);
  if(fwd===null) return;
  const input=document.getElementById("messageInput");
  if(input){ input.value=fwd; input.focus(); }
  showToast("↪️ İletmeye hazır - Gönder'e bas");
}

async function translateText(text){
  const popup=document.getElementById("translatePopup");
  if(!popup) return;
  document.getElementById("translateOriginal").textContent = text.substring(0,100);
  document.getElementById("translateResult").textContent = "";
  document.getElementById("translateLoading").style.display="block";
  popup.style.display="block";
  try{
    // Use MyMemory free translate API
    const lang = /[ığüşöçİĞÜŞÖÇ]/.test(text) ? "tr|en" : "en|tr";
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${lang}`);
    const data = await res.json();
    const translated = data.responseData?.translatedText || "Çeviri bulunamadı";
    document.getElementById("translateResult").textContent = translated;
  }catch(e){
    // fallback simple
    document.getElementById("translateResult").textContent = "Çeviri hatası, internet kontrol et";
  }
  document.getElementById("translateLoading").style.display="none";
}

async function addPollMessage(msgId, payload, isMine, sentAt){
  const messagesEl = document.getElementById("messages");
  if(!messagesEl) return;
  if(document.getElementById(msgId)) return;
  const div=document.createElement("div");
  div.className = isMine ? "myMessage" : "otherMessage";
  div.id = msgId;
  div._sentAt = sentAt||Date.now();
  div._expireSec = 43200;
  const initial = (isMine ? (myRealUsername||"B") : "K").trim().charAt(0).toUpperCase();
  const clock = formatClock(new Date(div._sentAt));
  div._clock = clock;
  const isChecklist = payload.type==="checklist";
  const bubbleClass = isChecklist ? "msgBubble checklistBubble" : "msgBubble pollBubble";
  let html = `<div class="msgAvatar">${initial}</div><div class="${bubbleClass}"><span class="expireInfo">${clock} • ${isChecklist ? "✅ Checklist" : "📊 Anket"}</span>`;
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
  setTimeout(()=>{ messagesEl.scrollTop=messagesEl.scrollHeight; },10);

  // store
  pollsData.set(msgId, payload);

  // add listeners
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
        // simple vote logic - one vote per user per poll stored in voters map
        const voterKey = myRealUsername||"anon";
        const prev = payload.voters ? payload.voters[voterKey] : undefined;
        if(prev!==undefined){
          if(payload.votes[prev]>0) payload.votes[prev]--;
        }
        payload.votes[idx] = (payload.votes[idx]||0)+1;
        if(!payload.voters) payload.voters={};
        payload.voters[voterKey]=idx;
        // update UI
        const total = payload.votes.reduce((a,b)=>a+b,0);
        div.querySelectorAll(".pollOption").forEach((o,i)=>{
          const perc = total>0 ? Math.round(payload.votes[i]/total*100) : 0;
          o.querySelector(".pollOptionBar").style.width = perc+"%";
          o.querySelector(".pollVotes").textContent = `${payload.votes[i]} oy • ${perc}%`;
        });
        try{ socket.emit("poll-vote", {msgId, idx, voter: voterKey}); }catch(e){}
      });
    });
  }
  addActionButtonsToMessage(div, msgId, isMine, payload.question);
  return msgId;
}

// Search
function performSearch(q){
  clearHighlights();
  searchResults=[];
  currentSearchIdx=-1;
  if(!q || q.trim().length<2){ updateSearchCount(); return; }
  const lower = q.toLowerCase();
  const allMsgs = document.querySelectorAll(".myMessage, .otherMessage");
  allMsgs.forEach(el=>{
    const textEl = el.querySelector(".msgText");
    if(!textEl) return;
    const txt = textEl.textContent.toLowerCase();
    if(txt.includes(lower)){
      searchResults.push(el);
      // highlight
      highlightText(textEl, lower);
    }
  });
  if(searchResults.length>0){
    currentSearchIdx=0;
    focusSearchResult(0);
  }
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
    parent.replaceChild(document.createTextNode(s.textContent), s);
    parent.normalize();
  });
}
function clearSearch(){ clearHighlights(); searchResults=[]; currentSearchIdx=-1; updateSearchCount(); }
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
  if(hl){
    hl.classList.remove("searchHighlight");
    hl.classList.add("searchCurrent");
  }
}
function clearCurrentMark(){
  document.querySelectorAll(".searchCurrent").forEach(s=>{ s.classList.remove("searchCurrent"); s.classList.add("searchHighlight"); });
}
function updateSearchCount(){
  const cnt = document.getElementById("searchCount");
  if(!cnt) return;
  if(searchResults.length===0) cnt.textContent="0/0";
  else cnt.textContent = `${currentSearchIdx+1}/${searchResults.length}`;
}

// Live location
function startLiveLocation(){
  const attachMenu = document.getElementById("attachMenu");
  if(attachMenu) attachMenu.classList.remove("show");
  if(!navigator.geolocation){ showToast("Konum desteklenmiyor"); return; }
  showToast("🗺️ Canlı konum 5dk paylaşılıyor...");
  let watchId=null;
  let count=0;
  const maxUpdates=10; // 5dk, 30sn aralık
  const sendLocation = (pos)=>{
    const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
    const text=`🗺️ Canlı Konum (${count+1}/${maxUpdates}): ${url}`;
    const input=document.getElementById("messageInput");
    // directly send
    (async ()=>{
      const expire = typeof getExpireFromSelect==="function" ? getExpireFromSelect() : 43200;
      const msgId = await addMyMessage(text, expire, myRealUsername);
      const enc = await encryptText(text, currentPassword);
      try{ socket.emit("chat-message", {msgId, enc, expireSec: expire, sentAt: Date.now(), deleteAt: Date.now()+expire*1000, realUsername: myRealUsername}); }catch(e){}
    })();
  };
  navigator.geolocation.getCurrentPosition(pos=>{ sendLocation(pos); count++; watchId = navigator.geolocation.watchPosition(pos2=>{
    count++;
    if(count>=maxUpdates){
      if(watchId) navigator.geolocation.clearWatch(watchId);
      showToast("Canlı konum bitti");
      return;
    }
    sendLocation(pos2);
  }, null, {enableHighAccuracy:true}); }, null, {enableHighAccuracy:true});
  // auto stop after 5 min
  setTimeout(()=>{ if(watchId) navigator.geolocation.clearWatch(watchId); showToast("Canlı konum sona erdi"); }, 5*60*1000);
}

// Socket harman events
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
          const linked = txt.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
          msgText.innerHTML = linked;
          if(!bubble.querySelector(".editedLabel")){
            const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)";
            bubble.appendChild(ed);
          }
        }
      }catch(e){}
    });
    socket.on("message-edit", async (data)=>{
      // alias
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
            const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)";
            bubble.appendChild(ed);
          }
        }
      }catch(e){}
    });
    socket.on("pin-message", (data)=>{
      if(data.action==="unpin"){
        pinnedMessage=null;
        hidePinBar();
        return;
      }
      if(data.msgId){
        pinnedMessage = {msgId: data.msgId, text: data.text||"Sabit mesaj", sender: data.sender||"Karşı"};
        showPinBar(pinnedMessage);
      }
    });
    socket.on("poll-vote", (data)=>{
      const poll = pollsData.get(data.msgId);
      if(!poll || poll.type==="checklist") return;
      // apply vote
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
        o.querySelector(".pollOptionBar").style.width = perc+"%";
        o.querySelector(".pollVotes").textContent = `${poll.votes[i]} oy • ${perc}%`;
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
    socket.on("view-once-opened", (data)=>{
      const el = document.getElementById(data.msgId);
      if(el){
        showToast("👁️ Karşı taraf bir kez görülen mesajı açtı");
        el.style.opacity="0.5";
        setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>el.remove(),300); }, 3000);
      }
    });
    socket.on("delete-message", (data)=>{
      const el=document.getElementById(data.msgId);
      if(el){ el.style.opacity="0"; setTimeout(()=>el.remove(),300); }
    });
  }catch(e){ console.log("harman socket init hata", e); }
}

// Helpers
function escapeHtml(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Override sendBtn to handle edit mode
const _origSendOnclick = null;
document.addEventListener("DOMContentLoaded", ()=>{
  const sendBtn = document.getElementById("sendBtn");
  if(sendBtn){
    const orig = sendBtn.onclick;
    sendBtn.addEventListener("click", (e)=>{
      // if editing, handled by editSave, not send
      if(editingMsgId){
        e.stopPropagation();
        e.preventDefault();
        saveEdit();
        return false;
      }
    }, true);
  }
  const input = document.getElementById("messageInput");
  if(input){
    input.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" && editingMsgId){
        e.preventDefault();
        saveEdit();
      }
    });
  }
});

// Show toast if not defined
if(typeof showToast!=="function"){
  window.showToast = function(msg){
    let t=document.getElementById("gorgorToast");
    if(!t){ t=document.createElement("div"); t.id="gorgorToast"; t.style.cssText="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #333;color:#fff;padding:10px 16px;border-radius:20px;font-size:12px;z-index:99999;max-width:80%;text-align:center;"; document.body.appendChild(t); }
    t.textContent=msg; t.style.display="block"; t.style.opacity="1"; setTimeout(()=>{ t.style.opacity="0"; setTimeout(()=>t.style.display="none",300); },3000);
  };
}

console.log("V22 HARMAN - tum ozellikler yuklendi: reply, edit 15dk, pin, star, search, forward, viewOnce, translate, poll/checklist, live location, quick react");