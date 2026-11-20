/* Математика: Алгебра 10 класс — логика олимпиадного трека */
(function(){
"use strict";

var $ = function(s, r){ return (r||document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

/* ============================================================
   ХРАНИЛИЩЕ: аккаунты, классы, домашка, сессия, прогресс по пользователю
   ============================================================ */
var K={
  users:"math10_users",
  classes:"math10_classes",
  homework:"math10_homework",
  session:"math10_session",
  curClass:"math10_curclass",     // текущий выбранный класс (для подвкладки «Классы»)
  content:"math10_content"   // кастомные видео/конспекты модулей
};
function storeGet(k,def){ try{ return JSON.parse(localStorage.getItem(k)||"null")||def; }catch(e){ return def; } }
function storeSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

// Аккаунты: users[login] = {login, pass, name, role:'student'|'teacher'|'admin', className, groupTeacher}
function getUsers(){ var u=storeGet(K.users,{}); if(!u["Nasv1"]) u["Nasv1"]={login:"Nasv1",pass:"16AKo1709=",name:"Администратор",role:"admin",className:""}; return u; }
function saveUsers(u){ storeSet(K.users,u); if(window.DB&&window.DB.push) window.DB.push(K.users,u); }
// Классы: [{name, teacher (логин преподавателя), students:[{login,name}]}]
function getClasses(){ return storeGet(K.classes,[]); }
function saveClasses(c){ storeSet(K.classes,c); if(window.DB&&window.DB.push) window.DB.push(K.classes,c); }
function getHomework(){ var h=storeGet(K.homework,[]); return Array.isArray(h)?h:[]; }
function saveHomework(h){ storeSet(K.homework,h); if(window.DB&&window.DB.push) window.DB.push(K.homework,h); }
// Контент модулей (переопределения): math10_content[moduleId] = { conspect?, videoName?, videoBase64? }
function getContent(){ return storeGet(K.content,{}); }
function saveContent(c){ storeSet(K.content,c); if(window.DB&&window.DB.push) window.DB.push(K.content,c); }
var prevCFG={};

/* ---------- Права на редактирование контента ---------- */
// Редактировать конспект/видео могут: администратор и преподаватель, ведущий группу.
function isTeacherRole(u){ return u && (u.role==="teacher"||u.role==="admin"); }
function canEditContent(u){
  if(!u) return false;
  if(u.role==="admin") return true;
  if(u.role==="teacher") return true;
  return false;
}

function getSession(){ return storeGet(K.session,""); }
function setSession(login){ storeSet(K.session, login||""); }

// Прогресс конкретного пользователя хранится отдельно
function progKey(login){ return "math10_prog_"+login; }
function defaultProgress(user){
  return {
    user: user||{ login:"", name:"", role:"student", registered:true },
    xp:0, solvedTotal:0, correctTotal:0, bestStreak:0, streak:0,
    errorsClosed:0, modulesCompleted:0, olympiads:0, perfectOlymp:0,
    skills:{ calc:0, solve:0, exp:0, experiment:0, analysis:0 },
    solvedTasks:{}, modStat:{}, customBank:[], achievementsOpen:{}
  };
}
function loadProgress(login){
  var u=null; try{ u=getUsers()[login]; }catch(e){}
  var p;
  try{ p=JSON.parse(localStorage.getItem(progKey(login))||"null")||defaultProgress(u); }
  catch(e){ p=defaultProgress(u); }
  if(u){ p.user=u; }
  if(!p.skills) p.skills={calc:0,solve:0,exp:0,experiment:0,analysis:0};
  if(!p.solvedTasks) p.solvedTasks={};
  if(!p.modStat) p.modStat={};
  if(!p.customBank) p.customBank=[];
  if(!p.achievementsOpen) p.achievementsOpen={};
  return p;
}
function saveProgress(){ if(!P) return; try{ localStorage.setItem(progKey(P.user.login||""), JSON.stringify(P)); }catch(e){} if(window.DB&&window.DB.push) window.DB.push(progKey(P.user.login||""), P); }

var P=null;            // прогресс текущего пользователя
var currentLogin="";   // текущий логин ("" — гость)

function currentUser(){
  var l=getSession();
  if(!l) return null;
  var u=getUsers()[l];
  if(!u){ setSession(""); return null; }
  return u;
}

/* ---------- Олимпиады по математике (перечень РСОШ 2026/27) ---------- */
// Каждая запись: {level: 1|2|3, name: "…"}.
var OLYMPIADS_MATH=[
  { level:1, name:"Московская олимпиада школьников" },
  { level:1, name:"Олимпиада школьников «Ломоносов»" },
  { level:1, name:"Олимпиада школьников «Покори Воробьёвы горы!»" },
  { level:1, name:"Олимпиада школьников «Физтех»" },
  { level:1, name:"Отраслевая олимпиада школьников «Росатом»" },
  { level:1, name:"Всесибирская открытая олимпиада школьников" },
  { level:1, name:"Турнир городов" },
  { level:1, name:"Турнир имени М.В. Ломоносова" },
  { level:2, name:"Олимпиада «Курчатов»" },
  { level:2, name:"Олимпиада школьников «Физтех» (математика)" },
  { level:2, name:"Олимпиада школьников СПбГУ" },
  { level:2, name:"Олимпиада «Высшая проба»" },
  { level:2, name:"Интернет-олимпиада школьников" },
  { level:2, name:"Межрегиональные предметные олимпиады КФУ" },
  { level:2, name:"Олимпиада школьников «Шаг в будущее»" },
  { level:3, name:"Объединённая межвузовская олимпиада школьников" },
  { level:3, name:"Олимпиада школьников «Надежда энергетики»" },
  { level:3, name:"Олимпиада «Будущее Сибири»" },
  { level:3, name:"Открытая региональная межвузовская олимпиада школьников ОРМО" },
  { level:3, name:"Отраслевая олимпиада школьников «Газпром»" },
  { level:3, name:"Университетская олимпиада школьников «Бельчонок»" },
  { level:0, mp:true, name:"ВсОШ (школьный этап)" },
  { level:0, mp:true, name:"ВсОШ (муниципальный этап)" }
];
// Вспомогательные функции для олимпиад (уровень/МинПрос)
function olympChipClass(o){ return o&&o.mp ? "clvl-mp" : (o.level===1?"clvl-i":(o.level===2?"clvl-ii":"clvl-iii")); }
function olympChipLabel(o){ return o&&o.mp ? "МинПрос" : String(o.level); }
function olympChipText(o){ return o&&o.mp ? "МинПрос" : ("Уровень "+o.level); }
// Отметки: math10_olympiads = { className: { <index олимпиады>: { login: true } } }
var OLYM_KEY="math10_olympiads";
function getOlympMarks(){ return storeGet(OLYM_KEY,{}); }
function saveOlympMarks(m){ storeSet(OLYM_KEY,m); if(window.DB&&window.DB.push) window.DB.push(OLYM_KEY,m); }
function olympClassOf(u){
  // определяем имя класса: у учителя/админа — его группа, у ученика — его класс
  if(!u) return "";
  if(u.role==="teacher") return u.groupTeacher||"";
  if(u.role==="admin") return "";
  return u.className||"";
}
function olympStudentsOf(clsName){
  // возвращает массив {login,name} учеников класса
  if(!clsName) return [];
  var cls=(getClasses()||[]).filter(function(c){return c.name===clsName;})[0];
  if(!cls||!cls.students) return [];
  return cls.students.slice();
}

/* ---------- Вход / выход ---------- */
function doLogin(){
  var login=($("#login-login")?$("#login-login").value:"").trim();
  var pass=$("#login-pass")?$("#login-pass").value:"";
  if(!login){ toast("Введи логин"); return; }
  var u=getUsers()[login];
  if(!u || u.pass!==pass){ toast("Неверный логин или пароль"); return; }
  currentLogin=login; setSession(login);
  P=loadProgress(login);
  afterAuth(); toast("Добро пожаловать, "+u.name+"!");
}
function doLogout(){
  if(!confirm("Выйти из аккаунта?")) return;
  currentLogin=""; setSession("");
  P=loadProgress(""); // пустышка для гостя
  afterAuth(); toast("Вы вышли");
}
function afterAuth(){
  refreshNav();
  renderDashboard();
  renderModuleGrid();
  showView("dashboard");
  if($("#view-dashboard")) renderDashboard();
}
function refreshNav(){
  var u=currentUser();
  $$(".nav-btn").forEach(function(b){ b.style.display=""; });
  // Классы — преподавателю и администратору
  var obt=$("#classes-nav-btn");
  if(obt){ obt.style.display = (u && (u.role==="teacher"||u.role==="admin")) ? "" : "none"; }
  // Моя статистика — ученику
  var myst=$("#mystats-nav-btn");
  if(myst){ myst.style.display = (u && u.role==="student") ? "" : "none"; }
  // гость видит только кабинет (для входа)
  if(!u){
    $$(".nav-btn[data-view]").forEach(function(b){ var v=b.getAttribute("data-view"); b.style.display = (v==="profile")?"":"none"; });
  }
}
var hideGuestNav=function(){
  // Гость не должен решать: оставим модули/банк доступными только после входа
  var u=currentUser();
  if(!u){
    $$(".nav-btn[data-view]").forEach(function(b){
      var v=b.getAttribute("data-view");
      if(v==="profile") b.style.display=""; else b.style.display="none";
    });
  }
};

/* ---------- Задачи ---------- */
// Собрать все задачи из тем (subs.tasks) всех блоков
function themeTasks(moduleId){
  var out=[];
  if(typeof OLYMP_LESSONS==="undefined") return out;
  var L=OLYMP_LESSONS;
  for(var mid in L){ if(moduleId && mid!==moduleId) continue; var ls=L[mid]; if(!ls||!ls.subs||!ls.subs.length) continue;
    ls.subs.forEach(function(s,si){ (s.tasks||[]).forEach(function(t,i){ var c=t; c.theme=mid+"__"+si; if(!c.module)c.module=mid; if(!c.id)c.id="kin_"+mid+"_"+si+"_"+i; out.push(c); }); });
  }
  return out;
}
function tasksOfSub(sub,mid){
  return (sub&&sub.tasks||[]).map(function(t){ var c=t; c.theme=mid+"__"+0; if(!c.module)c.module=mid; return c; });
}
function allTasks(){ return (typeof OLYMP_TASKS!=="undefined"&&OLYMP_TASKS.length?OLYMP_TASKS:[]).concat(themeTasks()).concat(P&&P.customBank?P.customBank:[]); }
function tasksOf(moduleId){ var t=allTasks(); return t.filter(function(x){return x.module===moduleId;}); }

/* ---------- Toast ---------- */
var toastTimer;
function toast(msg){ var t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(function(){t.hidden=true;},2800); }

/* ---------- Навигация ---------- */
function showView(name){
  $$(".view").forEach(function(v){ v.classList.remove("active"); });
  var el=$("#view-"+name); if(el) el.classList.add("active");
  $$(".nav-btn").forEach(function(b){ b.classList.toggle("active", b.getAttribute("data-view")===name); });
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="dashboard") renderDashboard();
  if(name==="modules") renderModuleGrid();
  if(name==="module") renderModuleWorkspace();
  if(name==="bank"){ fillBankModuleFilter(); renderBank(); }
  if(name==="kodifikator"){ renderKodifikator(); }
  if(name==="classes") renderClassesView();
  if(name==="class") renderClassWorkspace();
  if(name==="mystats"){ if(!currentUser()||currentUser().role!=="student"){ showView("profile"); return; } renderStudentStats(); }
  if(name==="achievements") renderAchievements();
  if(name==="profile") renderProfile();
  if(name==="admin") renderAdmin();
}
$$(".nav-btn").forEach(function(b){ b.addEventListener("click", function(){ showView(b.getAttribute("data-view")); }); });
$$("[data-view-btn]").forEach(function(b){ b.addEventListener("click", function(){ showView(b.getAttribute("data-view-btn")); }); });

/* ---------- Трек-уровень ---------- */
function trackLevelInfo(){
  if(!P) return {level:1,name:"Гость",lo:0,hi:null};
  var level=1,name="Новичок";
  for(var i=OLYMP_TRACK_LEVELS.length-1;i>=0;i--){ if(P.xp>=OLYMP_TRACK_LEVELS[i].xp){ level=OLYMP_TRACK_LEVELS[i].level; name=OLYMP_TRACK_LEVELS[i].name; break; } }
  var cur=OLYMP_TRACK_LEVELS.filter(function(l){return l.level===level;})[0];
  var hi=(level<OLYMP_TRACK_LEVELS.length)?OLYMP_TRACK_LEVELS[level].xp:null;
  return { level:level, name:name, lo:cur.xp, hi:hi };
}

/* ---------- Мастерство модуля ---------- */
var moduleMasteryPct;
moduleMasteryPct=function(moduleId){
  if(!P) return 0;
  var tsk=tasksOf(moduleId); if(!tsk.length) return 0;
  var ok=tsk.filter(function(t){ var st=P.solvedTasks[t.id]; return st&&st.status==="ok"; }).length;
  return Math.round(100*ok/tsk.length);
};
function moduleUnlocked(moduleId){
  // Все блоки открыты сразу для всех пользователей
  var m=olympModuleMeta(moduleId);
  return m ? true : false;
}
function masterProg(moduleId){ return moduleMasteryPct(moduleId); }
function moduleCompletedCount(){ if(!P) return 0; return OLYMP_MODULES.filter(function(m){return moduleMasteryPct(m.id)>=100;}).length; }
/* ---------- Очки навыков ---------- */
function skillGains(task){
  var g={calc:0,solve:0,exp:0,experiment:0,analysis:0};
  var lvl=task.level||"active";
  var amt = lvl==="olimp"?12: lvl==="active"?8:5;
  var type=task.type||"calc";
  if(type==="experiment"){ g.experiment+=amt; }
  else if(type==="expert"){ g.analysis+=amt; g.exp+=amt; }
  else if(type==="test"){ g.calc+=amt; g.solve+=amt; }
  else { g.calc+=amt; g.exp+=amt; g.solve+=amt; }
  return g;
}
function addSkillGains(g){ ["calc","solve","exp","experiment","analysis"].forEach(function(k){ P.skills[k]=Math.round(Math.min(100,(P.skills[k]||0)+(g[k]||0))); }); }

/* ---------- Достижения ---------- */
function stats(){
  return { solvedTotal:P.solvedTotal, correctTotal:P.correctTotal, bestStreak:P.bestStreak,
    errorsClosed:P.errorsClosed, modulesCompleted:P.modulesCompleted, olympiads:P.olympiads,
    skillCalc:P.skills.calc, skillSolve:P.skills.solve, skillExp:P.skills.exp,
    skillAnal:P.skills.analysis, skillExp2:P.skills.experiment,
    didBoost:!!P.didBoost, perfectOlymp:P.perfectOlymp };
}
function checkAchievements(){
  var newly=[];
  OLYMP_ACHIEVEMENTS.forEach(function(a){
    if(P.achievementsOpen[a.id]) return;
    if(a.check && a.check(stats())){ P.achievementsOpen[a.id]=true; P.xp+=a.xp; newly.push(a); }
  });
  if(newly.length){ saveProgress(); toast("Достижение: "+newly[0].name+" (+"+newly[0].xp+" XP)"); renderDashboard(); }
}

/* ---------- Сравнение ответов ---------- */
function normalize(s){
  s = String(s)
    .replace(/\u2212/g,"-")            // типографский минус − → обычный дефис
    .replace(/[–—]/g,"-")              // длинные тире → минус
    .replace(/\s+/g," ").trim().toLowerCase()
    .replace(/,/g,".");
  // убираем завершающую точку у числа (напр. "2." или "-3."), но не у "3.14"
  s = s.replace(/\.$/,"").trim();
  return s;
}
function fuzzyEquals(a,b){
  a=normalize(a||""); b=normalize(b||"");
  if(!a||!b) return false;
  if(a===b) return true;
  var va=val(a), vb=val(b);
  if(va!==null && vb!==null && va!==0 && vb!==0) return Math.abs(va-vb)/Math.max(Math.abs(va),Math.abs(vb)) < .05;
  if(va!==null && vb!==null && va===0 && vb===0) return true;   // "0" = "0,0" = "0/5"
  return a.indexOf(b)>=0 || b.indexOf(a)>=0;
}
// Числовое значение строки: дроби ("3/4"), десятичные ("0.75"), π ("пи"/"2пи/3") — иначе null.
function val(s){
  s = String(s||"").replace(/\s+/g,"").replace(/[\u2212\u2013\u2014]/g,"-").toLowerCase().replace(/^\+/,"");
  if(!s) return null;
  // запятая как десятичный разделитель — только если между цифрами (0,5), иначе это список (a, b) → null
  if(/,/.test(s) && !/\d,\d/.test(s)) return null;
  s = s.replace(/,/g,".");
  s = s.replace(/π/g,"пи").replace(/пи/g,"пи").replace(/pi/g,"пи");
  var pi=Math.PI;
  if(s==="пи") return pi;
  function evalExpr(expr){
    expr = expr.replace(/пи/g,"("+pi+")");
    if(/^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/.test(expr)){ return parseFloat(expr); }
    var m=expr.match(/^([-+]?\d*\.?\d+)\s*\/\s*([-+]?\d*\.?\d+)$/);
    if(m){ var d=parseFloat(m[2]); if(d===0) return null; return parseFloat(m[1])/d; }
    return null;
  }
  // 2пи/3, 2*пи/3, (2/3)пи, (2/3)*пи, 12пи, 2*пи
  var m = s.match(/^\(?([-+]?\d*\.?\d+(?:\/\d*\.?\d+)?)\)?\s*(\*?\s*пи\s*(?:\/\s*([-+]?\d*\.?\d+))?)?$/);
  if(m && m[0]===s){
    var base=evalExpr(m[1]);
    if(base===null) return null;
    if(!m[2]) return base;                       // просто число или дробь
    var piFactor=pi;
    if(m[3]){ var dd=parseFloat(m[3]); if(dd===0) return null; piFactor=pi/dd; }
    return base*piFactor;
  }
  return evalExpr(s);
}
function correctOptIndex(t){ return (t.options||[]).indexOf(t.answer); }
// Сравнение ответа-«списка корней через запятую» с ожидаемым набором.
// user="1,5, π/3" expected=«π/3;1,5» → true (порядок не важен, знак пи/числа сравниваются с допуском).
function splitAnswersString(s){ return String(s||"").split(/[;,\n]+/).map(function(x){return x.trim();}).filter(Boolean); }
function fuzzyEqualsList(user, expected){
  var u=splitAnswersString(user), e=splitAnswersString(expected);
  if(!u.length||!e.length) return false;
  if(u.length!==e.length) return false;
  // мультимножественное сравнение: каждый пользовательский ответ должен совпасть с каким-то ожидаемым
  var used=[];
  for(var i=0;i<u.length;i++){
    var ok=false;
    for(var j=0;j<e.length;j++){
      if(used.indexOf(j)>=0) continue;
      if(fuzzyEquals(u[i],e[j])){ ok=true; used.push(j); break; }
    }
    if(!ok) return false;
  }
  return true;
}
function judgeAnswer(t, userVal){
  if(t.type==="test"){ return (t.options||[]).indexOf(t.answer)>=0; }
  // Если эталон — одно число (в т.ч. десятичная дробь с запятой "0,5"), сравниваем как число.
  if(val(t.answer)!==null) return fuzzyEquals(userVal, t.answer);
  // Иначе — набор корней через запятую/точку с запятой, порядок не важен.
  return fuzzyEqualsList(userVal, t.answer);
}

/* ---------- ОТПРАВКА ЗАДАЧ МОДУЛЯ ---------- */
function submitAllTasks(){
  var mid=currentModuleId; if(!mid||!P) return;
  var toEval=tasksOf(mid).filter(function(t){ var st=P.solvedTasks[t.id]; return !st||st.status!=="ok"; });
  if(!toEval.length){ toast("Все задачи блока уже решены верно"); checkModuleDone(mid); return; }
  var anyWrong=false;
  toEval.forEach(function(t){
    var st=P.solvedTasks[t.id]||{attempts:0}; st.attempts++;
    var ok=false;
    if(t.type==="test"){ ok=(st.selected!==undefined&&st.selected===correctOptIndex(t)); }
    else { var v=$("#ans_"+t.id); if(v) st.answer=v.value; ok=judgeAnswer(t, st.answer); }
    if(ok&&st.status!=="ok"){ st.status="ok"; markCorrect(t,st); }
    else if(!ok){ st.status="wrong"; anyWrong=true; }
    P.solvedTasks[t.id]=st;
  });
  saveProgress();
  if(anyWrong){
    var ms=P.modStat[mid]||{badSubmits:0,revealed:false};
    ms.badSubmits=(ms.badSubmits||0)+1;
    if(ms.badSubmits>=3){ ms.revealed=true; P.modStat[mid]=ms; toast("Ответы открыты. Изменить их больше нельзя."); }
    else { P.modStat[mid]=ms; toast("Попытка "+ms.badSubmits+"/3 · исправь неверные задачи"); }
  }
  saveProgress();
  renderModuleWorkspace(); checkModuleDone(mid); checkAchievements();
  if(!anyWrong) toast("Блок пройден! Все задачи верны 🎉");
}
function markCorrect(t,st){
  st.wasOk=true;
  P.solvedTotal=(P.solvedTotal||0)+1;
  P.correctTotal=(P.correctTotal||0)+1;
  P.streak=(P.streak||0)+1;
  if(P.streak>P.bestStreak) P.bestStreak=P.streak;
  P.xp+=OLYMP_XP[t.level]||15;
  addSkillGains(skillGains(t));
}
function checkModuleDone(mid){ if(moduleMasteryPct(mid)>=100){ renderDashboard(); renderModuleGrid(); } }

/* ---------- Текущий модуль ---------- */
var currentModuleId=null;
var currentSubId=-1;   // открытая тема (сессионно, не сохраняется): -1 = список тем
function openModule(mid){ currentModuleId=mid; currentSubId=-1; showView("module"); }

/* ---------- Грид модулей ---------- */
function renderModuleGrid(){
  var wrap=$("#module-grid"); if(!wrap) return;
  if(!currentUser()){ wrap.innerHTML='<div class="empty"><span class="big">🔐</span>Войди в аккаунт, чтобы проходить блоки.</div>'; return; }
  var html='<div class="module-grid">';
  OLYMP_MODULES.forEach(function(m){
    var unlocked=moduleUnlocked(m.id), prog=masterProg(m.id), complete=prog>=100;
    var ms=P.modStat[m.id];
    var state="";
    if(complete) state='<span class="mt-state" style="color:var(--good)">✓ зачтён</span>';
    else if(!unlocked) state='<span class="mt-state" style="color:var(--muted)">🔒 '+m.req+': 100%</span>';
    else state='<span class="mt-state" style="color:var(--electro)">доступен</span>';
    var lvl='<div class="mt-lvl-badges">'+OLYMP_LEVELS.map(function(l){return '<span style="background:'+l.color+'">'+l.name+'</span>';}).join("")+'</div>';
    var cls='mod-tile '+(complete?'complete':unlocked&&!complete?'available':'locked')+(currentModuleId===m.id?' active-now':'');
    html+='<div class="'+cls+'" style="border-top-color:'+m.color+'" data-mod="'+m.id+'">'
      +'<div class="mt-top"><span class="mt-no">Блок '+m.no+'</span><span class="mt-icon">'+m.icon+'</span></div>'
      +'<h3>'+m.name+'</h3><div class="mt-desc">'+m.desc+'</div>'+lvl
      +'<div class="mt-prog"><span class="mt-bar"><i style="width:'+prog+'%"></i></span><span>'+prog+'%</span></div>'
      +'<div class="mt-top"><span class="mt-state">'+state+'</span>'
      +(ms&&ms.badSubmits>0?'<span class="mt-state" style="color:var(--heat)">попыток: '+ms.badSubmits+'/3</span>':'')+'</div>'
      +(unlocked?'<button class="btn btn-primary btn-sm mt-action">'+(complete?'Повторить':'Начать')+' →</button>':'')
      +'</div>';
  });
  html+='</div>';
  wrap.innerHTML=html;
  $$(".mod-tile[data-mod] .mt-action").forEach(function(b){ b.addEventListener("click",function(e){ e.stopPropagation(); openModule(b.closest(".mod-tile").getAttribute("data-mod")); }); });
  $$(".mod-tile.available").forEach(function(c){ c.addEventListener("click",function(){ openModule(c.getAttribute("data-mod")); }); });
}

/* ---------- Рабочая область модуля ---------- */
function renderModuleWorkspace(){
  var mid=currentModuleId; if(!mid||!currentUser()){ showView("modules"); return; }
  var m=olympModuleMeta(mid);
  var prog=masterProg(mid), complete=prog>=100;
  var ms=P.modStat[mid]||{badSubmits:0,revealed:false};
  $("#mod-head").innerHTML='<div class="mod-head"><div class="mh-icon" style="background:'+m.color+'">'+m.icon+'</div>'
    +'<div><h2>'+m.no+'. '+m.name+'</h2><div class="mh-meta">'+m.desc+'</div></div>'
    +'<div class="mh-state">'+(complete?'<span class="state-tag state-ok">✓ зачтён</span>':'<span class="state-tag state-new">'+prog+'%</span>')+'</div></div>';
  var lesson=OLYMP_LESSONS[mid];
  var content=getContent();
  var cust=content[mid]||{};
  var canEdit=canEditContent(currentUser());
  var subs = lesson && lesson.subs && lesson.subs.length ? lesson.subs : null;
  var lh='<div class="mod-lesson">';
  if(!lesson){
    lh+='<div class="lock-gate">Конспект блока не найден.</div>';
  } else if(subs){
    // === БЛОК СОДЕРЖИТ ТЕМЫ: внутри блока ТОЛЬКО список тем ===
    var curSub=currentSubId;
    if(curSub<0 || curSub>=subs.length){
      // Режим 1: показать только карточки тем
      lh+='<div class="subs-wrap" id="subs-wrap" data-mid="'+mid+'">'
        +'<div class="subs-head"><h3 class="subs-title">📚 Темы блока «'+escapeHtml(m.name)+'»</h3>'
        +'<div class="subs-count">'+subs.length+' тем</div></div>'
        +'<p class="muted" style="font-size:13px;margin:4px 0 10px">Выбери тему: внутри будет видео, конспект и задачи.</p>'
        +'<div class="subs-grid">';
      subs.forEach(function(s,i){
        lh+='<div class="sub-card" data-sub="'+i+'">'
          +'<div class="sc-top"><span class="sc-icon">'+(s.icon||"📘")+'</span>'
          +(s.tasks&&s.tasks.length?'<span class="sc-open-tag sub-count-badge">'+s.tasks.length+' задач</span>':'')
          +'</div>'
          +'<h3 class="sc-name">'+escapeHtml(s.name)+'</h3>'
          +(s.desc?'<div class="sc-desc">'+escapeHtml(s.desc)+'</div>':'')
          +'<div class="sc-num">Тема '+(i+1)+'</div>'
          +'</div>';
      });
      lh+='</div></div>';
    } else {
      // Режим 2: открыта тема — видео + (кнопка редактирования над конспектом) + конспект + задачи
      var sub=subs[curSub];
      lh+='<div class="sub-open-head">'
        +'<button class="btn btn-sm" id="sub-back">← Ко всем темам</button>'
        +'<h3 class="sub-open-title">'+escapeHtml(sub.name)+'</h3></div>';
      // Кнопка редактирования конспекта НАД конспектом
      if(canEdit){
        lh+='<div class="conspect-edit-top"><button class="btn btn-sm" id="edit-conspect">✏️ Редактировать конспект</button></div>';
      }
      // Конспект темы
      lh+='<div class="lesson-conspect" id="conspect-box">';
      var subBody = (cust.subBodies && cust.subBodies[curSub] !== undefined && cust.subBodies[curSub] !== null) ? cust.subBodies[curSub] : (sub.body||"");
      if(String(subBody).trim()){ lh+='<div class="conspect-body" id="lesson-body">'+renderConspectText(subBody)+'</div>'; }
      else { lh+='<div class="muted" style="font-size:13px">Содержимое темы пока не заполнено.</div>'; }
      lh+='</div>';
      // Задачи темы
      if(sub.tasks&&sub.tasks.length){
        lh+='<div class="mod-tasks" id="theme-tasks" data-mid="'+mid+'" data-sub="'+curSub+'">'
          +'<div class="mt-title">✏️ Задачи темы «'+escapeHtml(sub.name)+'»</div>'
          +'<div class="mt-sub">Реши задачи, затем нажми «Отправить задачи темы» для самопроверки.</div>'
          +'</div>';
      }
    }
  } else {
    // === БЛОК БЕЗ ТЕМ: старый вариант (конспект блока) ===
    if(canEdit){
      lh+='<div class="conspect-edit-top"><button class="btn btn-sm" id="edit-conspect">✏️ Редактировать конспект</button></div>';
    }
    lh+='<div class="lesson-conspect" id="conspect-box">';
    var bodyText2 = cust.lessonBody;
    if(bodyText2===undefined || bodyText2===null){ bodyText2 = buildDefaultLessonBody(lesson, cust); }
    if(String(bodyText2).trim()){ lh+='<div class="conspect-body" id="lesson-body">'+renderConspectText(bodyText2)+'</div>'; }
    else { lh+='<div class="muted" style="font-size:13px">Содержимое блока пока не заполнено.</div>'; }
    lh+='</div>';
  }
  lh+='</div>';
  $("#mod-lesson").innerHTML=lh;
  applyMath($("#mod-lesson"));
  // Обработчики
  var tbox=$("#theme-tasks");
  if(tbox){
    var si=parseInt(tbox.getAttribute("data-sub"),10)||0;
    var tasks=(subs&&subs[si]&&subs[si].tasks)||[];
    tbox.innerHTML=renderThemeTasks(tasks, mid, si);
    applyMath(tbox);
    var sb=$("#theme-submit"); if(sb) sb.addEventListener("click",function(){ submitThemeTasks(mid, si); });
  }
  var nav=$("#subs-wrap");
  if(nav){
    nav.addEventListener("click",function(ev){
      var c=ev.target.closest?ev.target.closest(".sub-card"):null;
      if(!c) return;
      var i=parseInt(c.getAttribute("data-sub"),10);
      currentSubId=i;
      renderModuleWorkspace();
    });
  }
  var sbk=$("#sub-back");
  if(sbk) sbk.addEventListener("click",function(){
    currentSubId=-1;
    renderModuleWorkspace();
  });

  // ---- Обработчики редактирования (teacher/admin) ----
  var tt=$("#to-tasks"); if(tt) tt.addEventListener("click",function(){ renderModuleTasks(); });
  if(canEdit){
    var uf=$("#up-video-file");
    if($("#up-video")&&uf){ $("#up-video").addEventListener("click",function(){ uf.click(); });
      uf.addEventListener("change",function(e){
        var f=e.target.files&&e.target.files[0]; if(!f) return;
        if(f.size>15*1024*1024){ toast("Файл больше 15 МБ — не сохраню"); this.value=""; return; }
        var r=new FileReader();
        r.onload=function(){
          var cc=getContent(); cc[mid]=cc[mid]||{}; cc[mid].videoBase64=String(r.result);
          saveContent(cc); toast("Видео загружено"); renderModuleWorkspace();
        };
        r.readAsDataURL(f); this.value="";
      });
    }
    if($("#del-video")) $("#del-video").addEventListener("click",function(){
      var cc=getContent(); if(cc[mid]){ delete cc[mid].videoBase64; } saveContent(cc); toast("Видео удалено"); renderModuleWorkspace();
    });
    if($("#edit-conspect")) $("#edit-conspect").addEventListener("click",function(){ openConspectEditor(mid); });
  }
  renderModuleTasks();
}
/* ---------- Разметка конспекта ---------- */
// Порядок важен: сначала экранируем HTML, потом применяем свою разметку.
function inlineFmt(s){
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  // формулы: инлайн $...$ рендерит KaTeX (см. applyMath)
  var colors={red:'#d9432f',green:'#2f9e63',blue:'#2f6fed',orange:'#e8890c',violet:'#7d5ba6'};
  Object.keys(colors).forEach(function(c){
    var re=new RegExp('\\['+c+'\\]([\\s\\S]*?)\\[/'+c+'\\]','g');
    s = s.replace(re, '<span style="color:'+colors[c]+';font-weight:600">$1</span>');
  });
  // картинка ![подпись](url)
  s = s.replace(/!\[([^\]]*)\]\(([^\s()]+)\)/g, function(_,alt,url){
    return '<img class="cc-img" src="'+url+'" alt="'+alt+'">';
  });
  // ссылка [текст](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
function buildDefaultLessonBody(lesson, cust){
  var parts=[];
  parts.push("# 📘 Конспект блока");
  var plan = cust.conspectPlan && cust.conspectPlan.length ? cust.conspectPlan : (lesson.plan||[]);
  if(plan.length){ parts.push(":::green"); plan.forEach(function(p){ parts.push("- "+p); }); parts.push(":::"); }
  if(cust.conspectText && String(cust.conspectText).trim()){ parts.push(String(cust.conspectText)); }
  if(lesson.keypoints && lesson.keypoints.length){
    parts.push("## Ключевые факты");
    parts.push(":::blue"); lesson.keypoints.forEach(function(k){ parts.push("- "+k); }); parts.push(":::");
  }
  if(lesson.example){
    parts.push("## Пример");
    parts.push(":::yellow");
    parts.push(lesson.example.q);
    parts.push("Ответ: "+lesson.example.a);
    if(lesson.example.s) parts.push(lesson.example.s);
    parts.push(":::");
  }
  return parts.join("\n");
}
// Финальный рендер формул: $...$ — инлайн, $$...$$ — блочно (как на 100points.ru).
function applyMath(root){
  try{
    if(root && window.renderMathInElement){
      renderMathInElement(root, {
        delimiters:[{left:"$$", right:"$$", display:true},{left:"$", right:"$", display:false}],
        throwOnError:false, strict:false
      });
    }
  }catch(e){}
}
// Рендер markdown-подобной таблицы вида:
//   | Величина | Формула |
//   | --- | --- |        (строка-разделитель, необязательна)
//   | Скорость | $v = s/t$ |
function renderTable(rows){
  var cols=1; rows.forEach(function(r){ cols=Math.max(cols,r.length); });
  var html='<table class="cc-table"><tbody>';
  rows.forEach(function(r,ri){
    html+='<tr class="'+(ri===0?'cc-th':'')+'">';
    for(var i=0;i<cols;i++){
      var c=(r[i]===undefined?"":String(r[i])).trim();
      if(ri===0) html+='<th>'+inlineFmt(escapeHtml(c))+'</th>';
      else html+='<td>'+inlineFmt(escapeHtml(c))+'</td>';
    }
    html+='</tr>';
  });
  html+='</tbody></table>';
  return html;
}
function renderConspectText(text){
  var lines=String(text).replace(/\r/g,"").split("\n");
  var html="", list=null, listType=null;
  var blockColor=null, blockBuf=[], blockOpen=false;
  var trows=null, inTable=false;
  function closeList(){ if(list){ html+='</'+listType+'>'; list=null; listType=null; } }
  function flushTable(){
    if(!inTable) return;
    // отбрасываем возможную строку-разделитель |---|---|
    var rows=trows.filter(function(r){
      var joined=r.join("|").replace(/[\s:|-]/g,"");
      return joined!=="";
    });
    html+=renderTable(rows);
    inTable=false; trows=null;
  }
  function flushBlock(){
    if(!blockOpen) return;
    closeList(); flushTable();
    var inner=renderConspectBlock(blockBuf.join("\n"), blockColor);
    html+=inner;
    blockOpen=false; blockColor=null; blockBuf=[];
  }
  lines.forEach(function(raw){
    var line=raw.replace(/\s+$/,"");
    var mb=line.match(/^\s*:::\s*([a-zа-я]*)\s*$/i);
    if(mb){
      if(!blockOpen){ closeList(); flushTable(); blockOpen=true; blockColor=(mb[1]||"").toLowerCase()||"plain"; blockBuf=[]; }
      else { flushBlock(); }
      return;
    }
    if(blockOpen){
      // внутри блока таблицы тоже поддерживаем
      if(/^\s*\|/.test(line)){
        if(!inTable){ closeList(); inTable=true; trows=[]; }
        trows.push(line.split("|").slice(1,-1));
        return;
      }
      flushTable();
      blockBuf.push(raw); return;
    }
    var esc=escapeHtml(line);
    if(!line.trim()){ closeList(); flushTable(); return; }
    if(/^\s*\|/.test(line)){
      closeList();
      if(!inTable){ inTable=true; trows=[]; }
      trows.push(line.split("|").slice(1,-1));
      return;
    }
    flushTable();
    if(/^\s*---+\s*$/.test(line)){ closeList(); html+='<hr>'; return; }
    var m;
    if((m=line.match(/^\s*###\s+(.*)$/))){ closeList(); html+='<h5>'+inlineFmt(escapeHtml(m[1]))+'</h5>'; return; }
    if((m=line.match(/^\s*##\s+(.*)$/))){ closeList(); html+='<h4>'+inlineFmt(escapeHtml(m[1]))+'</h4>'; return; }
    if((m=line.match(/^\s*#\s+(.*)$/))){ closeList(); html+='<h3 class="cc-h">'+inlineFmt(escapeHtml(m[1]))+'</h3>'; return; }
    if((m=line.match(/^\s*!!!\s+(.*)$/))){ closeList(); html+='<div class="cc-warn">⚠️ '+inlineFmt(escapeHtml(m[1]))+'</div>'; return; }
    if((m=line.match(/^\s*>\s+(.*)$/))){ closeList(); html+='<div class="cc-note">'+inlineFmt(escapeHtml(m[1]))+'</div>'; return; }
    if((m=line.match(/^\s*[-*]\s+(.*)$/))){
      if(listType!=="ul"){ closeList(); html+='<ul>'; listType="ul"; }
      html+='<li>'+inlineFmt(escapeHtml(m[1]))+'</li>'; return;
    }
    if((m=line.match(/^\s*\d+[.)]\s+(.*)$/))){
      if(listType!=="ol"){ closeList(); html+='<ol>'; listType="ol"; }
      html+='<li>'+inlineFmt(escapeHtml(m[1]))+'</li>'; return;
    }
    closeList();
    html+='<p>'+inlineFmt(esc)+'</p>';
  });
  flushBlock();
  closeList();
  flushTable();
  return html;
}
// внутреннее содержимое цветного блока: списки/заголовки/абзацы, но без вложенных блоков
function renderConspectBlock(text, color){
  var cls="cc-block";
  if(color && color!=="plain") cls+=" cc-"+color;
  var lines=String(text).replace(/\r/g,"").split("\n");
  var inner="", list=null, listType=null;
  function closeList(){ if(list){ inner+='</'+listType+'>'; list=null; listType=null; } }
  lines.forEach(function(raw){
    var line=raw.replace(/\s+$/,"");
    if(!line.trim()){ closeList(); return; }
    var m;
    if((m=line.match(/^\s*###\s+(.*)$/))){ closeList(); inner+='<h5>'+inlineFmt(escapeHtml(m[1]))+'</h5>'; return; }
    if((m=line.match(/^\s*##\s+(.*)$/))){ closeList(); inner+='<h4>'+inlineFmt(escapeHtml(m[1]))+'</h4>'; return; }
    if((m=line.match(/^\s*#\s+(.*)$/))){ closeList(); inner+='<h3 class="cc-h">'+inlineFmt(escapeHtml(m[1]))+'</h3>'; return; }
    if((m=line.match(/^\s*[-*]\s+(.*)$/))){
      if(listType!=="ul"){ closeList(); inner+='<ul>'; listType="ul"; }
      inner+='<li>'+inlineFmt(escapeHtml(m[1]))+'</li>'; return;
    }
    if((m=line.match(/^\s*\d+[.)]\s+(.*)$/))){
      if(listType!=="ol"){ closeList(); inner+='<ol>'; listType="ol"; }
      inner+='<li>'+inlineFmt(escapeHtml(m[1]))+'</li>'; return;
    }
    closeList();
    inner+='<p>'+inlineFmt(escapeHtml(line))+'</p>';
  });
  closeList();
  return '<div class="'+cls+'">'+inner+'</div>';
}

/* ---------- Редактор конспекта (teacher/admin) ---------- */
function openConspectEditor(mid){
  var content=getContent(); var cust=content[mid]||{};
  var lesson=OLYMP_LESSONS[mid]||{};
  var val;
  // Если блок с темами и открыта тема — редактируем тело этой темы
  var editingSub=-1;
  if(lesson && lesson.subs && lesson.subs.length && currentSubId>=0 && currentSubId<lesson.subs.length){
    editingSub=currentSubId;
    var cbody=cust.subBodies && cust.subBodies[editingSub];
    val = (cbody!==undefined && cbody!==null) ? cbody : (lesson.subs[editingSub].body||"");
  } else {
    if(cust.lessonBody!==undefined && cust.lessonBody!==null){ val=cust.lessonBody; }
    else { val=buildDefaultLessonBody(lesson, cust); }
  }

  var box=$("#mod-lesson");
  var $wrap=document.createElement("div"); $wrap.className="conspect-editor";
  $wrap.innerHTML=
     '<div class="ce-head"><h3>✏️ Редактор блока</h3>'
    +'<button class="btn btn-sm" id="ce-help">❓ Как оформлять</button></div>'
    +'<div class="ce-toolbar">'
    +'<button class="ce-tb" data-ins="h1" title="Крупный заголовок">H1</button>'
    +'<button class="ce-tb" data-ins="h2" title="Заголовок">H2</button>'
    +'<button class="ce-tb" data-ins="h3" title="Подзаголовок">H3</button>'
    +'<span class="ce-sep"></span>'
    +'<button class="ce-tb" data-ins="b" title="Жирный"><b>B</b></button>'
    +'<button class="ce-tb" data-ins="i" title="Курсив"><i>I</i></button>'
    +'<button class="ce-tb" data-ins="mark" title="Выделить маркером">▮</button>'
    +'<span class="ce-sep"></span>'
    +'<button class="ce-tb" data-ins="ul" title="Маркированный список">• Список</button>'
    +'<button class="ce-tb" data-ins="ol" title="Нумерованный список">1. Список</button>'
    +'<span class="ce-sep"></span>'
    +'<button class="ce-tb" data-ins="warn" title="Важное предупреждение">⚠️ Важно</button>'
    +'<button class="ce-tb" data-ins="note" title="Заметка">❝ Заметка</button>'
    +'<button class="ce-tb" data-ins="hr" title="Разделитель">— Линия</button>'
    +'<span class="ce-sep"></span>'
    +'<button class="ce-tb" data-ins="formula" title="Формула">∑ Формула</button>'
    +'<button class="ce-tb" data-ins="red" title="Красный текст"><span style="color:#d9432f">A</span></button>'
    +'<button class="ce-tb" data-ins="green" title="Зелёный текст"><span style="color:#2f9e63">A</span></button>'
    +'<button class="ce-tb" data-ins="blue" title="Синий текст"><span style="color:#2f6fed">A</span></button>'
    +'<button class="ce-tb" data-ins="img" title="Картинка по ссылке">🖼</button>'
    +'</div>'
    +'<div class="ce-toolbar ce-blocks">'
    +'<span class="ce-lbl">Блок:</span>'
    +'<button class="ce-tb ce-blk" data-blk="plain" title="Обычный текст (без блока)">Обычный</button>'
    +'<button class="ce-tb ce-blk" data-blk="green" title="Зелёный блок">🟩 Зелёный</button>'
    +'<button class="ce-tb ce-blk" data-blk="blue" title="Синий блок">🟦 Синий</button>'
    +'<button class="ce-tb ce-blk" data-blk="yellow" title="Жёлтый блок">🟨 Жёлтый</button>'
    +'<button class="ce-tb ce-blk" data-blk="red" title="Красный блок">🟥 Красный</button>'
    +'<button class="ce-tb ce-blk" data-blk="violet" title="Фиолетовый блок">🟪 Фиолетовый</button>'
    +'<button class="ce-tb ce-blk" data-blk="gray" title="Серый блок">⬜ Серый</button>'
    +'</div>'
    +'<div class="ce-grid">'
    +'<textarea id="ce-text" spellcheck="false" placeholder="Содержимое блока…"></textarea>'
    +'<div class="ce-preview" id="ce-preview"></div>'
    +'</div>'
    +'<div class="ce-help" id="ce-help-box" hidden>'
    +'<b>Цветные блоки</b> — оборачивают текст в плашку:'
    +'<ul>'
    +'<li><code>:::green</code> … <code>:::</code> — зелёный блок; также <code>blue</code>, <code>yellow</code>, <code>red</code>, <code>violet</code>, <code>gray</code></li>'
    +'<li><code>:::plain</code> … <code>:::</code> — блок без цвета, но с рамкой</li>'
    +'<li>Текст <b>вне</b> блоков выводится обычным абзацем (без плашки)</li>'
    +'</ul>'
    +'<b>Заголовки и списки</b> (в начале строки):'
    +'<ul>'
    +'<li><code># Заголовок</code>, <code>## …</code>, <code>### …</code></li>'
    +'<li><code>- пункт</code> — маркированный; <code>1. пункт</code> — нумерованный</li>'
    +'<li><code>!!! текст</code> — «важно»; <code>&gt; текст</code> — заметка; <code>---</code> — линия</li>'
    +'</ul>'
    +'<b>Внутри строки:</b> <code>**жирный**</code>, <code>*курсив*</code>, <code>==маркер==</code>, <code>$E=mc^2$</code> (формула)<br>'
    +'<b>Цвет текста:</b> <code>[red]…[/red]</code>, <code>[green]</code>, <code>[blue]</code>, <code>[orange]</code>, <code>[violet]</code><br>'
    +'<b>Картинка:</b> <code>![подпись](https://…)</code> &nbsp; <b>Ссылка:</b> <code>[текст](https://…)</code>'
    +'</div>'
    +'<div class="form-actions"><button class="btn" id="ce-cancel">Отмена</button>'
    +'<button class="btn btn-primary" id="ce-save">💾 Сохранить блок</button></div>';
  // Вставить редактор сразу ПОСЛЕ конспекта (а не в конец блока под задачи)
  var anchor=$("#conspect-box");
  if(anchor && anchor.parentNode){ anchor.parentNode.insertBefore($wrap, anchor.nextSibling); }
  else { box.appendChild($wrap); }

  var ta=$("#ce-text");
  ta.value=val;
  var prev=$("#ce-preview");
  function refresh(){ prev.innerHTML=renderConspectText(ta.value); applyMath(prev); }
  ta.addEventListener("input",refresh); refresh();

  function replaceSel(text, wrapAround){
    var s=ta.selectionStart, e=ta.selectionEnd;
    var sel=ta.value.slice(s,e);
    var out = wrapAround ? (wrapAround[0]+(sel||text)+wrapAround[1]) : text;
    ta.value=ta.value.slice(0,s)+out+ta.value.slice(e);
    var caret=s+out.length;
    ta.focus(); ta.setSelectionRange(caret,caret);
    refresh();
  }
  // обернуть выделенные строки в блок нужного цвета
  function wrapBlock(color){
    var s=ta.selectionStart, e=ta.selectionEnd;
    var before=ta.value.slice(0,s), mid=ta.value.slice(s,e)||"текст", after=ta.value.slice(e);
    // если выделение уже внутри блока — убираем обёртку
    if(/^\s*:::.*\n[\s\S]*\n:::\s*$/.test(mid)){
      var stripped=mid.replace(/^\s*:::.*\n/,"").replace(/\n:::\s*$/,"");
      ta.value=before+stripped+after; ta.focus(); refresh(); return;
    }
    var out="\n:::"+color+"\n"+mid+"\n:::\n";
    ta.value=before+out+after;
    var caret=before.length+out.length;
    ta.focus(); ta.setSelectionRange(caret,caret);
    refresh();
  }
  var ins={
    h1:function(){ replaceSel("\n# Заголовок\n"); },
    h2:function(){ replaceSel("\n## Заголовок\n"); },
    h3:function(){ replaceSel("\n### Подзаголовок\n"); },
    b:function(){ replaceSel("жирный",["**","**"]); },
    i:function(){ replaceSel("курсив",["*","*"]); },
    mark:function(){ replaceSel("выделение",["==","=="]); },
    ul:function(){ replaceSel("\n- пункт 1\n- пункт 2\n"); },
    ol:function(){ replaceSel("\n1. пункт 1\n2. пункт 2\n"); },
    warn:function(){ replaceSel("\n!!! Важное замечание\n"); },
    note:function(){ replaceSel("\n> Заметка\n"); },
    hr:function(){ replaceSel("\n---\n"); },
    formula:function(){ replaceSel("E=mc^2",["$","$"]); },
    red:function(){ replaceSel("текст",["[red]","[/red]"]); },
    green:function(){ replaceSel("текст",["[green]","[/green]"]); },
    blue:function(){ replaceSel("текст",["[blue]","[/blue]"]); },
    img:function(){ replaceSel("![подпись](https://)\n"); }
  };
  $$(".ce-tb[data-ins]").forEach(function(b){ b.addEventListener("click",function(){
    var k=b.getAttribute("data-ins"); if(ins[k]) ins[k]();
  }); });
  $$(".ce-blk").forEach(function(b){ b.addEventListener("click",function(){ wrapBlock(b.getAttribute("data-blk")); }); });
  $("#ce-help").addEventListener("click",function(){ var h=$("#ce-help-box"); h.hidden=!h.hidden; });

  $("#ce-save").addEventListener("click",function(){
    var cc=getContent(); cc[mid]=cc[mid]||{};
    if(editingSub>=0){
      cc[mid].subBodies=cc[mid].subBodies||{};
      cc[mid].subBodies[editingSub]=ta.value;
      toast("Конспект темы сохранён");
    } else {
      cc[mid].lessonBody=ta.value;
      // чистим устаревшие поля, чтобы не перекрывали новое тело
      delete cc[mid].conspectText; delete cc[mid].conspectPlan;
      toast("Блок сохранён");
    }
    saveContent(cc);
    renderModuleWorkspace();
  });
  $("#ce-cancel").addEventListener("click",function(){ renderModuleWorkspace(); });
}
function renderModuleTasks(){
  var mid=currentModuleId; if(!mid||!OLYMP_LESSONS[mid]||!P) return;
  // блоки с темами: задачи живут внутри тем
  if(OLYMP_LESSONS[mid].subs&&OLYMP_LESSONS[mid].subs.length){ $("#mod-tasks").innerHTML=""; return; }
  var ms=P.modStat[mid]||{badSubmits:0,revealed:false};
  var tasks=tasksOf(mid);
  if(!tasks.length){ $("#mod-tasks").innerHTML='<div class="empty">В этом блоке пока нет задач.</div>'; return; }
  var html='<div class="mod-tasks"><div class="mt-title">✏️ Задачи блока</div><div class="mt-sub">Теперь реши все задачи. Ответов нет — проверь себя кнопкой «Отправить задачи».</div>';
  tasks.forEach(function(t){
    var st=P.solvedTasks[t.id]||{attempts:0};
    var state=st.status==="ok"?"ok":st.status==="wrong"?"bad":"";
    var cls='wtask '+(state==="ok"?"w-ok":state==="bad"?"w-bad":"");
    html+='<div class="'+cls+'" id="wt'+t.id+'"><div class="wt-top">'
      +'<span class="level-badge" style="background:'+olympLvlColor(t.level)+'">'+olympLvlName(t.level)+'</span>'
      +'<span class="type-tag">'+((OLYMP_TYPES.filter(function(x){return x.id===t.type;})[0]||{}).name||t.type)+'</span>'
      +'<span class="state-tag" style="margin-left:auto;display:none"></span></div>'
      +'<div class="wt-q">'+inlineFmt(escapeHtml(t.text))+'</div>';
    var locked = st.status==="ok" || ms.revealed;
    if(t.type==="test"){
      html+='<div class="wt-opts">';
      (t.options||[]).forEach(function(o,i){
        var sel=(st.selected===i);
        var extra='';
        if(ms.revealed){ extra=(i===correctOptIndex(t)?' correct':(st.selected===i?' incorrect':'')); }
        else if(st.status==="ok"){ extra=(i===correctOptIndex(t)?' correct':''); }
        html+='<div class="wo'+(sel?' selected':'')+extra+'" data-opt="'+t.id+'_'+i+'">'+(i+1)+') '+escapeHtml(o)+'</div>';
      });
      html+='</div>';
    } else {
      html+='<div class="wt-input"><label>Твой ответ</label><input id="ans_'+t.id+'" value="'+escapeHtml(st.answer||"")+'" '+(locked?'disabled':'')+' placeholder="Введи ответ…"></div>';
    }
    if(st.status==="ok") html+='<div class="wt-status ok">✅ Верно!</div>';
    else if(st.status==="wrong") html+='<div class="wt-status bad">❌ Неверно в этой попытке</div>';
    else html+='<div class="wt-status info">ждёт проверки</div>';
    if(ms.revealed) html+='<div class="wt-answer"><b>Ответ:</b> '+escapeHtml(t.answer)+(t.solution?'<span class="was"><b>Решение:</b> '+escapeHtml(t.solution)+'</span>':"")+'</div>';
    else if(st.status==="wrong"&&st.attempts>=3) html+='<button class="btn btn-sm wt-ans-btn" data-task="'+t.id+'">Посмотреть ответ</button>';
    html+='</div>';
  });
  html+='<div class="submit-bar"><span class="sb-hint">'+(ms.revealed?'Ответы открыты — изменить нельзя.':'После 3 неудачных попыток откроются ответы.')+'</span>'
    +'<button class="btn btn-primary submit-btn" '+(ms.revealed?'disabled':'')+'>Отправить задачи</button></div>';
  html+='</div>';
  $("#mod-tasks").innerHTML=html;
  applyMath($("#mod-tasks"));
  $$(".wo[data-opt]").forEach(function(el){ el.addEventListener("click",function(){
    if(ms.revealed) return;
    var parts=el.getAttribute("data-opt").split("_"); var tid=parts.slice(0,parts.length-1).join("_"); var idx=parseInt(parts[parts.length-1],10);
    var st=P.solvedTasks[tid]||{attempts:0}; st.selected=idx; st.answer=(t_for(tid).options||[])[idx]; P.solvedTasks[tid]=st; saveProgress();
    $$("#wt"+tid+" .wo").forEach(function(x){x.classList.remove("selected");}); el.classList.add("selected");
  }); });
  $$(".wt-ans-btn").forEach(function(b){ b.addEventListener("click",function(){
    var tid=b.getAttribute("data-task"); var t=t_for(tid); if(!t)return;
    var fb=b.parentElement.querySelector(".wt-answer");
    if(!fb){ var d=document.createElement("div"); d.className="wt-answer"; d.innerHTML='<b>Ответ:</b> '+escapeHtml(t.answer)+(t.solution?'<span class="was"><b>Решение:</b> '+escapeHtml(t.solution)+'</span>':""); b.parentElement.insertBefore(d,b); b.remove(); }
  }); });
  var sb=$(".submit-btn"); if(sb) sb.addEventListener("click",submitAllTasks);
}
function t_for(id){ return allTasks().filter(function(x){return x.id===id;})[0]; }

/* ---------- Задачи темы (рееhдер внутри темы) ---------- */
function renderThemeTasks(tasks, mid, si){
  var html='<div class="mt-title">✏️ Задачи темы</div><div class="mt-sub">Реши задачи, затем нажми «Отправить задачи темы» для самопроверки.</div>'
    +'<div class="ans-hint">💡 <b>Как вносить ответ:</b> для обычного ответа просто впиши число (например <code>25</code>) или дробь (<code>3/4</code>). Пи через греческую «π» или словом «пи» (например <code>2π/3</code>, <code>5π/6</code>). Корни через запятую — в любом порядке (<code>π/6, 5π/6</code>). Десятичную точку и запятую приравниваем (<code>0,5</code> = <code>0.5</code>).</div>';
  if(!tasks.length){ return html+'<div class="empty">В этой теме задач пока нет.</div>'; }
  tasks.forEach(function(t,i){
    var id=t.id||("kin_"+mid+"_"+si+"_"+i);
    t.id=id; if(!t.module)t.module=mid; t.theme=mid+"__"+si;
    var st=P.solvedTasks[id]||{attempts:0};
    var cls='wtask '+(st.status==="ok"?"w-ok":st.status==="wrong"?"w-bad":"");
    html+='<div class="'+cls+'" id="wt'+id+'"><div class="wt-top">'
      +'<span class="state-tag" style="margin-left:auto">Задача '+(i+1)+'</span></div>'
      +'<div class="wt-q">'+inlineFmt(escapeHtml(t.text))+'</div>'
      +(t.sdamgia?'<div class="wt-src">🔗 <a href="'+t.sdamgia+'" target="_blank" rel="noopener">Номер задачи на Решу ЕГЭ — решение и ответ</a></div>':'');
    if(t.type==="test"){
      html+='<div class="wt-opts">';
      (t.options||[]).forEach(function(o,j){
        var sel=(st.selected===j);
        var extra='';
        if(st.status==="ok"&&j===correctOptIndex(t))extra=' correct';
        html+='<div class="wo'+(sel?' selected':'')+extra+'" data-opt="'+id+'_'+j+'">'+(j+1)+') '+escapeHtml(o)+'</div>';
      });
      html+='</div>';
    } else {
      html+='<div class="wt-input"><label>Твой ответ</label><input id="ans_'+id+'" value="'+escapeHtml(st.answer||"")+'" placeholder="Введи ответ…"></div>';
    }
    if(st.status==="ok") html+='<div class="wt-status ok">✅ Верно!</div>';
    else if(st.status==="wrong") html+='<div class="wt-status bad">❌ Неверно</div>';
    else html+='<div class="wt-status info">ждёт проверки</div>';
    html+='</div>';
  });
  html+='<div class="submit-bar"><button class="btn btn-primary submit-btn" id="theme-submit">Отправить задачи темы</button></div>';
  return html;
}
function themeTasksOf(mid, si){
  var out=[];
  if(!mid||typeof OLYMP_LESSONS==="undefined") return out;
  var ls=OLYMP_LESSONS[mid]; if(!ls||!ls.subs) return out;
  var s=ls.subs[si]; out=(s&&s.tasks||[]).map(function(t,i){ var c=t; c.id=c.id||("kin_"+mid+"_"+si+"_"+i); if(!c.module)c.module=mid; c.theme=mid+"__"+si; return c; });
  return out;
}
function submitThemeTasks(mid, si){
  if(!mid||!P) return;
  var tasks=themeTasksOf(mid, si);
  if(!tasks.length){ toast("В теме нет задач"); return; }
  var anyWrong=false, wrongCount=0;
  tasks.forEach(function(t){
    if(t.type==="calc"&&(t.options&&t.type==="test")){}
    var st=P.solvedTasks[t.id]||{attempts:0}; st.attempts++;
    var ok=false;
    if(t.type==="test"){ ok=(st.selected!==undefined&&st.selected===correctOptIndex(t)); }
    else { var v=document.getElementById("ans_"+t.id); if(v) st.answer=v.value; ok=judgeAnswer(t, st.answer); }
    if(ok&&st.status!=="ok"){ st.status="ok"; markCorrect(t,st); }
    else if(!ok){ st.status="wrong"; anyWrong=true; wrongCount++; }
    P.solvedTasks[t.id]=st;
  });
  saveProgress();
  var ms=P.modStat[mid]||{badSubmits:0,revealed:false};
  var currentProg=moduleMasteryPct(mid);
  if(anyWrong){
    ms.badSubmits=(ms.badSubmits||0)+1;
    if(ms.badSubmits>=3) toast("3-я попытка завершена — следующий блок открыт.");
    else toast("Попытка "+ms.badSubmits+"/3 · исправь неверные задачи");
  }
  P.modStat[mid]=ms;
  saveProgress();
  renderModuleWorkspace(); checkModuleDone(mid); checkAchievements();
  if(!anyWrong) toast("Все задачи темы решены верно! 🎯");
  else toast("Правильно "+(tasks.length-wrongCount)+" из "+tasks.length+". Осталось попыток: "+(ms.badSubmits>=3?0:(3-ms.badSubmits)));
}

/* ---------- preSrc ---------- */
var presFolder="Каталог - Видеоуроки";
function presSrcPath(){ var b=location.href.split("/").slice(0,-1).join("/"); return b+"/"+encodeURIComponent(presFolder)+"/"; }

/* ---------- Мини-карта: волновая змейка ---------- */
var SNAKE_R=42, SNAKE_SX=220, SNAKE_SY=170, SNAKE_PAD=90;
function snakePts(cols){
  cols=cols||1;
  var pts=[];
  OLYMP_MODULES.forEach(function(m,i){
    var r=Math.floor(i/cols), k=i%cols;
    var x = r%2===0 ? SNAKE_PAD+k*SNAKE_SX : SNAKE_PAD+(cols-1-k)*SNAKE_SX;
    var y = 78 + r*SNAKE_SY;
    pts.push({x:x,y:y,mod:m});
  });
  return pts;
}
function snakePathBetween(a,b,row,cols){
  var rowA=Math.floor(a._i/cols), rowB=Math.floor(b._i/cols);
  if(rowA===rowB){
    // Волнистая «змейка» между узлами одной строки: легкий изгиб вверх
    var mx=(a.x+b.x)/2;
    var cy0=(a.y+b.y)/2 - 26;
    return ' M '+a.x+' '+a.y+' Q '+mx+' '+cy0+' '+b.x+' '+b.y;
  } else {
    // Поворот на следующую строку: мягкая дуга
    var mx=(a.x+b.x)/2;
    var cpx=(row%2===0)?Math.max(a.x,b.x)+34:Math.min(a.x,b.x)-34;
    var cpy=(a.y+b.y)/2;
    return ' M '+a.x+' '+a.y+' Q '+cpx+' '+cpy+' '+b.x+' '+b.y;
  }
}
function indexOfPt(p){ return p._i; }
function renderMinimap(){
  var wrap=$("#minimap"); if(!wrap) return;
  if(typeof OLYMP_MODULES==="undefined") return;
  if(!currentUser()){ wrap.innerHTML=''; return; }
  var n=OLYMP_MODULES.length;
  // Число колонок подбираем под количество модулей, чтобы кружки заполняли ширину и не теснились
  var cols = n<=2 ? n : (n<=4 ? 3 : (n<=6 ? 4 : 6));
  var pts=snakePts(cols); pts.forEach(function(p,i){p._i=i;});
  var rowsN=Math.ceil(n/cols);
  // Ширина по фактическому числу колонок, а не всегда по 6, чтобы не было пустоты справа
  var W=(cols-1)*SNAKE_SX + SNAKE_PAD*2;
  var H=rowsN*SNAKE_SY+60;
  var grey="",green="";
  for(var k=0;k<n-1;k++){
    var row=Math.floor(k/cols);
    var d=snakePathBetween(pts[k],pts[k+1],row,cols);
    var done=masterProg(pts[k].mod.id)>=100;
    var seg;
    if(done) seg='<path d="'+d+'" fill="none" stroke="#2f9e63" stroke-width="6" stroke-linecap="round"/>';
    else seg='<path d="'+d+'" fill="none" stroke="#d7dcea" stroke-width="6" stroke-linecap="round"/>';
    if(done) green+=seg; else grey+=seg;
  }
  var circles="";
  pts.forEach(function(p){
    var prog=masterProg(p.mod.id), unlocked=moduleUnlocked(p.mod.id);
    var fill,stroke;
    if(prog>=100){ fill="#2f9e63"; stroke="#1f7a4d"; }
    else if(unlocked){ fill="#fff"; stroke="#f4a825"; }
    else { fill="#fff"; stroke="#d7dcea"; }
    circles+='<g id="snake_'+p.mod.id+'" style="cursor:pointer">'
      +'<circle cx="'+p.x+'" cy="'+p.y+'" r="'+SNAKE_R+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="3.5"/>';
    if(prog>=100) circles+='<text x="'+p.x+'" y="'+p.y+'" text-anchor="middle" dominant-baseline="central" font-size="34" font-weight="700" fill="#fff">✓</text>';
    else circles+='<text x="'+p.x+'" y="'+p.y+'" text-anchor="middle" dominant-baseline="central" font-size="30">'+p.mod.icon+'</text>';
    circles+='<title>'+escAttr(p.mod.no+'. '+p.mod.name)+' — '+(prog>=100?'пройден':unlocked?prog+'%':'закрыт')+'</title>';
    var shortName=(p.mod.no+'. '+p.mod.name).length>20 ? (p.mod.no+'. '+p.mod.name).slice(0,19)+'…' : (p.mod.no+'. '+p.mod.name);
    circles+='<text x="'+p.x+'" y="'+(p.y-SNAKE_R-14)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#5a6289">'+escAttr(shortName)+'</text></g>';
  });
  var last=pts[n-1];
  circles+='<text x="'+last.x+'" y="'+(last.y+SNAKE_R+38)+'" text-anchor="middle" font-size="13" fill="#e8503a" font-style="italic" font-weight="700">финиш</text>';
  wrap.innerHTML='<div class="snake-wrap"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:'+W+'px;height:auto;display:block">'+grey+green+circles+'</svg></div>';
  $$("#minimap svg g[id^=snake_]").forEach(function(g){
    g.addEventListener("mouseenter",function(){ showSnakeTip(g.getAttribute("id")); });
    g.addEventListener("mouseleave",function(){ hideSnakeTip(); });
  });
}
function escAttr(s){ return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function showSnakeTip(gid){
  var modId=gid.replace("snake_","");
  var m=olympModuleMeta(modId); var prog=masterProg(modId);
  var existing=$("#snake-tip");
  if(!existing){ existing=document.createElement("div"); existing.id="snake-tip"; existing.className="snake-tip"; document.body.appendChild(existing); }
  var stat=prog>=100?'✓ пройден (100%)':moduleUnlocked(modId)?('в процессе · '+prog+'%'):'🔒 ещё закрыт';
  existing.innerHTML='<div class="st-head" style="background:'+m.color+'">'+m.icon+' '+m.no+'. '+m.name+'</div><div class="st-body">'+m.desc+'<div class="st-stat">'+stat+'</div></div>';
  existing.style.display="block";
  var r=document.getElementById(gid).getBoundingClientRect();
  var cx=r.left+r.width/2, top=r.top-8;
  existing.style.left=(cx-existing.offsetWidth/2)+"px"; existing.style.top=(top-existing.offsetHeight-6)+"px";
}
function hideSnakeTip(){ var e=$("#snake-tip"); if(e) e.style.display="none"; }

/* ---------- Дашборд ---------- */
function hwContentHtml(hw){
  var out="";
  if(hw.text) out+='<div class="hw-text">'+escapeHtml(hw.text)+'</div>';
  if(hw.ownTasks && hw.ownTasks.length){
    out+='<div class="hw-own-block"><div class="hw-sec-title">📝 Свои задачи</div><ol class="hw-tasks-list">';
    hw.ownTasks.forEach(function(t){ out+='<li>'+escapeHtml(t)+'</li>'; });
    out+='</ol></div>';
  }
  if(hw.tasks && hw.tasks.length){
    var bank=allTasks();
    var items=[];
    hw.tasks.forEach(function(id){ var t=bank.filter(function(x){return x.id===id;})[0]; if(t) items.push(t); });
    out+='<div class="hw-bank-block"><div class="hw-sec-title">📚 Задачи из банка</div><ol class="hw-tasks-list">';
    items.forEach(function(t,i){ out+='<li><div class="hw-task">'+inlineFmt(escapeHtml(t.text))+(t.options?'<div class="hw-task-opts">'+t.options.map(function(o,j){return (j+1)+') '+inlineFmt(escapeHtml(o));}).join(" · ")+'</div>':"")+'</div></li>'; });
    out+='</ol></div>';
  }
  if(hw.file){
    var isImg=/\.(png|jpe?g)$/i.test(hw.file.name||"");
    out+='<div class="hw-file-block"><div class="hw-sec-title">📎 Файл</div>'
      +(isImg?'<a href="'+hw.file.dataUrl+'" target="_blank" download="'+escapeHtml(hw.file.name)+'"><img src="'+hw.file.dataUrl+'" alt="'+escapeHtml(hw.file.name)+'" style="max-width:100%;max-height:260px;border-radius:8px"></a>'
        :'<a class="btn btn-sm" href="'+hw.file.dataUrl+'" target="_blank" download="'+escapeHtml(hw.file.name)+'">⬇ '+escapeHtml(hw.file.name)+'</a>')
      +'</div>';
  }
  return out;
}
function renderHomework(){
  var box=$("#dash-homework"); if(!box) return;
  if(!currentUser()){ box.innerHTML='<div class="muted" style="font-size:13px">Войди, чтобы видеть домашние задания.</div>'; return; }
  var u=currentUser();
  var list=getHomework().filter(function(h){
    if(h.className==="Все"||!h.className) return true;
    return u.className===h.className;
  }).slice().reverse();
  if(!list.length){ box.innerHTML='<div class="muted" style="font-size:13px">Домашних заданий пока нет.</div>'; return; }
  var h="";
  list.forEach(function(hw){
    h+='<div class="hw-item"><div class="hw-title">'+escapeHtml(hw.title)+'</div>'
      +(hw.className?'<div class="hw-meta">группа: '+escapeHtml(hw.className)+'</div>':"")
      +hwContentHtml(hw)+'</div>';
  });
  box.innerHTML=h;
}
function renderDashboard(){
  var user=currentUser();
  $("#hero-sub").textContent = user ? ("Привет, "+user.name+"! Блочная олимпиадная подготовка под тебя.")
    : "Войди в аккаунт, чтобы начать подготовку к олимпиадам.";
  var xp=user?P.xp:0;
  $("#dash-xp").textContent=xp;
  var tl=trackLevelInfo();
  $("#dash-lvl").textContent=user?(tl.level+" · "+tl.name):"—";
  $("#dash-modules").textContent=user?(moduleCompletedCount()+"/"+OLYMP_MODULES.length):"—";
  var achCount=user?OLYMP_ACHIEVEMENTS.filter(function(a){return P.achievementsOpen[a.id];}).length:0;
  $("#dash-ach").textContent=user?achCount:"—";
  renderMinimap();
  renderHomework();
  var sk=$("#skill-rings"); var html="";
  OLYMP_SKILLS.forEach(function(s){ var v=user?Math.min(100,P.skills[s.id]||0):0;
    html+='<div class="skill-ring"><span class="sr-icon">'+s.icon+'</span><span class="sr-name">'+s.name+'</span><span class="sr-bar"><i style="width:'+v+'%;background:'+s.color+'"></i></span><span class="sr-pct">'+v+'%</span></div>';
  });
  sk.innerHTML=html;
  var mp=$("#dash-mastery"); var mh="";
  var mods=user?OLYMP_MODULES.filter(function(m){return moduleUnlocked(m.id);}).slice(0,6):[];
  if(!mods.length) mh='<div class="muted" style="font-size:13px">'+(user?"Открой первый блок, чтобы видеть мастерство.":"Войди, чтобы видеть мастерство.")+'</div>';
  mods.forEach(function(m){ var pr=masterProg(m.id);
    mh+='<div class="mastery-row"><span class="m-icon">'+m.icon+'</span><span class="m-name">'+m.short+'</span><span class="m-bar"><i style="width:'+pr+'%"></i></span><span class="m-pct">'+pr+'%</span></div>';
  });
  mp.innerHTML=mh;
  var ach=$("#dash-ach-list");
  var open=user?OLYMP_ACHIEVEMENTS.filter(function(a){return P.achievementsOpen[a.id];}):[];
  if(!open.length) ach.innerHTML='<div class="muted" style="font-size:13px">Пока нет достижений. Пройди первый блок! 🎯</div>';
  else { var hh=""; open.slice(-5).reverse().forEach(function(a){ hh+='<div class="dash-achievement"><span class="da-icon">'+a.icon+'</span><span class="da-name">'+a.name+'</span><span class="muted" style="font-size:12px;margin-left:auto">+'+a.xp+' XP</span></div>'; }); ach.innerHTML=hh; }
}

/* ---------- Теория ---------- */
function openTheory(moduleId){
  var d=OLYMP_THEORY[moduleId]; if(!d) return;
  var m=olympModuleMeta(moduleId);
  $("#th-no").textContent="Блок "+m.no; $("#th-title").textContent=d.name||m.name; $("#th-type").textContent=m.desc;
  var html="";
  OLYMP_LEVELS.forEach(function(lvl){ var lev=d.levels?d.levels[lvl.id]:null; if(!lev) return;
    html+='<div class="th-level"><h4 style="color:'+lvl.color+'">'+lvl.icon+' '+lvl.name+'. '+lev.title+'</h4>';
    html+='<ul class="th-points">'+lev.points.map(function(p){return "<li>"+p+"</li>";}).join("")+'</ul>';
    if(lev.formulas&&lev.formulas.length) html+='<div class="formula-list">'+lev.formulas.map(function(fm){return '<div class="formula"><div class="f">'+fm.f+'</div>'+(fm.desc?'<div class="fd">'+fm.desc+'</div>':"")+'</div>';}).join("")+'</div>';
    if(lev.tricks&&lev.tricks.length) html+='<div class="tricks"><b>💡 Приёмы:</b> '+lev.tricks.map(function(x){return "<div>"+x+"</div>";}).join("")+'</div>';
    html+='</div>';
  });
  $("#th-body").innerHTML=html;
  applyMath($("#th-body"));
  $("#theory-modal").hidden=false; document.body.style.overflow="hidden";
}
$("#th-close").addEventListener("click",function(){ $("#theory-modal").hidden=true; document.body.style.overflow=""; });
$("#theory-modal").addEventListener("click",function(e){ if(e.target===this){ this.hidden=true; document.body.style.overflow=""; } });

/* ---------- Банк задач ---------- */
var bankModuleFilter="all", bankLevel="all";
function fillBankModuleFilter(){ var sel=$("#bank-module-filter"); if(!sel) return;
  var cur=bankModuleFilter; sel.innerHTML=""; var a=document.createElement("option"); a.value="all"; a.textContent="Все темы"; sel.appendChild(a);
  OLYMP_MODULES.forEach(function(m){ var o=document.createElement("option"); o.value=m.id; o.textContent=m.no+". "+m.short; sel.appendChild(o); if(m.id===cur)o.selected=true; });
}
function extraTasks(){
  var arr = (typeof OLYMP_EXTRA_TASKS!=="undefined"&&OLYMP_EXTRA_TASKS.length?OLYMP_EXTRA_TASKS:[]).slice();
  if(typeof OLYMP_TASKS!=="undefined"&&OLYMP_TASKS.length){ OLYMP_TASKS.forEach(function(t){ if(t&&t.module&&t.sdamgia) arr.push(t); }); }
  if(P&&P.customBank){ P.customBank.forEach(function(t){ if(t) arr.push(t); }); }
  return arr;
}
function extraStateKey(id){ return "x_"+id; }
function renderBank(){
  var tasks=extraTasks();
  $("#statBase").textContent=tasks.filter(function(t){return t.level==="base";}).length;
  $("#statActive").textContent=tasks.filter(function(t){return t.level==="active";}).length;
  $("#statOlimp").textContent=tasks.filter(function(t){return t.level==="olimp";}).length;
  var sol=0; tasks.forEach(function(t){ if(P&&P.solvedTasks[extraStateKey(t.id)]&&P.solvedTasks[extraStateKey(t.id)].status==="ok") sol++; });
  $("#statSolved").textContent=sol;
  var list=$("#bank-list");
  if(!currentUser()){ list.innerHTML='<div class="empty"><span class="big">🔐</span>Войди в аккаунт, чтобы решать задачи.</div>'; return; }
  var filtered=tasks.filter(function(t){ if(bankModuleFilter!=="all"&&t.module!==bankModuleFilter)return false; if(bankLevel!=="all"&&t.level!==bankLevel)return false; return true; });
  if(!filtered.length){ list.innerHTML='<div class="empty"><span class="big">🗂</span>По фильтрам задач нет.</div>'; return; }
  var html="", groups={};
  filtered.forEach(function(t){ groups[t.module]=groups[t.module]||[]; groups[t.module].push(t); });
  OLYMP_MODULES.forEach(function(m){ if(!groups[m.id])return;
    html+='<div class="bank-section"><div class="bs-head" style="border-color:'+m.color+'"><span class="bs-dot" style="background:'+m.color+'"></span><h3>'+m.no+'. '+m.name+'</h3></div>';
    groups[m.id].forEach(function(t){ html+=renderBtask(t); });
    html+='</div>';
  });
  list.innerHTML=html;
  bindBtaskEvents();
  applyMath(list);
}
function renderBtask(t){
  var key=extraStateKey(t.id);
  var st=(P&&P.solvedTasks[key])||{attempts:0};
  var cls = st.status==="ok"?"b-ok":st.status==="wrong"?"b-bad":"";
  var html='<div class="btask '+cls+'" id="bw'+t.id+'"><div class="bt-top">'
    +'<span class="level-badge" style="background:'+olympLvlColor(t.level)+'">'+olympLvlName(t.level)+'</span>'
    +'<span class="type-tag">'+((OLYMP_TYPES.filter(function(x){return x.id===t.type;})[0]||{}).name||t.type)+'</span></div>'
    +'<div class="bt-q">'+inlineFmt(escapeHtml(t.text))+'</div>';
  var locked = st.status==="ok";
  if(t.type==="test"){
    html+='<div class="bt-opts">';
    (t.options||[]).forEach(function(o,i){
      var sel=(st.selected===i);
      var extra = st.status==="ok" ? (i===correctOptIndex(t)?' correct':(st.selected===i?' incorrect':'')) : '';
      html+='<div class="bo'+(sel?' selected':'')+extra+'" data-bopt="'+t.id+'_'+i+'">'+(i+1)+') '+escapeHtml(o)+'</div>';
    });
    html+='</div>';
  } else {
    var ansOkCls = st.status==="ok" ? " ok" : (st.status==="wrong" ? " bad" : "");
    html+='<div class="bt-ans"><input id="bans_'+t.id+'" value="'+escapeHtml(st.answer||"")+'" placeholder="Введи ответ…" '+(locked?'disabled':'')+'></div>'
      +'<div class="ans-hint bt-ans-hint">💡 <b>Формат ответа:</b> число (<code>25</code>), дробь (<code>3/4</code> или <code>0.75</code>), корни через запятую в любом порядке (<code>-2, 3</code>), π словом «пи» (<code>2пи/3</code>). Запятую и точку приравниваем; минус <code>−</code> и дефис <code>-</code> тоже. Введи ответ и нажми «Проверить».</div>'
      +'<div class="bt-ans-flag'+ansOkCls+'"></div>';
  }
  html+='<div class="bt-btnrow"><button class="btn btn-sm btn-primary bcheck" data-task="'+t.id+'" '+(locked?'disabled':'')+'>Проверить</button><button class="btn btn-sm bsolbtn" data-task="'+t.id+'">Решение</button></div>';
  if(st.status==="ok") html+='<div class="bt-status bt-state-ok">✅ Верно!</div>';
  else if(st.status==="wrong") html+='<div class="bt-status bt-state-bad">❌ Неверно</div>'
    +'<div class="bt-correct">✅ Правильный ответ: <span class="bt-correct-val">'+inlineFmt(escapeHtml(t.answer||""))+'</span></div>';
  html+='<div class="bt-solution" id="bsol_'+t.id+'" style="display:'+((st.status==="ok"||st.status==="wrong")?"block":"none")+'"><b>Решение:</b> '+inlineFmt(escapeHtml(t.solution||""))+'</div>';
  html+='</div>';
  return html;
}
function bindBtaskEvents(){
  $$(".bo[data-bopt]").forEach(function(el){ el.addEventListener("click",function(){
    var parts=el.getAttribute("data-bopt").split("_"); var tid=parts.slice(0,parts.length-1).join("_"); var idx=parseInt(parts[parts.length-1],10);
    var txt=extraTasks().filter(function(x){return x.id===tid;})[0];
    var st=P.solvedTasks[extraStateKey(tid)]||{attempts:0};
    st.selected=idx; st.answer=(txt&&txt.options)&&txt.options[idx]; P.solvedTasks[extraStateKey(tid)]=st; saveProgress();
    $$("#bw"+tid+" .bo").forEach(function(x){x.classList.remove("selected");}); el.classList.add("selected");
  }); });
  $$(".bcheck").forEach(function(b){ b.addEventListener("click",function(){ checkExtraTask(b.getAttribute("data-task")); }); });
  $$(".bsolbtn").forEach(function(b){ b.addEventListener("click",function(){ var id=b.getAttribute("data-task"); var s=$("#bsol_"+id); if(s) s.style.display=s.style.display==="none"?"block":"none"; }); });
}
function checkExtraTask(id){
  var t=extraTasks().filter(function(x){return x.id===id;})[0]; if(!t) return;
  var key=extraStateKey(id);
  var st=P.solvedTasks[key]||{attempts:0};
  var ok=false;
  if(t.type==="test"){ ok=(st.selected!==undefined&&st.selected===correctOptIndex(t)); }
  else { var v=$("#bans_"+id); ok=v&&judgeAnswer(t, v.value); }
  st.attempts++;
  if(ok&&st.status!=="ok"){ st.status="ok"; P.correctTotal=(P.correctTotal||0)+1; P.xp+=OLYMP_XP[t.level]||15; }
  else if(!ok){ st.status="wrong"; }
  P.solvedTasks[key]=st; saveProgress(); renderBank(); checkAchievements();
  toast(ok?"Верно! Задача зачтена.":"Пока неверно. Попробуй ещё раз.");
}
if($("#bank-module-filter")) $("#bank-module-filter").addEventListener("change",function(){ bankModuleFilter=this.value; renderBank(); });
$$(".bank-filters .chip").forEach(function(c){ c.addEventListener("click",function(){ $$(".bank-filters .chip").forEach(function(x){x.classList.remove("active");}); c.classList.add("active"); bankLevel=c.getAttribute("data-lvla"); renderBank(); }); });

/* ---------- Добавление задачи (админ/банк) ---------- */
var taskModal=function(open){ $("#task-modal").hidden=!open; if(open) fillModuleSelect(); document.body.style.overflow=open?"hidden":""; };
function fillModuleSelect(){ var sel=$("#tf-module"); sel.innerHTML=""; OLYMP_MODULES.forEach(function(m){ var o=document.createElement("option"); o.value=m.id; o.textContent=m.no+". "+m.name; sel.appendChild(o); }); if(bankModuleFilter!=="all") sel.value=bankModuleFilter; }
$("#bank-add").addEventListener("click",function(){ if(!currentUser()){ toast("Войди в аккаунт"); return; } taskModal(true); });
$("#tm-close").addEventListener("click",function(){ taskModal(false); });
$("#tm-cancel").addEventListener("click",function(){ taskModal(false); });
$("#task-modal").addEventListener("click",function(e){ if(e.target===this)taskModal(false); });
$("#tf-type").addEventListener("change",function(){ $("#options-row").hidden=$("#tf-type").value!=="test"; });
$("#task-form").addEventListener("submit",function(e){ e.preventDefault();
  var module=$("#tf-module").value, level=$("#tf-level").value, type=$("#tf-type").value;
  var text=$("#tf-text").value.trim(), ans=$("#tf-answer").value.trim(), sol=$("#tf-solution").value.trim();
  if(!text||!ans){ toast("Заполни условие и ответ"); return; }
  var id="u"+Date.now().toString(36); var t={id:id,module:module,level:level,type:type,text:text,answer:ans,solution:sol};
  if(type==="test"){ var opts=$("#tf-options").value.split(";").map(function(s){return s.trim();}).filter(Boolean); if(opts.length&&opts.indexOf(ans)<0)opts.push(ans); if(opts.length)t.options=opts; }
  P.customBank=P.customBank.concat([t]); saveProgress(); taskModal(false); renderBank(); fillBankModuleFilter(); toast("Задача добавлена");
});

function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t;} return a; }

/* ---------- Достижения ---------- */
function renderAchievements(){ var wrap=$("#ach-grid"); var html="";
  if(!currentUser()){ wrap.innerHTML='<div class="empty"><span class="big">🔐</span>Войди, чтобы видеть достижения.</div>'; return; }
  OLYMP_ACHIEVEMENTS.forEach(function(a){ var open=!!P.achievementsOpen[a.id];
    html+='<div class="ach-card'+(open?"":" locked")+'"><span class="a-icon">'+a.icon+'</span><span class="a-name">'+a.name+'</span><span class="a-desc">'+a.desc+'</span><span class="a-xp">'+(open?("✓ +"+a.xp+" XP"):("+"+a.xp+" XP"))+'</span></div>'; });
  wrap.innerHTML=html;
}

/* ============================================================
   КОДИФИКАТОР ЕГЭ
   ============================================================ */
var kodMode="formulas", kodTheme="all";
function mkKodMath(s){
  return String(s||"").replace(/\\\[/g,"$").replace(/\\\]/g,"$");
}
function renderKodifikator(){
  if(typeof OLYMP_KOD==="undefined") return;
  var tabs=$("#kod-tabs"); var content=$("#kod-content");
  var t="";
  [{id:"formulas",icon:"📘",name:"Все формулы"}, {id:"cards",icon:"🔄",name:"Карточки-запоминалки"}].forEach(function(m){
    t+='<button class="kod-tab'+(kodMode===m.id?" active":"")+'" data-kodmode="'+m.id+'">'+m.icon+' '+m.name+'</button>';
  });
  tabs.innerHTML=t;
  $$("#kod-tabs .kod-tab").forEach(function(b){ b.addEventListener("click",function(){ kodMode=b.getAttribute("data-kodmode"); kodTheme="all"; renderKodifikator(); }); });
  if(kodMode==="formulas") renderKodFormulas(content);
  else renderKodCards(content);
}
function makeKodChips(includeAll){
  var s="";
  if(includeAll) s+='<button class="kod-chip'+(kodTheme==="all"?" active":"")+'" data-kchip="all"><span class="kod-chip-icon">🗂️</span><span>Все темы</span></button>';
  s+=OLYMP_KOD.themes.map(function(th){ return '<button class="kod-chip'+(kodTheme===th.id?" active":"")+'" data-kchip="'+th.id+'"><span class="kod-chip-icon">'+th.icon+'</span><span>'+th.name+'</span></button>'; }).join('');
  return s;
}
function bindKKodFilters(){
  $$(".kod-chiprow .kod-chip").forEach(function(b){ b.addEventListener("click",function(){ kodTheme=b.getAttribute("data-kchip"); renderKodifikator(); }); });
}
function renderKodFormulas(content){
  var html='<div class="kod-intro">'+inlineFmt(escapeHtml(OLYMP_KOD.header))+'</div>';
  html+='<div class="kod-chiprow">'+makeKodChips(true)+'</div>';
  html+=OLYMP_KOD.themes.map(function(th){
    if(kodTheme!=="all" && kodTheme!==th.id) return "";
    var list=OLYMP_KOD.cards.filter(function(c){return c.th===th.id;});
    if(!list.length) return "";
    var body='<div class="kod-fblock-head"><span class="kod-fblock-icon">'+th.icon+'</span><h3>'+inlineFmt(escapeHtml(th.name))+'</h3><span class="kod-count">'+list.length+' формул</span></div>';
    body+='<div class="kod-flist">'+list.map(function(c,i){
      return '<div class="kod-frow"><span class="kod-fnum">'+(i+1)+'</span><div class="kod-fcells"><div class="kod-fq">'+inlineFmt(mkKodMath(c.q))+'</div><div class="kod-fa">'+inlineFmt(mkKodMath(c.a))+'</div></div></div>';
    }).join('')+'</div>';
    if(th.elems && th.elems.length){
      body+='<div class="kod-elems-title">📋 Элементы содержания (по кодификатору)</div>';
      body+='<div class="kod-elems">'+th.elems.map(function(e){ return '<span class="kod-elem">'+inlineFmt(escapeHtml(e))+'</span>'; }).join('')+'</div>';
    }
    return '<div class="kod-formula-block">'+body+'</div>';
  }).join('');
  content.innerHTML=html;
  bindKKodFilters();
  applyMath(content);
}
function renderKodCards(content){
  var html='<div class="kod-intro">'+inlineFmt(escapeHtml(OLYMP_KOD.header))+'</div>';
  html+='<div class="kod-chiprow">'+makeKodChips(true)+'</div>';
  html+='<div class="kod-cardtool"><span class="muted">Нажми на карточку, чтобы перевернуть: вопрос → ответ.</span></div>';
  html+='<div class="kod-card" id="kod-card"><div class="kod-card-inner"><div class="kod-card-face kod-card-front"><div class="kod-q" id="kod-q"></div><div class="kod-tip">👆 Нажми на карточку</div></div><div class="kod-card-face kod-card-back"><div class="kod-a" id="kod-a"></div></div></div></div>';
  html+='<div class="kod-card-ctrl" style="display:flex;gap:8px;margin-top:14px;align-items:center"><button class="btn btn-sm btn-primary" id="kod-next">Следующая →</button><button class="btn btn-sm" id="kod-back">← Назад</button><button class="btn btn-sm" id="kod-shuffle">Перемешать</button><span class="kod-prog" id="kod-prog" style="margin-left:auto"></span></div>';
  content.innerHTML=html;
  var list=(kodTheme==="all")?OLYMP_KOD.cards.slice():OLYMP_KOD.cards.filter(function(c){return c.th===kodTheme;});
  window.__kodCards=list;
  window.__kodIdx=0;
  showKodCard();
  bindKKodEvents();
}
function showKodCard(){
  var cards=window.__kodCards||[]; var i=window.__kodIdx||0;
  var prog=$("#kod-prog"); if(prog) prog.textContent=(i+1)+" / "+cards.length;
  var qEl=$("#kod-q"), aEl=$("#kod-a"), card=$("#kod-card");
  if(card) card.classList.remove("flipped");
  if(!cards.length){ if(qEl) qEl.innerHTML='<div class="empty">Нет формул в этой теме.</div>'; if(aEl) aEl.innerHTML=""; return; }
  var c=cards[i];
  if(qEl) qEl.innerHTML=inlineFmt(mkKodMath(c.q));
  if(aEl) aEl.innerHTML=inlineFmt(mkKodMath(c.a));
  applyMath(card);
}
function bindKKodEvents(){
  $$(".kod-chiprow .kod-chip").forEach(function(b){ b.addEventListener("click",function(){ kodTheme=b.getAttribute("data-kchip"); renderKodifikator(); }); });
  var card=$("#kod-card");
  if(card) card.addEventListener("click",function(e){ if(e.target.closest("#kod-next")||e.target.closest("#kod-shuffle")) return; card.classList.toggle("flipped"); });
  if($("#kod-shuffle")) $("#kod-shuffle").addEventListener("click",function(e){ e.stopPropagation(); var a=window.__kodCards||[]; for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=a[i];a[i]=a[j];a[j]=tmp;} window.__kodIdx=0; showKodCard(); });
  if($("#kod-next")) $("#kod-next").addEventListener("click",function(e){ e.stopPropagation(); var a=window.__kodCards||[]; if(!a.length)return; window.__kodIdx=((window.__kodIdx||0)+1)%a.length; showKodCard(); });
}

/* ============================================================
   КАБИНЕТ: вход / профиль / админ-панель
   ============================================================ */
function renderProfile(){
  var u=currentUser();
  if(u && u.role==="admin"){ renderAdmin(); return; }
  var body=$("#profile-body");
  if(!u){
    body.innerHTML='<div class="profile-card"><h3>Вход</h3>'
      +'<div class="profile-row"><label>Логин</label><input id="login-login" placeholder="Логин"></div>'
      +'<div class="profile-row"><label>Пароль</label><input id="login-pass" type="password" placeholder="Пароль"></div>'
      +'<div class="form-actions"><button class="btn btn-primary" id="login-ok">Войти</button></div>'
      +'</div>'
      +'<div class="profile-banner">Логин и пароль выдаёт администратор центра. Обратись к администратору для получения доступа.</div>';
    $("#login-ok").addEventListener("click",doLogin);
    return;
  }
  // преподаватель
  if(u.role==="teacher"){
    var grp=u.groupTeacher||"";
    var gInfo="";
    if(grp){ gInfo='Группа: '+escapeHtml(grp); }
    else { gInfo='Группа не назначена'; }
    var teacherClasses=getClasses().filter(function(c){return c.teacher===u.login;});
    var teacherHtml='<div class="profile-card"><h3>👨‍🏫 '+escapeHtml(u.name)+'</h3>'
      +'<div class="muted" style="margin-bottom:10px">Преподаватель · '+gInfo+'</div>'
      +'<p class="muted" style="font-size:13px;margin-bottom:8px">Ты можешь редактировать конспекты блоков, загружать видеоролики и создавать собственные классы. Открой «Блоки» для контента.</p>'
      +'<div class="form-actions"><button class="btn btn-primary" data-view-btn="modules">К блокам</button></div>'
      +'</div>';
    // Создание класса преподавателем
    teacherHtml+='<div class="profile-card"><h3>🏫 Мои классы</h3>';
    if(!teacherClasses.length){ teacherHtml+='<div class="muted" style="font-size:13px;margin-bottom:10px">У тебя пока нет классов.</div>'; }
    teacherClasses.forEach(function(cls){
      teacherHtml+='<div class="admin-class"><div class="ac-head"><b>'+escapeHtml(cls.name)+'</b><span class="muted">учеников: '+cls.students.length+'</span>'
        +'<button class="btn btn-sm btn-ghost" data-tea-delclass="'+escAttr(cls.name)+'">удалить</button></div>';
      if(!cls.students.length){ teacherHtml+='<div class="muted" style="font-size:12px;margin:4px 0">Учеников нет.</div>'; }
      cls.students.forEach(function(st){
        teacherHtml+='<div class="ac-student"><span>'+escapeHtml(st.name)+'</span><span class="muted" style="font-size:12px">логин: '+escapeHtml(st.login)+'</span>'
          +'<button class="btn btn-sm btn-ghost" data-tea-rmstu="'+escAttr(cls.name)+'" data-login="'+escAttr(st.login)+'">удалить</button></div>';
      });
      teacherHtml+='<div class="form-row" style="margin-top:8px"><label>Добавить ученика</label>'
        +'<input class="tea-stu-name" placeholder="Имя">'
        +'<input class="tea-stu-login" placeholder="Логин">'
        +'<input class="tea-stu-pass" type="password" placeholder="Пароль">'
        +'<button class="btn btn-sm btn-primary" data-tea-addstu="'+escAttr(cls.name)+'">Добавить</button></div>'
        +'</div>';
    });
    teacherHtml+='<div class="admin-class" style="background:#f7f8ff;border:1px solid var(--line)"><div class="ac-head"><b>Новый класс</b></div>'
      +'<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">'
      +'<input id="tea-class-name" placeholder="Название класса" style="flex:1;min-width:140px">'
      +'<button class="btn btn-sm btn-primary" id="tea-class-add">+ Создать класс</button></div></div>'
      +'</div>';
    body.innerHTML=teacherHtml
      +'<div class="profile-card"><h3>Аккаунт</h3><div class="form-actions">'
      +'<button class="btn" id="pf-logout">Выйти</button></div></div>';
    $("#pf-logout").addEventListener("click",doLogout);
    bindTeacherClassEvents(u);
    return;
  }
  // ученик
  body.innerHTML='<div class="profile-card"><h3>👤 '+escapeHtml(u.name)+'</h3>'
    +(u.className?'<div class="muted" style="margin-bottom:10px">Группа: '+escapeHtml(u.className)+'</div>':'<div class="muted" style="margin-bottom:10px">Группа не назначена</div>')
    +'<div class="stats-grid">'
    +'<div class="stat-cell"><b>'+P.xp+'</b><span>XP</span></div>'
    +'<div class="stat-cell"><b>'+trackLevelInfo().level+'</b><span>уровень</span></div>'
    +'<div class="stat-cell"><b>'+moduleCompletedCount()+'/'+OLYMP_MODULES.length+'</b><span>блоков</span></div>'
    +'<div class="stat-cell"><b>'+P.correctTotal+'</b><span>решено верно</span></div>'
    +'<div class="stat-cell"><b>'+P.bestStreak+'</b><span>лучшая серия</span></div>'
    +'<div class="stat-cell"><b>'+OLYMP_ACHIEVEMENTS.filter(function(a){return P.achievementsOpen[a.id];}).length+'</b><span>достижений</span></div>'
    +'</div></div>'
    +'<div class="profile-card"><h3>Личный кабинет</h3>'
    +'<p class="muted" style="font-size:13px;margin-bottom:8px">Сохрани кабинет в файл — его можно перенести на другое устройство или положить в «Каталог - Личные кабинеты».</p>'
    +'<div class="form-actions"><button class="btn" id="pf-save">💾 Сохранить кабинет</button>'
    +'<button class="btn" id="pf-load">📂 Загрузить кабинет</button></div>'
    +'<input type="file" id="pf-load-file" accept=".json" hidden>'
    +'</div>'
    +'<div class="profile-card"><h3>Аккаунт</h3><div class="form-actions">'
    +'<button class="btn" id="pf-logout">Выйти</button></div></div>';
  $("#pf-logout").addEventListener("click",doLogout);
  $("#pf-save").addEventListener("click",function(){
    downloadText("Кабинет_"+safeName(u.name)+"_"+u.login+".json", JSON.stringify(P,null,2));
    toast("Кабинет сохранён. Положи файл в «Каталог - Личные кабинеты»");
  });
  $("#pf-load").addEventListener("click",function(){ $("#pf-load-file").click(); });
  $("#pf-load-file").addEventListener("change",function(e){
    var f=e.target.files&&e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      try{
        var d=JSON.parse(String(r.result));
        if(!d||typeof d.xp!=="number"){ toast("Неверный файл кабинета"); return; }
        if(d.user&&d.user.login!==u.login){ toast("Файл не этого пользователя"); return; }
        d.user=u; P=d; saveProgress();
        renderProfile(); renderDashboard(); renderAchievements();
        toast("Кабинет загружен");
      }catch(err){ toast("Ошибка чтения файла"); }
    };
    r.readAsText(f,"utf-8"); this.value="";
  });
}
function safeName(s){ return String(s||"").replace(/[^\wа-яёА-ЯЁ\- ]/gi,"").replace(/\s+/g,"_"); }

/* ---------- Вкладка «Олимпиады» ---------- */
function renderOlympiads(){
  var body=$("#olympiads-body"); if(!body) return;
  var u=currentUser();
  var items=OLYMPIADS_MATH;
  var marks=getOlympMarks();
  var isTeacher = u && (u.role==="teacher"||u.role==="admin");

  // Выбор класса: админ видит все классы, преподаватель — свои, ученик — только свой.
  var allClasses=(getClasses()||[]).slice();
  var available=[];
  if(!u){ available=[]; }
  else if(u.role==="admin"){
    available=allClasses;
  } else if(u.role==="teacher"){
    available=allClasses.filter(function(c){return c.teacher===u.login;});
    if(!available.length && u.groupTeacher){ available=allClasses.filter(function(c){return c.name===u.groupTeacher;}); }
  } else {
    available=allClasses.filter(function(c){return c.name===u.className;});
  }

  // Текущий выбранный класс (персист в окне, чтобы переключение жило в рамках сессии)
  var chosen=window.__olympSel||"";
  if(available.length && !available.some(function(c){return c.name===chosen;})){ chosen=available[0].name; }
  window.__olympSel=chosen;

  var className=chosen;
  if(isTeacher && available){
    available.sort(function(a,b){return a.name<b.name?-1:(a.name>b.name?1:0);});
    var selHtml='<div class="olimp-class-head">Класс: <select id="olymp-class-select">'
      +available.map(function(c){
        var sel=(c.name===className)?' selected':'';
        return '<option value="'+escAttr(c.name)+'"'+sel+'>'+escapeHtml(c.name)+'</option>';
      }).join('')
      +'</select>';
    if(u.role==="admin"){
      selHtml+=' <span class="muted"> · всего классов: '+available.length+'</span>';
    }
    selHtml+='</div>';
  }

  // Ученик видит только свою строку (без редактирования), преподаватель/админ — всю таблицу класса.
  if(u && u.role==="teacher" && !className){
    body.innerHTML='<div class="muted">У тебя пока нет классов. Создай класс в «Кабинете».</div>';
    return;
  }
  if(u && u.role==="admin" && !className){
    body.innerHTML='<div class="muted">Классы ещё не созданы.</div>';
    return;
  }
  // для преподавателя/админа без группы — пустая таблица, но с сообщением
  var students = isTeacher ? olympStudentsOf(className) : (u?[{login:u.login,name:u.name}]:[]);

  function heart(state){ return state ? "❤️" : "🤍"; }

  var clsMarks = marks[className]||{};

  var html='';
  if(isTeacher && available){ html+=selHtml; }
  else {
    html+='<div class="olimp-class-head">Класс: <b>'+escapeHtml(className||"—")+'</b>'
      +' <span class="muted"> · учеников: '+students.length+' · олимпиад: '+items.length+'</span></div>';
  }
  html+='<div class="muted olimp-class-sub">учеников: '+students.length+' · олимпиад: '+items.length+'</div>';

  if(isTeacher){
    html+='<p class="muted" style="font-size:12.5px;margin:0 0 10px">Нажми на сердечко напротив ученика, чтобы отметить, что он решил олимпиаду.</p>';
  } else {
    html+='<p class="muted" style="font-size:12.5px;margin:0 0 10px">Твои отметки по олимпиадам из перечня РСОШ.</p>';
  }

  // Легенда уровней
  html+='<div class="olimp-legend"><span class="olimp-lvl-chip clvl-i">Уровень I</span>'
    +'<span class="olimp-lvl-chip clvl-ii">Уровень II</span>'
    +'<span class="olimp-lvl-chip clvl-iii">Уровень III</span>'
    +'<span class="olimp-lvl-chip clvl-mp">МинПрос</span>'
    +'<span class="muted" style="font-size:12px">Выше уровень — больше льгот при поступлении; МинПрос — из перечня Минпросвещения</span></div>';

  if(!students.length){
    html+='<div class="muted" style="margin-top:14px">В классе нет учеников.</div>';
  } else {
    // Таблица
    html+='<div class="olimp-scroll"><table class="olimp-table"><thead><tr><th class="ol-th-name">Ученик</th>';
    items.forEach(function(o,i){
      var lvlCls = olympChipClass(o);
      html+='<th class="ol-th-'+o.level+'"><span class="olimp-lvl-chip '+olympChipClass(o)+'">'+olympChipLabel(o)+'</span><div class="ol-th-name">'+escapeHtml(o.name)+'</div></th>';
    });
    html+='<th class="ol-th-total">Решено</th></tr></thead><tbody>';

    students.forEach(function(st){
      var login=st.login;
      var rowMarks=clsMarks[login]||{};
      var cnt=0; items.forEach(function(o,i){ if(rowMarks[String(i)]) cnt++; });
      html+='<tr><td class="ol-td-name">'+escapeHtml(st.name)+'</td>';
      items.forEach(function(o,i){
        if(isTeacher){
          var key=String(i);
          var on=!!rowMarks[key];
          html+='<td class="ol-td-heart"><button class="ol-heart'+(on?' on':'')+'" data-login="'+escAttr(login)+'" data-idx="'+i+'" title="Отметить">'+heart(on)+'</button></td>';
        } else {
          var on=!!rowMarks[String(i)];
          html+='<td class="ol-td-heart">'+heart(on)+'</td>';
        }
      });
      html+='<td class="ol-td-total">'+cnt+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }

  body.innerHTML=html;

  // Переключение класса (админ/преподаватель с несколькими классами)
  var sel=body.querySelector("#olymp-class-select");
  if(sel){
    sel.addEventListener("change",function(){
      window.__olympSel=sel.value;
      renderOlympiads();
    });
  }

  // Обработчики для преподавателя/админа
  if(isTeacher){
    var btns=body.querySelectorAll(".ol-heart");
    btns.forEach(function(b){
      b.addEventListener("click",function(){
        var login=b.getAttribute("data-login");
        var idx=parseInt(b.getAttribute("data-idx"),10);
        var m=getOlympMarks();
        if(!m[className]) m[className]={};
        var cm=m[className];
        if(!cm[login]) cm[login]={};
        cm[login][String(idx)] = cm[login][String(idx)] ? undefined : true;
        if(!cm[login][String(idx)]) delete cm[login][String(idx)];
        saveOlympMarks(m);
        renderOlympiads();
      });
    });
  }
}

/* ---------- Обработчики преподавателя: создание и ведение классов ---------- */
function bindTeacherClassEvents(u){
  var addBtn=$("#tea-class-add");
  if(addBtn) addBtn.addEventListener("click",function(){
    var name=$("#tea-class-name"); var cn=name?name.value.trim():"";
    if(!cn){ toast("Введи название класса"); return; }
    var classes=getClasses();
    if(classes.some(function(c){return c.name===cn;})){ toast("Класс уже есть"); return; }
    classes.push({name:cn,teacher:u.login,students:[]});
    saveClasses(classes);
    var users=getUsers();
    if(users[u.login]){ users[u.login].groupTeacher=cn; if(!users[u.login].groupTeacher){} }
    saveUsers(users);
    renderProfile(); toast("Класс «"+cn+"» создан");
  });
  if(!window.__teacherDelegate){
    window.__teacherDelegate=true;
    document.addEventListener("click", teacherDelegateClick);
  }
  function teacherDelegateClick(ev){
    var t=ev.target;
    var add= t.closest?t.closest("[data-tea-addstu]"):null;
    var rmstu=t.closest?t.closest("[data-tea-rmstu]"):null;
    var rmcls=t.closest?t.closest("[data-tea-delclass]"):null;
    if(add){
      var clsName=add.getAttribute("data-tea-addstu");
      var box=add.closest(".admin-class"); if(!box){ toast("Не найден блок"); return; }
      var name=((box.querySelector(".tea-stu-name")||{}).value||"").trim();
      var login=((box.querySelector(".tea-stu-login")||{}).value||"").trim();
      var pass=(box.querySelector(".tea-stu-pass")||{}).value||"";
      if(!name||!login||!pass){ toast("Заполни имя, логин, пароль"); return; }
      if(clsName!==(u.groupTeacher||"")){ /* допустимо, если учитель владеет классом */ }
      var classes=getClasses();
      var cls=classes.filter(function(c){return c.name===clsName;})[0];
      var users=getUsers();
      if(users[login]){ toast("Логин уже занят"); return; }
      if(!cls){ toast("Класс не найден"); return; }
      if(!(cls.students||[]).some(function(s){return s.login===login;})){ cls.students.push({login:login,name:name}); }
      users[login]={login:login,pass:pass,name:name,role:"student",className:clsName};
      saveUsers(users); saveClasses(classes);
      renderProfile(); toast("Ученик "+name+" добавлен");
    }
    else if(rmstu){
      var clsName=rmstu.getAttribute("data-tea-rmstu"); var login=rmstu.getAttribute("data-login");
      if(!confirm("Удалить ученика?")) return;
      var users=getUsers(); delete users[login]; saveUsers(users);
      var classes=getClasses(); var cls=classes.filter(function(c){return c.name===clsName;})[0];
      if(cls&&cls.students){ cls.students=cls.students.filter(function(s){return s.login!==login;}); }
      saveClasses(classes); renderProfile(); toast("Ученик удалён");
    }
    else if(rmcls){
      var clsName=rmcls.getAttribute("data-tea-delclass");
      if(!confirm("Удалить свой класс «"+clsName+"»? Ученики будут удалены.")) return;
      var classes=getClasses(); var cls=classes.filter(function(c){return c.name===clsName;})[0];
      if(cls){
        var users=getUsers();
        (cls.students||[]).forEach(function(s){ delete users[s.login]; });
        if(cls.teacher===u.login){ users[u.login]={login:u.login,pass:(users[u.login]&&users[u.login].pass)||"",name:(users[u.login]&&users[u.login].name)||u.name,role:"teacher",className:"",groupTeacher:""}; }
        saveUsers(users);
        classes=classes.filter(function(c){return c.name!==clsName;});
        saveClasses(classes);
      }
      renderProfile(); toast("Класс «"+clsName+"» удалён");
    }
  }
}

/* ============================================================
   ПОДВКЛАДКА «КЛАССЫ»: выбор класса, внутри — олимпиады/КР/статистика
   ============================================================ */
// Классы, доступные пользователю: админ — все, преподаватель — свои, ученик — свой.
function classAvailableFor(u){
  var all=(getClasses()||[]).slice();
  if(!u) return [];
  if(u.role==="admin") return all;
  if(u.role==="teacher"){
    var own=all.filter(function(c){return c.teacher===u.login;});
    if(!own.length && u.groupTeacher){ own=all.filter(function(c){return c.name===u.groupTeacher;}); }
    return own;
  }
  return all.filter(function(c){return c.name===u.className;});
}
function setCurrentClass(name){ storeSet(K.curClass, name||""); }
function getCurrentClass(){ return storeGet(K.curClass,""); }
function openClass(name){ setCurrentClass(name); showView("class"); }

function renderClassesView(){
  var body=$("#classes-body"); if(!body) return;
  var u=currentUser();
  if(!u || (u.role!=="teacher"&&u.role!=="admin")){ body.innerHTML='<div class="muted">Раздел «Классы» доступен преподавателю и администратору.</div>'; return; }
  var available=classAvailableFor(u).slice().sort(function(a,b){return a.name<b.name?-1:(a.name>b.name?1:0);});
  var users=getUsers();
  var isAdmin=(u.role==="admin");

  var html='<div class="module-grid">';
  if(!available.length){ html=''; }
  available.forEach(function(c){
    var teacher=users[c.teacher]||null;
    var tName=c.teacher?((teacher&&teacher.name)||('Логин: '+c.teacher)):"—";
    var students=c.students?c.students.length:0;
    var cardColor=c.color||"#2f6fed";
    html+='<div class="mod-tile available class-tile" data-class="'+escAttr(c.name)+'" style="border-top-color:'+cardColor+'">'
      +'<div class="mt-top"><span class="mt-no">Класс</span><span class="mt-icon">🏫</span></div>'
      +'<h3>'+escapeHtml(c.name)+'</h3>'
      +'<div class="mt-desc">учеников: '+students+'</div>'
      +'<div class="class-teacher-line">👨‍🏫 '+escapeHtml(tName)+'</div>'
      +'<div class="mt-prog"><span class="class-open-tag">Открыть класс →</span></div>'
      +'</div>';
  });
  if(available.length) html+='<div class="mod-tile available class-tile class-tile-new" id="class-create-tile" data-create="1" style="border-top-color:var(--good)">'
    +'<div class="mt-top"><span class="mt-no">Новый</span><span class="mt-icon">➕</span></div>'
    +'<h3>Создать класс</h3>'
    +'<div class="mt-desc">Начни новый класс: выбери название и добавь учеников.</div>'
    +'<div class="mt-prog"><span class="class-open-tag">+ Создать</span></div>'
    +'</div>';
  html+='</div>';

  // Если классов нет — показываем пустую плитку-создатель
  if(!available.length){
    body.innerHTML='<div class="module-grid">'
      +'<div class="mod-tile available class-tile class-tile-new" id="class-create-tile" data-create="1" style="border-top-color:var(--good)">'
      +'<div class="mt-top"><span class="mt-no">Новый</span><span class="mt-icon">➕</span></div>'
      +'<h3>Создать первый класс</h3>'
      +'<div class="mt-desc">Начни новый класс: выбери название и добавь учеников.</div>'
      +'<div class="mt-prog"><span class="class-open-tag">+ Создать</span></div>'
      +'</div></div>';
    return;
  }
  body.innerHTML=html;

  // Открыть класс
  $$("#classes-body .class-tile[data-class]").forEach(function(t){
    t.addEventListener("click",function(){ openClass(t.getAttribute("data-class")); });
  });
  // Создать класс (плитка и кнопка в шапке)
  var ct=$("#classes-body #class-create-tile");
  if(ct) ct.addEventListener("click",function(){ openClassCreateModal(u, isAdmin); });
  var cbt=$("#classes-add-btn");
  if(cbt){ cbt.onclick=null; cbt.addEventListener("click",function(){ openClassCreateModal(u, isAdmin); }); }
}

function openClassCreateModal(u){
  var cname=prompt("Название нового класса (например: 8А):");
  if(cname===null) return;
  cname=cname.trim(); if(!cname){ toast("Введи название класса"); return; }
  var classes=getClasses();
  if(classes.some(function(c){return c.name===cname;})){ toast("Класс с таким названием уже есть"); return; }
  var users=getUsers();
  var teacher=u.login;
  // если админ — зададим преподавателя класса
  if(u.role==="admin"){
    var teachers=Object.keys(users).filter(function(l){return users[l].role==="teacher";});
    var chosen="";
    if(teachers.length){
      chosen=teachers[0];
      var tsel="";
      teachers.forEach(function(t){ tsel+=(t===chosen?'<option value="'+escAttr(t)+'" selected>':'<option value="'+escAttr(t)+'">')+escapeHtml(users[t].name)+'</option>'; });
      var pick=prompt("Класс создаст преподаватель ("+users[chosen].name+"). Если нужно выбрать другого — введи его логин:\nДоступные: "+teachers.join(", "));
      if(pick!==null && pick.trim() && users[pick.trim()] && users[pick.trim()].role==="teacher"){ chosen=pick.trim(); }
    } else {
      toast("Сначала добавь преподавателя в «Кабинете»"); return;
    }
    teacher=chosen;
  }
  classes.push({name:cname,teacher:teacher,students:[],color:null});
  // назначим преподавателю группу, если её ещё нет
  if(users[teacher] && !users[teacher].groupTeacher){ users[teacher].groupTeacher=cname; }
  saveClasses(classes); saveUsers(users);
  toast("Класс «"+cname+"» создан");
  renderClassesView();
  refreshNav();
}

function renderClassWorkspace(){
  var body=$("#cl-body"); if(!body) return;
  var u=currentUser();
  var name=getCurrentClass();
  var classes=getClasses();
  var cls=classes.filter(function(c){return c.name===name;})[0];
  if(!cls || !u || (u.role!=="teacher"&&u.role!=="admin")){ showView("classes"); return; }
  var users=getUsers();
  var teacher=users[cls.teacher]||null;
  // Заголовок
  $("#cl-title").textContent="Класс «"+cls.name+"»";
  $("#cl-sub").textContent=(u.role==="admin"?"Администратор · ":"")+"Преподаватель: "+(cls.teacher?(teacher?teacher.name:('Логин: '+cls.teacher)):"—")+" · учеников: "+(cls.students?cls.students.length:0);
  $("#cl-back").addEventListener("click",function(){ showView("classes"); });

  // Подпись "состав класса" уже в topbar (cl-edit)
  // Выбор подраздела (визуал плиток)
  var html='<div class="cl-tabs" id="cl-tabs">';
  html+='<div class="sub-card cl-tab-card'+(window.__clTab==="olympiads"||!window.__clTab?' active':'')+'" data-cltab="olympiads">'
    +'<div class="sc-top"><span class="sc-icon">🏆</span></div>'
    +'<h3 class="sc-name">Олимпиады</h3><div class="sc-desc">Отметки РСОШ: кто что решает</div></div>';
  html+='<div class="sub-card cl-tab-card'+(window.__clTab==="kr"?' active':'')+'" data-cltab="kr">'
    +'<div class="sc-top"><span class="sc-icon">📝</span></div>'
    +'<h3 class="sc-name">Контрольные работы</h3><div class="sc-desc">Банк задач и составление КР</div></div>';
  html+='<div class="sub-card cl-tab-card'+(window.__clTab==="stats"?' active':'')+'" data-cltab="stats">'
    +'<div class="sc-top"><span class="sc-icon">📊</span></div>'
    +'<h3 class="sc-name">Статистика класса</h3><div class="sc-desc">Сводка, олимпиады, прогресс, экспорт</div></div>';
  html+='<div class="sub-card cl-tab-card'+(window.__clTab==="hw"?' active':'')+'" data-cltab="hw">'
    +'<div class="sc-top"><span class="sc-icon">📚</span></div>'
    +'<h3 class="sc-name">Домашнее задание</h3><div class="sc-desc">Выдать и посмотреть ДЗ классу</div></div>';
  html+='</div>';
  html+='<div id="cl-content"></div>';
  body.innerHTML=html;

  // Состав класса
  var editBtn=$("#cl-edit");
  if(editBtn){
    editBtn.onclick=null;
    editBtn.addEventListener("click",function(){ openClassComposition(cls, u); });
  }
  // Удаление класса
  var delBtn=$("#cl-del");
  if(delBtn){
    delBtn.onclick=null;
    delBtn.addEventListener("click",function(){
      if(!confirm("Удалить класс «"+cls.name+"»? Ученики класса и их отметки будут удалены. Это действие нельзя отменить.")) return;
      var C=getClasses(); var keep=C.filter(function(c){return c.name!==cls.name;});
      saveClasses(keep);
      // удалить аккаунты учеников класса
      var U=getUsers();
      (cls.students||[]).forEach(function(s){ delete U[s.login]; });
      saveUsers(U);
      // убрать отметки олимпиад класса
      var mk=getOlympMarks(); if(mk[cls.name]){ delete mk[cls.name]; saveOlympMarks(mk); }
      // убрать текущий класс и вернуться к списку
      setCurrentClass(""); window.__clTab=null;
      toast("Класс «"+cls.name+"» удалён");
      showView("classes");
      renderClassesView();
      refreshNav();
    });
  }

  $$("#cl-body .cl-tab-card").forEach(function(c){
    c.addEventListener("click",function(){
      window.__clTab=c.getAttribute("data-cltab");
      renderClassWorkspace();
    });
  });
  // рендер содержимого выбранного подраздела
  var tab=window.__clTab||"olympiads";
  if(tab==="kr") renderClassKR(cls,u);
  else if(tab==="stats") renderClassStats(cls,u);
  else if(tab==="hw") renderClassHomework(cls,u);
  else renderClassOlympiads(cls,u);
}

function openClassComposition(cls, u){
  var users=getUsers();
  var h='<div class="profile-card" style="margin-top:14px"><div class="ac-head"><b>👥 Состав класса «'+escapeHtml(cls.name)+'»</b>'
    +'<button class="btn btn-sm btn-ghost" id="cl-comp-close">закрыть</button></div>';
  h+='<div class="ac-teacher">Преподаватель: <b>'+escapeHtml(users[cls.teacher]?users[cls.teacher].name:('Логин: '+(cls.teacher||"—"))) +'</b></div>';
  if(!(cls.students||[]).length){ h+='<div class="muted" style="font-size:12px;margin:6px 0">Учеников нет.</div>'; }
  (cls.students||[]).forEach(function(st){
    h+='<div class="ac-student"><span>'+escapeHtml(st.name)+'</span><span class="muted" style="font-size:12px">логин: '+escapeHtml(st.login)+'</span>'
      +'<button class="btn btn-sm btn-ghost" data-cl-rmstu="'+escAttr(cls.name)+'" data-login="'+escAttr(st.login)+'">удалить</button></div>';
  });
  h+='<div class="form-row" style="margin-top:8px"><label>Добавить ученика в «'+escapeHtml(cls.name)+'»</label>'
    +'<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">'
    +'<input class="cl-add-name" placeholder="Имя" style="flex:1;min-width:120px">'
    +'<input class="cl-add-login" placeholder="Логин" style="flex:1;min-width:100px">'
    +'<input class="cl-add-pass" type="password" placeholder="Пароль" style="flex:1;min-width:100px">'
    +'<button class="btn btn-sm btn-primary" data-cl-addstu="'+escAttr(cls.name)+'">Добавить</button></div></div>'
    +'<div class="form-actions"><button class="btn" id="cl-comp-close2">Готово</button></div>'
    +'</div>';
  // вставляем под topbar в cl-body
  var body=$("#cl-body");
  var old=body.querySelector(".cl-comp-panel"); if(old) old.remove();
  var tmp=document.createElement("div"); tmp.className="cl-comp-panel"; tmp.innerHTML=h;
  body.insertBefore(tmp, body.firstChild);
  var close=function(){ var p=body.querySelector(".cl-comp-panel"); if(p) p.remove(); };
  var c1=$("#cl-comp-close"), c2=$("#cl-comp-close2");
  if(c1) c1.addEventListener("click",close); if(c2) c2.addEventListener("click",close);
  var add=body.querySelector("[data-cl-addstu]");
  if(add) add.addEventListener("click",function(){
    var nm=(body.querySelector(".cl-add-name")||{}).value||"";
    var lg=(body.querySelector(".cl-add-login")||{}).value||"";
    var ps=(body.querySelector(".cl-add-pass")||{}).value||"";
    if(!nm||!lg||!ps){ toast("Заполни имя, логин, пароль"); return; }
    var U=getUsers();
    if(U[lg]){ toast("Логин уже занят"); return; }
    var C=getClasses(); var K=cls.name;
    var cc=C.filter(function(x){return x.name===K;})[0];
    if(!cc){ toast("Класс не найден"); return; }
    if(!(cc.students||[]).some(function(s){return s.login===lg;})){ cc.students.push({login:lg,name:nm}); }
    U[lg]={login:lg,pass:ps,name:nm,role:"student",className:K};
    saveUsers(U); saveClasses(C);
    toast("Ученик "+nm+" добавлен"); renderClassWorkspace();
  });
  var rmstu=body.querySelector("[data-cl-rmstu]");
  if(rmstu) rmstu.addEventListener("click",function(){
    var lg=rmstu.getAttribute("data-login");
    if(!confirm("Удалить ученика?")) return;
    var U=getUsers(); delete U[lg]; saveUsers(U);
    var C=getClasses(); var cc=C.filter(function(x){return x.name===cls.name;})[0];
    if(cc&&cc.students){ cc.students=cc.students.filter(function(s){return s.login!==lg;}); }
    saveClasses(C); renderClassWorkspace();
  });
}

/* ---------- Роль админа в «Состав класса»: показать и создателя ---------- */
// (реализовано через общий открытый модальный состав)

/* ---------- Подраздел «Олимпиады» класса ---------- */
function renderClassOlympiads(cls, u){
  var box=$("#cl-content"); if(!box) return;
  var items=OLYMPIADS_MATH;
  var marks=getOlympMarks();
  var students=cls.students||[];
  var className=cls.name;
  var clsMarks=marks[className]||{};

  var html='<div class="panel"><div class="view-head-row"><div class="view-head"><h3>🏆 Олимпиады из перечня РСОШ</h3>'
    +'<p class="muted" style="font-size:12.5px">Нажми на сердечко, чтобы отметить, что ученик решил олимпиаду.</p></div></div>';

  // Легенда уровней
  html+='<div class="olimp-legend"><span class="olimp-lvl-chip clvl-i">Уровень I</span>'
    +'<span class="olimp-lvl-chip clvl-ii">Уровень II</span>'
    +'<span class="olimp-lvl-chip clvl-iii">Уровень III</span>'
    +'<span class="olimp-lvl-chip clvl-mp">МинПрос</span>'
    +'<span class="muted" style="font-size:12px">Выше уровень — больше льгот при поступлении; МинПрос — из перечня Минпросвещения</span></div>';

  if(!students.length){
    html+='<div class="muted" style="margin-top:14px">В классе нет учеников. Открой «Состав класса», чтобы добавить.</div>';
  } else {
    html+='<div class="olimp-scroll"><table class="olimp-table"><thead><tr><th class="ol-th-name">Ученик</th>';
    items.forEach(function(o,i){
      var lvlCls = olympChipClass(o);
      html+='<th class="ol-th-'+o.level+'"><span class="olimp-lvl-chip '+olympChipClass(o)+'">'+olympChipLabel(o)+'</span><div class="ol-th-name">'+escapeHtml(o.name)+'</div></th>';
    });
    html+='<th class="ol-th-total">Решено</th></tr></thead><tbody>';
    students.forEach(function(st){
      var rowMarks=clsMarks[st.login]||{};
      var cnt=0; items.forEach(function(o,i){ if(rowMarks[String(i)]) cnt++; });
      html+='<tr><td class="ol-td-name">'+escapeHtml(st.name)+'</td>';
      items.forEach(function(o,i){
        var on=!!rowMarks[String(i)];
        html+='<td class="ol-td-heart"><button class="ol-heart'+(on?' on':'')+'" data-cls="'+escAttr(className)+'" data-login="'+escAttr(st.login)+'" data-idx="'+i+'" title="Отметить">'+(on?"❤️":"🤍")+'</button></td>';
      });
      html+='<td class="ol-td-total">'+cnt+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  box.innerHTML=html;
  $$("#cl-content .ol-heart").forEach(function(b){
    b.addEventListener("click",function(){
      var clsN=b.getAttribute("data-cls");
      var login=b.getAttribute("data-login");
      var idx=parseInt(b.getAttribute("data-idx"),10);
      var m=getOlympMarks();
      if(!m[clsN]) m[clsN]={};
      var cm=m[clsN]; if(!cm[login]) cm[login]={};
      cm[login][String(idx)] = cm[login][String(idx)] ? undefined : true;
      if(!cm[login][String(idx)]) delete cm[login][String(idx)];
      saveOlympMarks(m);
      renderClassOlympiads(cls,u);
    });
  });
}

/* ---------- Подраздел «Контрольные работы» класса ---------- */
function renderClassKR(cls, u){
  var box=$("#cl-content"); if(!box) return;
  var cur=window.__clKr||"bank"; // bank | make
  var html='<div class="cl-subtabs" id="cl-kr-tabs">'
    +'<div class="sub-card cl-tab-card cl-kr-card'+(cur==="bank"?' active':'')+'" data-krtab="bank">'
    +'<div class="sc-top"><span class="sc-icon">🗂</span></div>'
    +'<h3 class="sc-name">Банк задач</h3><div class="sc-desc">Все задачи курса по блокам сложности</div></div>'
    +'<div class="sub-card cl-tab-card cl-kr-card'+(cur==="make"?' active':'')+'" data-krtab="make">'
    +'<div class="sc-top"><span class="sc-icon">🔀</span></div>'
    +'<h3 class="sc-name">Составить КР</h3><div class="sc-desc">2 равносильных варианта из банка</div></div>'
    +'</div>';
  html+='<div id="cl-kr-content"></div>';
  box.innerHTML=html;
  $$("#cl-kr-tabs .cl-kr-card").forEach(function(c){
    c.addEventListener("click",function(){ window.__clKr=c.getAttribute("data-krtab"); renderClassKR(cls,u); });
  });
  if(cur==="make") renderMakeKR(cls,u);
  else renderClassKRBank(cls,u);
}

/* ---------- Банк задач (внутри КР) ---------- */
var LAST_KR=null; // { scope, v1, v2, clsName }
function krScopeOptions(){
  var sels='<span class="fsep">Материал КР:</span>'
    +'<select id="kr-module" class="filter-select"><option value="all">Все блоки</option>';
  OLYMP_MODULES.forEach(function(m){ sels+='<option value="'+escAttr(m.id)+'">'+escapeHtml(m.name)+'</option>'; });
  sels+='</select>';
  sels+='<select id="kr-level" class="filter-select"><option value="all">Все уровни</option>'
    +'<option value="base">База</option><option value="active">Актив</option><option value="olimp">Олимп</option></select>';
  return sels;
}
function cramTasks(scope){
  // Все задачи банка с фильтром scope: {moduleId, level}
  var out=allTasks().filter(function(t){ return t.id && (t.module||t.theme); });
  if(scope.moduleId && scope.moduleId!=="all") out=out.filter(function(t){ return t.module===scope.moduleId || (t.theme&&t.theme.indexOf(scope.moduleId+"__")===0); });
  if(scope.level && scope.level!=="all") out=out.filter(function(t){ return t.level===scope.level; });
  return out;
}
function renderClassKRBank(cls, u){
  var box=$("#cl-kr-content"); if(!box) return;
  var html='<div class="panel">';
  html+='<div class="view-head-row"><div class="view-head"><h3>🗂 Банк задач курса</h3>'
    +'<p class="muted" style="font-size:12.5px">Задачи курса по блокам сложности (база → олимп). Используются для составления контрольной работы.</p></div></div>';
  html+='<div class="bank-summary">'
    +'<div class="bs-block"><b id="krstatBase">0</b><span>Блок A · база<br>лёгкие</span></div>'
    +'<div class="bs-block"><b id="krstatActive">0</b><span>Блок B · актив<br>средние</span></div>'
    +'<div class="bs-block"><b id="krstatOlimp">0</b><span>Блок C · олимп<br>сложные</span></div>'
    +'<div class="bs-block total"><b id="krstatT">0</b><span>всего задач</span></div>'
    +'</div>';
  html+='<div class="bank-filters">'+krScopeOptions()
    +'<button class="btn btn-sm" id="kr-bank-txt">Скачать банк (txt)</button>'
    +'<button class="btn btn-sm" id="kr-bank-pdf">Скачать PDF</button></div>';
  html+='<div id="kr-bank-list" class="ck-qlist"></div></div>';
  box.innerHTML=html;

  var scope={moduleId:"all",level:"all"};
  var list=cramTasks(scope);
  var statB=list.filter(function(t){return t.level==="base";}).length;
  var statA=list.filter(function(t){return t.level==="active";}).length;
  var statO=list.filter(function(t){return t.level==="olimp";}).length;
  var st=$("#krstatBase"); if(st) st.textContent=statB;
  var sa=$("#krstatActive"); if(sa) sa.textContent=statA;
  var so=$("#krstatOlimp"); if(so) so.textContent=statO;
  var stt=$("#krstatT"); if(stt) stt.textContent=(statB+statA+statO);

  function renderList(){
    var s={moduleId:$("#kr-module")?$("#kr-module").value:"all", level:$("#kr-level")?$("#kr-level").value:"all"};
    var arr=cramTasks(s);
    var h="";
    if(!arr.length){ h='<div class="muted" style="padding:10px">Нет задач по этому фильтру.</div>'; }
    arr.forEach(function(t){
      var lvl=t.level||"active";
      var lvlName=lvl==="base"?"База":lvl==="olimp"?"Олимп":"Актив";
      var color=lvl==="base"?"var(--good)":lvl==="olimp"?"var(--heat)":"var(--electro)";
      h+='<div class="ck-q"><div class="qpts"><span style="color:'+color+';font-weight:800">Блок '+(lvl==="base"?"A":lvl==="olimp"?"C":"B")+' · '+lvlName+'</span>'
        +' · <span class="muted">'+(t.moduleName?escapeHtml(t.moduleName):'')+'</span></div>'
        +'<div class="qtext">'+inlineFmt(escapeHtml(t.text))
        +(t.options?'<div class="tc-opts">'+t.options.map(function(o,i){return '<span>'+(i+1)+') '+inlineFmt(escapeHtml(o))+'</span>';}).join("")+'</div>':"")
        +'</div><div class="qsol"><b>Ответ:</b> '+inlineFmt(escapeHtml(t.answer||""))+'</div></div>';
    });
    $("#kr-bank-list").innerHTML=h;
    applyMath($("#kr-bank-list"));
  }
  renderList();
  var ms=$("#kr-module"); if(ms) ms.addEventListener("change",renderList);
  var ls=$("#kr-level"); if(ls) ls.addEventListener("change",renderList);
  var dlt=$("#kr-bank-txt");
  if(dlt) dlt.addEventListener("click",function(){
    var arr=cramTasks({moduleId:"all",level:"all"});
    var lines=["БАНК ЗАДАЧ КУРСА (контрольные работы)",""];
    arr.forEach(function(t){ lines.push((t.level||"active")+" · "+(t.text||"")); });
    downloadText("Банк_задач_класса_"+safeName(cls.name)+".txt", lines.join("\n"));
  });
  var dlp=$("#kr-bank-pdf");
  if(dlp) dlp.addEventListener("click",function(){
    var arr=cramTasks({moduleId:"all",level:"all"});
    if(typeof window.OLYMP_buildBankPdf!=="function"){ toast("Генератор PDF не загружен"); return; }
    window.OLYMP_buildBankPdf(arr, "Банк задач курса \u2014 класс "+cls.name, "Банк_задач_класса_"+safeName(cls.name)+".pdf");
  });
}

function makeKRPick(scope){
  var A=cramTasks({moduleId:scope.moduleId, level:"base"});
  var B=cramTasks({moduleId:scope.moduleId, level:"active"});
  var C=cramTasks({moduleId:scope.moduleId, level:"olimp"});
  // паттерн 6+3+2 (как в 10 КЛАСС): блок A — 6 лёгких, блок B — 3, блок C — 2
  if(A.length<6 || B.length<3 || C.length<2){
    toast("Мало задач: нужно ≥6 базовых (блок A), ≥3 актив (блок B), ≥2 олимп (блок C)"); return null;
  }
  var v1={A:shuffle(A).slice(0,6),B:shuffle(B).slice(0,3),C:shuffle(C).slice(0,2)};
  var used=v1.A.concat(v1.B).concat(v1.C).map(function(t){return t.id;});
  var remA=A.filter(function(t){return used.indexOf(t.id)<0;});
  var remB=B.filter(function(t){return used.indexOf(t.id)<0;});
  var remC=C.filter(function(t){return used.indexOf(t.id)<0;});
  var v2={A:shuffle(remA.length>=6?remA:A).slice(0,6),B:shuffle(remB.length>=3?remB:B).slice(0,3),C:shuffle(remC.length>=2?remC:C).slice(0,2)};
  return {v1:v1,v2:v2,scope:scope,bank:{A:A.length,B:B.length,C:C.length}};
}
function renderMakeKR(cls, u){
  var box=$("#cl-kr-content"); if(!box) return;
  var html='<div class="panel"><div class="view-head-row"><div class="view-head"><h3>🔀 Составить контрольную работу</h3>'
    +'<p class="muted" style="font-size:12.5px">Автоматически собираются 2 равносильных варианта: 6 лёгких (база) + 3 средних (актив) + 2 сложных (олимп).</p></div></div>';
  html+='<div class="pattern-card">'
    +'<div class="pattern-row"><span class="p-badge bA">Задания 1–6</span><span>база · 1 балл · лёгкие</span></div>'
    +'<div class="pattern-row"><span class="p-badge bB">Задания 7–9</span><span>актив · 2 балла · средние</span></div>'
    +'<div class="pattern-row"><span class="p-badge bC">Задания 10–11</span><span>олимп · 3 балла · сложные</span></div>'
    +'<div class="pattern-row scored"><span>Система оценивания:</span><span>максимум 15 баллов</span></div>'
    +'</div>';
  html+='<div class="control-actions">'+krScopeOptions()
    +'<button class="btn btn-primary" id="kr-gen">Составить 2 варианта</button>'
    +'<button class="btn" id="kr-dl-txt" disabled>Скачать (txt)</button>'
    +'<button class="btn" id="kr-dl-pdf" disabled>Скачать PDF</button>'
    +'<button class="btn" id="kr-print" disabled>Печать</button></div>';
  html+='<div id="kr-output" class="control-output"></div></div>';
  box.innerHTML=html;

  function renderOut(){
    var out=$("#kr-output");
    if(!LAST_KR){ out.innerHTML='<div class="empty"><span class="big">📝</span>Нажмите «Составить 2 варианта».</div>'; return; }
    var html="";
    [["Вариант 1",LAST_KR.v1],["Вариант 2",LAST_KR.v2]].forEach(function(pair){
      var V=pair[1]; var num=0;
      html+='<div class="ckwork"><h3>'+pair[0]+'</h3><div class="ck-sub">Контрольная работа · 11 заданий</div>';
      function eq(t){ num++; return '<div class="ck-q"><div class="qpts">Задание '+num+' · '+(t.level==="base"?"база":t.level==="olimp"?"олимп":"актив")+'</div><div class="qtext">'+inlineFmt(escapeHtml(t.text))+(t.options?'<div class="tc-opts">'+t.options.map(function(o,i){return '<span>'+(i+1)+') '+inlineFmt(escapeHtml(o))+'</span>';}).join("")+'</div>':"")+'</div>'; }
      V.A.forEach(function(t){ html+=eq(t); }); V.B.forEach(function(t){ html+=eq(t); }); V.C.forEach(function(t){ html+=eq(t); });
      html+='</div>';
    });
    out.innerHTML=html;
    applyMath(out);
  }
  renderOut();

  $("#kr-gen").addEventListener("click",function(){
    var scope={ moduleId:$("#kr-module")?$("#kr-module").value:"all", level:"all" };
    var kr=makeKRPick(scope);
    if(!kr) return;
    LAST_KR=kr; LAST_KR.clsName=cls?cls.name:"";
    $("#kr-dl-txt").disabled=false; $("#kr-dl-pdf").disabled=false; $("#kr-print").disabled=false;
    renderOut(); toast("Собрано 2 варианта");
  });
  $("#kr-dl-txt").addEventListener("click",function(){
    if(!LAST_KR) return;
    var lines=["Контрольная работа — класс "+cls.name,""];
    [["Вариант 1",LAST_KR.v1],["Вариант 2",LAST_KR.v2]].forEach(function(pair){
      var V=pair[1]; var num=0;
      lines.push("=== "+pair[0]+" ===");
      V.A.concat(V.B).concat(V.C).forEach(function(t){ num++; lines.push(num+". "+t.text+(t.options?" ["+t.options.join(" / ")+"]":"")+(t.answer?"  → "+t.answer:"")); });
      lines.push("");
    });
    downloadText("КР_"+safeName(cls.name)+"_2_варианта.txt", lines.join("\n"));
  });
  $("#kr-dl-pdf").addEventListener("click",function(){
    if(!LAST_KR) return;
    if(typeof window.OLYMP_buildControlPdf!=="function"){ toast("Генератор PDF не загружен"); return; }
    var theme="Класс "+cls.name;
    window.OLYMP_buildControlPdf({ v1:LAST_KR.v1, v2:LAST_KR.v2, theme:theme, fileName:"КР_"+safeName(cls.name)+"_2_варианта.pdf" });
  });
  $("#kr-print").addEventListener("click",function(){
    var out=$("#kr-output");
    if(!out || !LAST_KR){ toast("Сначала составь КР"); return; }
    var win=window.open("","_blank","width=900,height=700");
    win.document.write('<html><head><title>Контрольная работа</title><style>body{font-family:Georgia,serif;padding:24px;color:#111}.v{page-break-after:always}h2{text-align:center}.q{margin:10px 0}.s{font-size:13px;color:#555}</style></head><body>');
    win.document.write('<h2>Контрольная работа — класс '+escapeHtml(cls.name)+'</h2>');
    [["Вариант 1",LAST_KR.v1],["Вариант 2",LAST_KR.v2]].forEach(function(pair){
      var V=pair[1]; var num=0;
      win.document.write('<div class="v"><h3>'+pair[0]+'</h3>');
      V.A.concat(V.B).concat(V.C).forEach(function(t){ num++; win.document.write('<div class="q">'+num+'. '+escapeHtml(t.text)+(t.options?'<br><span class="s">'+t.options.map(function(o,i){return (i+1)+') '+escapeHtml(o);}).join(" · ")+'</span>':"")+'</div>'); });
      win.document.write('</div>');
    });
    win.document.write('</body></html>');
    win.document.close(); win.focus(); win.print();
  });
}

/* ---------- Подраздел «Статистика класса» ---------- */
function classProgressFor(login){
  // прогресс ученика (без мутации P)
  var u=getUsers()[login]; if(!u) return null;
  var p;
  try{ p=JSON.parse(localStorage.getItem("math10_prog_"+login)||"null")||defaultProgress(u); }
  catch(e){ p=defaultProgress(u); }
  if(u) p.user=u;
  return p;
}
function moduleProgressForUser(p, moduleId){
  if(!p) return 0;
  var tsk=allTasks().filter(function(t){ return t.module===moduleId; });
  if(!tsk.length) return 0;
  var ok=tsk.filter(function(t){ var st=p.solvedTasks[t.id]; return st&&st.status==="ok"; }).length;
  return Math.round(100*ok/tsk.length);
}
function olympCountForLogin(login, className){
  var marks=getOlympMarks();
  var cm=(marks[className]||{})[login]||{};
  var c=0; OLYMPIADS_MATH.forEach(function(o,i){ if(cm[String(i)]) c++; });
  return c;
}
function renderClassStats(cls, u){
  var box=$("#cl-content"); if(!box) return;
  var students=cls.students||[];
  if(!students.length){
    box.innerHTML='<div class="panel"><div class="muted">В классе нет учеников — статистика появится после добавления.</div></div>';
    return;
  }
  // --- Общая сводка ---
  var sumXP=0, sumSolved=0, sumOlymp=0, best=null, maxPct=0;
  var rows=[];
  students.forEach(function(st){
    var p=classProgressFor(st.login)||{xp:0,correctTotal:0};
    var xp=p.xp||0, solved=p.correctTotal||0, olymp=olympCountForLogin(st.login, cls.name);
    sumXP+=xp; sumSolved+=solved; sumOlymp+=olymp;
    var totalPct=0, mods=OLYMP_MODULES.length, acc=0;
    OLYMP_MODULES.forEach(function(m){ acc+=moduleProgressForUser(p,m.id); });
    var avgPct=mods?Math.round(acc/mods):0;
    if(avgPct>maxPct){ maxPct=avgPct; best=st; }
    rows.push({st:st,p:p,xp:xp,solved:solved,olymp:olymp,avgPct:avgPct});
  });
  var avgXp=students.length?Math.round(sumXP/students.length):0;
  var html='<div class="panel"><div class="view-head-row"><div class="view-head"><h3>📊 Статистика класса «'+escapeHtml(cls.name)+'»</h3>'
    +'<p class="muted" style="font-size:12.5px">'+students.length+' учеников</p></div>'
    +'<div class="head-actions"><button class="btn" id="stats-xlsx">⬇ Экспорт в Excel</button>'
    +'<button class="btn" id="stats-pdf">⬇ Скачать PDF</button>'
    +'<button class="btn" id="stats-ompdf">🏅 Олимпиадное движение</button></div></div>';
  // Сводка-карточки
  html+='<div class="stats-grid class-stats-grid">'
    +'<div class="stat-cell"><b>'+students.length+'</b><span>учеников</span></div>'
    +'<div class="stat-cell"><b>'+avgXp+'</b><span>средний XP</span></div>'
    +'<div class="stat-cell"><b>'+sumSolved+'</b><span>задач верно</span></div>'
    +'<div class="stat-cell"><b>'+sumOlymp+'</b><span>олимпиад отмечено</span></div>'
    +(best?'<div class="stat-cell"><b>'+escapeHtml(best.name)+'</b><span>лучший по блокам</span></div>':'')
    +'</div>';
  html+='</div>';

  // --- Таблица учеников ---
  html+='<div class="panel"><h3>Ученики</h3><div class="astat-table-wrap"><table class="astat-table">'
    +'<thead><tr><th>Ученик</th><th>XP</th><th>Уровень</th><th>Задач верно</th><th>Олимпиад</th><th>Прогресс по блокам</th></tr></thead><tbody>';
  rows.forEach(function(r){
    var lv=trackLevelFor(r.p);
    html+='<tr><td>'+escapeHtml(r.st.name)+'</td><td>'+r.xp+'</td><td>'+lv+'</td><td>'+r.solved+'</td><td>'+r.olymp+'</td>'
      +'<td><div class="mini-bar"><i style="width:'+r.avgPct+'%"></i></div> '+r.avgPct+'%</td></tr>';
  });
  html+='</tbody></table></div></div>';

  // --- Прогресс по блокам (матрица) ---
  html+='<div class="panel"><h3>Прогресс по блокам (% зачтено)</h3><div class="astat-table-wrap" style="overflow-x:auto"><table class="astat-table">'
    +'<thead><tr><th>Ученик</th>';
  OLYMP_MODULES.forEach(function(m){ html+='<th title="'+escapeHtml(m.name)+'">'+escapeHtml(m.short)+'</th>'; });
  html+='</tr></thead><tbody>';
  rows.forEach(function(r){
    html+='<tr><td>'+escapeHtml(r.st.name)+'</td>';
    OLYMP_MODULES.forEach(function(m){
      var v=moduleProgressForUser(r.p,m.id);
      var col=v>=100?"var(--good)":v>0?"var(--electro)":"var(--line)";
      html+='<td><span class="modpct" style="color:'+col+'">'+v+'</span></td>';
    });
    html+='</tr>';
  });
  html+='</tbody></table></div></div>';

  // --- Успеваемость по олимпиадам (реюз сердечек, read-only) ---
  html+='<div class="panel"><h3>Успеваемость по олимпиадам РСОШ</h3>';
  var marks=getOlympMarks(); var cm=marks[cls.name]||{};
  html+='<div class="olimp-scroll"><table class="olimp-table"><thead><tr><th class="ol-th-name">Ученик</th>';
  OLYMPIADS_MATH.forEach(function(o,i){ html+='<th class="ol-th-'+o.level+'"><span class="olimp-lvl-chip '+olympChipClass(o)+'">'+olympChipLabel(o)+'</span></th>'; });
  html+='<th class="ol-th-total">Всего</th></tr></thead><tbody>';
  rows.forEach(function(r){
    html+='<tr><td class="ol-td-name">'+escapeHtml(r.st.name)+'</td>';
    var rm=cm[r.st.login]||{};
    var c=0;
    OLYMPIADS_MATH.forEach(function(o,i){ var on=!!rm[String(i)]; if(on)c++; html+='<td class="ol-td-heart">'+(on?"❤️":"🤍")+'</td>'; });
    html+='<td class="ol-td-total">'+c+'</td></tr>';
  });
  html+='</tbody></table></div></div>';

  box.innerHTML=html;

  // Экспорт в Excel
  var btn=$("#stats-xlsx");
  if(btn) btn.addEventListener("click",function(){
    var aoa=[["Статистика класса: "+cls.name,""]];
    aoa.push(["Показатель","Значение"]);
    aoa.push(["Учеников",students.length]);
    aoa.push(["Средний XP",avgXp]);
    aoa.push(["Задач верно (всего)",sumSolved]);
    aoa.push(["Олимпиад отмечено (всего)",sumOlymp]);
    aoa.push([]);
    aoa.push(["Ученик","XP","Уровень","Задач верно","Олимпиад","Прогресс по блокам (%)"]);
    rows.forEach(function(r){ aoa.push([r.st.name,r.xp,trackLevelFor(r.p),r.solved,r.olymp,r.avgPct]); });
    if(typeof window.__xlsxDownloadAoA==="function"){
      window.__xlsxDownloadAoA(aoa, {fileName:"Статистика_класса_"+safeName(cls.name)+".xlsx", sheetName:"Статистика"});
      toast("Статистика выгружена в Excel");
    } else { toast("Генератор Excel не загружен"); }
  });
  // Скачать PDF статистики
  var olympNamesList=OLYMPIADS_MATH.map(function(o){ return o.name; });
  var pbtn=$("#stats-pdf");
  if(pbtn) pbtn.addEventListener("click",function(){
    if(typeof window.OLYMP_buildStatsPdf!=="function"){ toast("Генератор PDF не загружен"); return; }
    var pdfRows=rows.map(function(r){ return {name:r.st.name,xp:r.xp,level:trackLevelFor(r.p),solved:r.solved,olymp:r.olymp,pct:r.avgPct}; });
    // таблица олимпиад: каждый ученик со списком сердечек и логином
    var marks=getOlympMarks(); var cm=marks[cls.name]||{};
    var olympTable=rows.map(function(r){
      var rm=cm[r.st.login]||{};
      var hearts=OLYMPIADS_MATH.map(function(o,i){ return !!rm[String(i)]; });
      return {login:r.st.login, name:r.st.name, hearts:hearts};
    });
    // названия решённых олимпиад по логину
    var solvedByLogin={};
    olympTable.forEach(function(rw){
      var solved=[];
      OLYMPIADS_MATH.forEach(function(o,i){ if(rw.hearts[i]) solved.push(o.name); });
      if(solved.length) solvedByLogin[rw.login]=solved;
    });
    window.OLYMP_buildStatsPdf(cls.name, pdfRows, olympTable, olympNamesList, solvedByLogin, "Статистика_класса_"+safeName(cls.name)+".pdf");
    toast("Статистика формируется в PDF");
  });
  // Олимпиадное движение — отдельный PDF
  var ombtn=$("#stats-ompdf");
  if(ombtn) ombtn.addEventListener("click",function(){
    if(typeof window.OLYMP_buildOlympMovementPdf!=="function"){ toast("Генератор PDF не загружен"); return; }
    var marks=getOlympMarks(); var cm=marks[cls.name]||{};
    var omRows=rows.map(function(r){
      var rm=cm[r.st.login]||{};
      var hearts=OLYMPIADS_MATH.map(function(o,i){ return !!rm[String(i)]; });
      return {login:r.st.login, name:r.st.name, hearts:hearts};
    });
    var olympLevelsList=OLYMPIADS_MATH.map(function(o){ return o.level; });
    window.OLYMP_buildOlympMovementPdf(cls.name, omRows, olympNamesList, olympLevelsList, "Олимпиадное_движение_"+safeName(cls.name)+".pdf");
    toast("Олимпиадное движение формируется в PDF");
  });
}

/* ---------- Подраздел «Домашнее задание» класса ---------- */
function renderClassHomework(cls, u){
  var box=$("#cl-content"); if(!box) return;
  var all=getHomework();
  var list=all.filter(function(h){
    if(h.className==="Все"||!h.className) return true;
    return h.className===cls.name;
  }).slice().reverse();

  var html='<div class="panel"><div class="view-head-row"><div class="view-head"><h3>📚 Домашнее задание</h3>'
    +'<p class="muted" style="font-size:12.5px">Выдай задание классу «'+escapeHtml(cls.name)+'». Ученики увидят его у себя в «Траектории».</p></div></div>';
  // Форма выдачи с выбором задач из банка, своими задачами и файлом
  var bankTree="";
  try{
    var _bt=allTasks();
    var _byMod={};
    _bt.forEach(function(t){ if(!t||!t.id) return; var m=(t.module||t.theme||"прочее"); (_byMod[m]=_byMod[m]||[]).push(t); });
    bankTree='<div class="hw-bank"><div class="hw-bank-label">Добавить задачи из банка:</div><div class="hw-bank-list">';
    Object.keys(_byMod).forEach(function(m){
      var items=_byMod[m];
      bankTree+='<div class="hw-bank-group"><div class="hw-bank-mod">'+escapeHtml(m)+'</div>';
      items.forEach(function(t){ bankTree+='<label class="hw-bank-task"><input type="checkbox" value="'+escAttr(t.id)+'"><span>'+escapeHtml(String(t.text||"").slice(0,90))+'</span></label>'; });
      bankTree+='</div>';
    });
    bankTree+='</div></div>';
  }catch(e){ bankTree=''; }
  html+='<div class="hw-form">'
    +'<div class="form-row"><label>Заголовок</label><input id="hwf-title" placeholder="Например: Задачи по производной" style="width:100%"></div>'
    +'<div class="form-row"><label>Пояснение (необязательно)</label><textarea id="hwf-text" rows="3" placeholder="Комментарий к заданию…" style="width:100%"></textarea></div>'
    +bankTree
    +'<div class="hw-own"><div class="form-row"><label>Добавить свою задачу</label>'
    +'<input id="hwf-own-inp" placeholder="Текст задачи (можно с формулой $\\frac12$)" style="width:100%"></div>'
    +'<button class="btn btn-sm" id="hwf-own-add">＋ Добавить в список</button></div>'
    +'<div class="hw-own-list" id="hwf-own-list"></div>'
    +'<div class="form-row" style="align-items:center"><label style="margin-bottom:0">Прикрепить файл</label>'
    +'<label class="btn btn-sm" style="margin:0;display:inline-flex;align-items:center;cursor:pointer">⬆ Выбрать файл'
    +'<input type="file" id="hwf-file" accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx" style="display:none"></label>'
    +'<span class="muted" id="hwf-fname" style="font-size:12px"></span></div>'
    +'<div class="form-row"><label>Срок сдачи (необязательно)</label><input id="hwf-due" type="date" style="width:100%"></div>'
    +'<div class="form-actions" style="margin-top:10px"><button class="btn btn-primary" id="hwf-add">📤 Выдать задание</button>'
    +'<span class="muted" id="hwf-picked-count" style="font-size:12px;margin-left:10px"></span></div>'
    +'</div>';
  html+='</div>';

  // Список выданных
  html+='<div class="panel"><h3>Выданные задания</h3>';
  if(!list.length){
    html+='<div class="muted" style="font-size:13px;margin-top:6px">Заданий пока не выдавали.</div>';
  } else {
    list.forEach(function(hw){
      var dl=hw.due?(' · срок: <b>'+escapeHtml(hw.due)+'</b>'):"";
      html+='<div class="hw-item"><div class="hw-head">'
        +'<div class="hw-title">'+escapeHtml(hw.title)+'</div>'
        +'<button class="btn btn-sm btn-ghost hw-del" data-hwid="'+escAttr(hw.id)+'" title="Удалить задание">🗑</button>'
        +'</div>'
+'<div class="hw-meta">класс: '+escapeHtml(hw.className||"Все")+' · '+(hw.author?escapeHtml(hw.author):"")+dl
        +hwContentHtml(hw)+'</div></div>';
    });
  }
  html+='</div>';

  box.innerHTML=html;

  var add=$("#hwf-add");
  // Свои задачи в список ДЗ
  var ownCount=0;
  var updPickedCount=function(){
    var n=document.querySelectorAll("#cl-content .hw-bank-task input:checked").length;
    var cnt=$("#hwf-picked-count"); if(cnt) cnt.textContent=(n?("выбрано из банка: "+n+" · "):"")+"своих задач: "+ownCount;
  };
  var addOwn=function(){
    var inp=$("#hwf-own-inp"); if(!inp) return;
    var v=inp.value.trim(); if(!v){ toast("Введи текст задачи"); return; }
    var key="own"+(++ownCount);
    inp.value="";
    var box=$("#hwf-own-list"); if(box) box.insertAdjacentHTML("beforeend",
      '<div class="hw-own-item" data-ownkey="'+key+'"><span class="hw-own-txt">'+escapeHtml(v)+'</span><button type="button" class="btn btn-sm btn-ghost hw-own-rm" title="Убрать">✕</button></div>');
    var rm=box?box.lastElementChild:null;
    if(rm) rm.querySelector(".hw-own-rm").addEventListener("click",function(){ rm.remove(); updPickedCount(); });
    updPickedCount();
  };
  var ownAddBtn=$("#hwf-own-add"); if(ownAddBtn) ownAddBtn.addEventListener("click",addOwn);
  var ownInp=$("#hwf-own-inp");
  if(ownInp) ownInp.addEventListener("keydown",function(ev){ if(ev.key==="Enter"){ ev.preventDefault(); addOwn(); } });
  $$("#cl-content .hw-bank-task input").forEach(function(cb){ cb.addEventListener("change",updPickedCount); });
  // Файл для ДЗ
  var hwFileData=null;
  var fileInput=$("#hwf-file");
  if(fileInput) fileInput.addEventListener("change",function(ev){
    var f=fileInput.files&&fileInput.files[0]; if(!f) return;
    if(f.size>5*1024*1024){ toast("Файл больше 5 МБ"); fileInput.value=""; return; }
    var fr=new FileReader();
    fr.onload=function(){
      hwFileData={name:f.name, dataUrl:fr.result};
      var fn=$("#hwf-fname"); if(fn) fn.textContent="✓ "+f.name;
    };
    fr.readAsDataURL(f);
  });
  if(add) add.addEventListener("click",function(){
    var title=($("#hwf-title")?$("#hwf-title").value:"").trim();
    var text=($("#hwf-text")?$("#hwf-text").value:"").trim();
    if(!title){ toast("Введи заголовок задания"); return; }
    var tasks=[], ownTasks=[];
    $$("#cl-content .hw-bank-task input:checked").forEach(function(cb){ tasks.push(cb.value); });
    $$("#hwf-own-list .hw-own-item").forEach(function(it){ ownTasks.push(it.querySelector(".hw-own-txt").textContent); });
    if(!tasks.length && !ownTasks.length && !text){ toast("Добавь задачи из банка, свою задачу или пояснение"); return; }
    var due=$("#hwf-due")?$("#hwf-due").value:"";
    var hw={id:"hw"+Date.now().toString(36),
      className:cls.name,
      title:title, text:text, due:due||"",
      author:u.name||u.login||"",
      date:new Date().toISOString()};
    if(tasks.length) hw.tasks=tasks;
    if(ownTasks.length) hw.ownTasks=ownTasks;
    if(hwFileData) hw.file=hwFileData;
    var arr=getHomework(); arr.push(hw);
    saveHomework(arr);
    toast("Задание выдано классу «"+cls.name+"»");
    renderClassHomework(cls,u);
  });
  // Удаление заданий
  $$("#cl-content .hw-del").forEach(function(b){
    b.addEventListener("click",function(){
      var id=b.getAttribute("data-hwid");
      if(!confirm("Удалить задание?")) return;
      var hw=getHomework().filter(function(h){ return h.id!==id; });
      saveHomework(hw);
      toast("Задание удалено");
      renderClassHomework(cls,u);
    });
  });
}

/* ---------- Личная статистика ученика: РСОШ, ДЗ, выполнение курса ---------- */
function renderStudentStats(){
  var body=$("#mystats-body"); if(!body) return;
  var u=currentUser();
  if(!u || u.role!=="student"){ body.innerHTML='<div class="muted">Раздел доступен ученику после входа.</div>'; return; }
  var login=u.login, clsName=u.className||"";

  // ============ Блок 1: Олимпиады РСОШ ============
  var marks=getOlympMarks();
  var myMarks=clsName ? ((marks[clsName]||{})[login]||{}) : {};
  var solvedCount=0; OLYMPIADS_MATH.forEach(function(o,i){ if(myMarks[String(i)]) solvedCount++; });

  var html='<div class="panel"><div class="view-head-row"><div class="view-head"><h3>🏆 Олимпиады РСОШ</h3>'
    +'<p class="muted" style="font-size:12.5px">Твои отметки по олимпиадам из перечня РСОШ'+(clsName?(' · класс '+escapeHtml(clsName)):"")+'</p></div>'
    +'<div class="head-actions"><span class="mystat-pill">решено: <b>'+solvedCount+'</b> из '+OLYMPIADS_MATH.length+'</span></div></div>';

  // Легенда уровней
  html+='<div class="olimp-legend"><span class="olimp-lvl-chip clvl-i">Уровень I</span>'
    +'<span class="olimp-lvl-chip clvl-ii">Уровень II</span>'
    +'<span class="olimp-lvl-chip clvl-iii">Уровень III</span>'
    +'<span class="olimp-lvl-chip clvl-mp">МинПрос</span>'
    +'<span class="muted" style="font-size:12px">Выше уровень — больше льгот при поступлении; МинПрос — из перечня Минпросвещения</span></div>';

  // Группируем по уровням
  html+='<div class="olimp-scroll"><table class="olimp-table"><thead><tr><th class="ol-th-name">Олимпиада</th><th>Уровень</th><th>Статус</th></tr></thead><tbody>';
  OLYMPIADS_MATH.forEach(function(o,i){
    var lvlCls = olympChipClass(o);
    var on=!!myMarks[String(i)];
    html+='<tr><td class="ol-td-name">'+escapeHtml(o.name)+'</td>'
      +'<td style="text-align:center"><span class="olimp-lvl-chip '+olympChipClass(o)+'">'+olympChipLabel(o)+'</span></td>'
      +'<td style="text-align:center">'+(on?'<span class="mystat-ok">❤️ решено</span>':'<span class="mystat-no">🤍 не отмечено</span>')+'</td></tr>';
  });
  html+='</tbody></table></div></div>';

  // ============ Блок 2: Домашние задания ============
  var allHw=getHomework();
  var myHw=allHw.filter(function(h){
    if(h.className==="Все"||!h.className) return true;
    return h.className===clsName;
  }).slice().reverse();
  html+='<div class="panel"><h3>📚 Домашние задания'+(clsName?(' для класса '+escapeHtml(clsName)):"")+'</h3>';
  if(!myHw.length){
    html+='<div class="muted" style="font-size:13px;margin-top:6px">Заданий пока не выдавали.</div>';
  } else {
    html+='<div class="mystat-hw-count">выдано: <b>'+myHw.length+'</b></div>';
    myHw.forEach(function(hw){
      var dl=hw.due?(' · срок: <b>'+escapeHtml(hw.due)+'</b>'):"";
      html+='<div class="hw-item"><div class="hw-title">'+escapeHtml(hw.title)+'</div>'
        +'<div class="hw-meta">'+(hw.author?escapeHtml(hw.author):"")+dl+(hw.date?(' · '+escapeHtml(String(hw.date).slice(0,10))):"")+'</div>'
        +hwContentHtml(hw)+'</div>';
    });
  }
  html+='</div>';

  // ============ Блок 3: Выполнение курса ============
  var done=0, tot=OLYMP_MODULES.length;
  var progHtml="";
  OLYMP_MODULES.forEach(function(m){
    var prg=u?moduleMasteryPct(m.id):0;
    if(prg>=100) done++;
    progHtml+='<div class="mastery-row"><span class="m-icon">'+m.icon+'</span><span class="m-name">'+escapeHtml(m.short)+'</span>'
      +'<span class="m-bar"><i style="width:'+prg+'%"></i></span><span class="m-pct">'+prg+'%</span></div>';
  });
  var overallPct = tot?Math.round(done/tot*100):0;
  html+='<div class="panel"><div class="view-head-row"><div class="view-head"><h3>🎓 Выполнение курса</h3>'
    +'<p class="muted" style="font-size:12.5px">'+(u?"":"Войди, чтобы видеть прогресс.")+'</p></div>'
    +'<div class="head-actions"><span class="mystat-pill">пройдено блоков: <b>'+done+'</b> из '+tot+' · общий трек <b>'+overallPct+'%</b></span></div></div>';
  html+='<div class="mystat-course">'+progHtml+'</div></div>';

  body.innerHTML=html;
}

/* ---------- «Серверный» файл: экспорт/импорт базы под пароль админа ---------- */
// Шифр Виженера (простая защита паролем для локального прототипа).
function adminPass(){
  var u=getUsers()["Nasv1"];
  return (u&&u.pass)?u.pass:"16AKo1709=";
}
function vigenere(str, key, decode){
  var k=String(key||""); var out="";
  for(var i=0,j=0;i<str.length;i++){
    var c=str.charCodeAt(i);
    var kc = k.charCodeAt(j % k.length);
    var c2 = decode ? (c - kc + 256*16) % 256 : (c + kc) % 256;
    out += String.fromCharCode(c2);
    j++;
  }
  return out;
}
function exportServerDB(){
  var pass=prompt("Введите пароль администратора для загрузки/сохранения базы данных");
  if(pass===null) return;
  var u=getUsers();
  var admin=(u["Nasv1"]&&u["Nasv1"].pass)||"16AKo1709=";
  if(admin!==pass){ toast("Неверный пароль"); return; }
  // Собираем всех учеников в таблицу: ФИО, ГРУППА, ЛОГИН, ПАРОЛЬ
  var aoa=[["ФИО","ГРУППА","ЛОГИН","ПАРОЛЬ"]];
  for(var login in u){
    var usr=u[login];
    if(usr.role!=="student") continue;
    aoa.push([usr.name||"", usr.className||"", login, usr.pass||""]);
  }
  if(typeof window.__xlsxDownloadAoA!=="function"){ toast("Генератор Excel не загружен"); return; }
  window.__xlsxDownloadAoA(aoa, { fileName:"База_данных_учеников.xlsx", sheetName:"Ученики" });
  toast("База выгружена в Excel: ФИО, ГРУППА, ЛОГИН, ПАРОЛЬ");
}
function importServerDB(){
  var pass=prompt("Введите пароль администратора для загрузки базы данных из Excel");
  if(pass===null) return;
  var u=getUsers();
  var admin=(u["Nasv1"]&&u["Nasv1"].pass)||"16AKo1709=";
  if(admin!==pass){ toast("Неверный пароль"); return; }
  if(window.__serverDBFilePath){ window.__serverDBFileEl.click(); return; }
  var el=document.getElementById("srv-file");
  if(el) el.click();
}

/* ---------- Админ-панель ---------- */
function userOpts(users, role){
  var out="";
  for(var l in users){
    var u=users[l];
    if(u.role===role){ out+='<option value="'+escAttr(l)+'">'+escapeHtml(u.name||l)+'</option>'; }
  }
  return out;
}
function renderAdmin(){
  var body=$("#profile-body"); var u=currentUser();
  if(!u||u.role!=="admin"){ renderProfile(); return; }
  var classes=getClasses();
  var users=getUsers();
  var h=[];
  h.push('<div class="profile-card"><h3>🛠 Панель администратора</h3>'
    +'<div class="muted" style="margin-bottom:8px">Вы вошли как '+escapeHtml(u.name)+'</div>'
    +'<div class="form-actions"><button class="btn" id="admin-logout">Выйти</button></div></div>');

  // Блок: группы, ученики и преподаватели
  h.push('<div class="profile-card"><h3>🏫 Группы, ученики и преподаватели</h3>');
  if(!classes.length){ h.push('<div class="muted" style="font-size:13px;margin-bottom:10px">Групп пока нет.</div>'); }
  // форма создания группы с обязательным преподавателем
  h.push('<div class="admin-class-btns" style="background:#f7f8ff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:12px">'
    +'<b style="font-size:14px">Новая группа</b>'
    +'<div class="form-row" style="margin-top:8px"><label>Название группы</label><input id="ad-class-input" placeholder="Например: Группа 1"></div>'
    +'<div class="form-row"><label>Преподаватель группы (обязательно)</label>'
    +'<select id="ad-class-teacher"><option value="">Выбери преподавателя…</option>'
    +userOpts(users,'teacher')
    +'</select></div>'
    +'<p class="muted" style="font-size:12px;margin-bottom:8px">Если преподавателя нет в списке — сначала добавь его ниже в разделе «Регистрация преподавателей».</p>'
    +'<div class="form-actions"><button class="btn btn-primary" id="ad-class-add">+ Создать группу</button></div></div>');

  // Регистрация преподавателя
  h.push('<div class="admin-class" style="background:#fff7e6;border:1px solid #f4dfab"><div class="ac-head"><b>👨‍🏫 Добавить преподавателя</b></div>'
    +'<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">'
    +'<input class="ad-te-name" placeholder="ФИО преподавателя" style="flex:1;min-width:140px">'
    +'<input class="ad-te-login" placeholder="Логин" style="flex:1;min-width:100px">'
    +'<input class="ad-te-pass" type="password" placeholder="Пароль" style="flex:1;min-width:100px">'
    +'<button class="btn btn-sm btn-primary" id="ad-te-add">Добавить</button></div></div>');

  // Список преподавателей
  h.push('<div class="admin-class" style="border:1px solid #f4dfab"><div class="ac-head"><b>👥 Зарегистрированные преподаватели</b></div>');
  var teachers=[];
  for(var tl in users){ if(users[tl].role==="teacher") teachers.push(users[tl]); }
  if(!teachers.length){ h.push('<div class="muted" style="font-size:12px;margin:4px 0">Преподавателей пока нет.</div>'); }
  teachers.forEach(function(tch){
    var grp=tch.groupTeacher||"";
    h.push('<div class="ac-student"><span>'+escapeHtml(tch.name)+'</span>'
      +'<span class="muted" style="font-size:12px">логин: '+escapeHtml(tch.login)+(grp?' · группа: '+escapeHtml(grp):'')+'</span>'
      +'<button class="btn btn-sm btn-ghost" data-rmtea="'+escAttr(tch.login)+'">удалить</button></div>');
  });
  h.push('<div class="form-actions" style="margin-top:8px"><button class="btn" id="dl-teachers">⬇ Скачать базу преподавателей</button></div>');
  h.push('</div>');

  classes.forEach(function(cls){
    var teacher=cls.teacher?users[cls.teacher]:null;
    h.push('<div class="admin-class"><div class="ac-head"><b>'+escapeHtml(cls.name)+'</b><span class="muted">учеников: '+cls.students.length+'</span>'
      +'<button class="btn btn-sm btn-ghost" data-rmclass="'+escAttr(cls.name)+'">удалить группу</button></div>'
      +'<div class="ac-teacher">👨‍🏫 Преподаватель: <b>'+escapeHtml(teacher?teacher.name:('— назначь (логин: '+(cls.teacher||'?')+')'))+'</b></div>');
    if(!cls.students.length){ h.push('<div class="muted" style="font-size:12px;margin:4px 0">Учеников нет.</div>'); }
    cls.students.forEach(function(st){
      var su=users[st.login];
      h.push('<div class="ac-student"><span>'+escapeHtml(st.name)+'</span><span class="muted" style="font-size:12px">логин: '+escapeHtml(st.login)+'</span>'
        +'<button class="btn btn-sm btn-ghost" data-rmstu="'+escAttr(cls.name)+'" data-login="'+escAttr(st.login)+'">удалить</button></div>');
    });
    h.push('<div class="form-row" style="margin-top:8px"><label>Добавить ученика в «'+escapeHtml(cls.name)+'»</label>'
      +'<input class="ad-stu-name" placeholder="Имя ученика">'
      +'<div style="display:flex;gap:8px;margin-top:6px">'
      +'<input class="ad-stu-login" placeholder="Логин">'
      +'<input class="ad-stu-pass" type="password" placeholder="Пароль">'
      +'<button class="btn btn-sm btn-primary" data-addstu="'+escAttr(cls.name)+'">Добавить</button></div></div>');
    h.push('</div>');
  });
  h.push('</div>');

  // Блок: статистика групп
  h.push('<div class="profile-card"><h3>📊 Статистика групп</h3><div id="admin-stats"></div></div>');

  h.push('<div class="profile-card"><h3>🖥 Сервер (общая база данных)</h3>'
    +'<p class="muted" style="font-size:13px;margin-bottom:8px">Скачай все данные (ученики, группы, домашка, пароли, прогресс) в один файл, защищённый паролем администратора. Файл положи в «Каталог - Сервер». Позволяет переносить всё между устройствами.</p>'
    +'<div class="form-actions"><button class="btn" id="srv-export">⬇ Скачать базу данных</button>'
    +'<button class="btn" id="srv-import">⬆ Загрузить базу данных</button></div>'
    +'<input type="file" id="srv-file" accept=".json,.txt,.dat" hidden>'
    +'</div>');

  body.innerHTML=h.join("");
  renderAdminStats();
  bindAdminEvents();
}
function renderAdminStats(){
  var box=$("#admin-stats"); if(!box) return;
  var users=getUsers(); var classes=getClasses();
  if(!classes.length){ box.innerHTML='<div class="muted">Групп нет.</div>'; return; }
  var html="";
  classes.forEach(function(cls){
    // прогресс учеников группы
    html+='<div class="astat-class"><b>'+escapeHtml(cls.name)+'</b>';
    if(!cls.students.length){ html+=' <span class="muted">нет учеников</span></div>'; return; }
    html+='<table class="astat-table"><thead><tr><th>Ученик</th><th>XP</th><th>Уровень</th><th>Блоков</th><th>Задач верно</th></tr></thead><tbody>';
    cls.students.forEach(function(st){
      var p=loadProgress(st.login);
      html+='<tr><td>'+escapeHtml(st.name)+'</td><td>'+p.xp+'</td><td>'+trackLevelFor(p)+'</td><td>'+moduleCountFor(p)+'/'+OLYMP_MODULES.length+'</td><td>'+p.correctTotal+'</td></tr>';
    });
    html+='</tbody></table></div>';
  });
  box.innerHTML=html;
}
function trackLevelFor(p){ if(!p) return "—"; var lv=1,n="Новичок"; for(var i=OLYMP_TRACK_LEVELS.length-1;i>=0;i--){ if(p.xp>=OLYMP_TRACK_LEVELS[i].xp){lv=OLYMP_TRACK_LEVELS[i].level;n=OLYMP_TRACK_LEVELS[i].name;break;} } return lv+" "+n; }
function moduleCountFor(p){ if(!p) return 0; var c=0; OLYMP_MODULES.forEach(function(m){ var t=p.solvedTasks?p.solvedTasks:{}; var ok=0,tot=0; (typeof OLYMP_TASKS!=="undefined"?OLYMP_TASKS:[]).concat(p.customBank||[]).forEach(function(t2){ if(t2.module===m.id){ tot++; if(t[t2.id]&&t[t2.id].status==="ok") ok++; } }); if(tot&&ok===tot) c++; }); return c; }
function bindAdminEvents(){
  $("#ad-class-add").addEventListener("click",function(){
    var inp=$("#ad-class-input"); var name=inp.value.trim(); if(!name){ toast("Введи название группы"); return; }
    var tel=$("#ad-class-teacher"); var teacher=tel?tel.value:"";
    var users=getUsers();
    if(!teacher || !users[teacher] || users[teacher].role!=="teacher"){ toast("Выбери преподавателя группы"); return; }
    var classes=getClasses(); if(classes.some(function(c){return c.name===name;})){ toast("Группа уже есть"); return; }
    classes.push({name:name,teacher:teacher,students:[]});
    // отметим преподавателю его группу
    if(users[teacher].groupTeacher){} else { users[teacher].groupTeacher=name; }
    saveClasses(classes); saveUsers(users); renderAdmin(); toast("Группа «"+name+"» создана (преподаватель назначен)");
  });
  // Добавление преподавателя
  $("#ad-te-add").addEventListener("click",function(){
    var name=($(".ad-te-name")&&$(".ad-te-name").value?$(".ad-te-name").value:"").trim();
    var login=($(".ad-te-login")&&$(".ad-te-login").value?$(".ad-te-login").value:"").trim();
    var pass=($(".ad-te-pass")&&$(".ad-te-pass").value?$(".ad-te-pass").value:"");
    if(!name||!login||!pass){ toast("Заполни ФИО, логин, пароль преподавателя"); return; }
    var users=getUsers();
    if(users[login]){ toast("Логин уже занят"); return; }
    users[login]={login:login,pass:pass,name:name,role:"teacher",className:"",groupTeacher:""};
    saveUsers(users); renderAdmin(); toast("Преподаватель "+name+" добавлен");
  });
  // Делегирование на document: обработчики не теряются при перерисовке
  if(!window.__adminDelegate){
    window.__adminDelegate=true;
    document.addEventListener("click", adminDelegateClick);
  }
  function adminDelegateClick(ev){
    var t=ev.target;
    var addBtn=t.closest?t.closest("[data-addstu]"):null;
    var rmBtn=t.closest?t.closest("[data-rmstu]"):null;
    var rmCls=t.closest?t.closest("[data-rmclass]"):null;
    var rmTea=t.closest?t.closest("[data-rmtea]"):null;
    if(addBtn){
      try{
        var clsName=addBtn.getAttribute("data-addstu");
        var clsEl=addBtn.closest(".admin-class");
        if(!clsEl){ toast("Не найден блок группы"); return; }
        var name=(clsEl.querySelector(".ad-stu-name")||{}).value;(name=name?name.trim():"");
        var login=(clsEl.querySelector(".ad-stu-login")||{}).value;login=login?login.trim():"";
        var pass=(clsEl.querySelector(".ad-stu-pass")||{}).value;pass=pass||"";
        if(!name||!login||!pass){ toast("Заполни имя, логин, пароль"); return; }
        var users=getUsers();
        if(users[login]){ toast("Логин уже занят"); return; }
        users[login]={login:login,pass:pass,name:name,role:"student",className:clsName};
        saveUsers(users);
        var classes=getClasses();
        var cls=classes.filter(function(c){return c.name===clsName;})[0];
        if(!cls){ classes.push({name:clsName,students:[{login:login,name:name}]}); }
        else if(!(cls.students||[]).some(function(s){return s.login===login;})){ cls.students.push({login:login,name:name}); }
        saveClasses(classes);
        renderAdmin(); toast("Ученик "+name+" добавлен (логин: "+login+")");
      }catch(e){ toast("Ошибка добавления: "+e.message); }
    }
    else if(rmBtn){
      var clsName=rmBtn.getAttribute("data-rmstu"); var login=rmBtn.getAttribute("data-login");
      if(!confirm("Удалить ученика из группы?")) return;
      var users=getUsers(); delete users[login]; saveUsers(users);
      var classes=getClasses(); var cls=classes.filter(function(c){return c.name===clsName;})[0];
      if(cls && cls.students){ cls.students=cls.students.filter(function(s){return s.login!==login;}); }
      saveClasses(classes); renderAdmin(); toast("Ученик удалён");
    }
    else if(rmCls){
      var clsName=rmCls.getAttribute("data-rmclass");
      if(!confirm("Удалить группу «"+clsName+"» вместе с учениками и преподавателем?")) return;
      var classes=getClasses(); var cls=classes.filter(function(c){return c.name===clsName;})[0];
      if(cls){
        var users=getUsers();
        (cls.students||[]).forEach(function(s){ delete users[s.login]; });
        // сброс группы преподавателя
        if(cls.teacher && users[cls.teacher]){ users[cls.teacher].groupTeacher=""; }
        saveUsers(users);
        classes=classes.filter(function(c){return c.name!==clsName;});
        saveClasses(classes);
        users=getUsers();
        for(var l in users){ if(users[l].className===clsName) users[l].className=""; }
        saveUsers(users);
      }
      renderAdmin(); toast("Группа «"+clsName+"» удалена");
    }
    else if(rmTea){
      var tlogin=rmTea.getAttribute("data-rmtea");
      if(!confirm("Удалить преподавателя «"+tlogin+"»?")) return;
      var users=getUsers(); delete users[tlogin]; saveUsers(users);
      // убрать привязку преподавателя из групп
      var classes=getClasses();
      classes.forEach(function(c){ if(c.teacher===tlogin) c.teacher=""; });
      saveClasses(classes);
      renderAdmin(); toast("Преподаватель удалён");
    }
  };
  // Скачивание базы преподавателей в Excel
  var dlT=$("#dl-teachers");
  if(dlT) dlT.addEventListener("click",function(){
    var users=getUsers();
    var aoa=[["ФИО","ЛОГИН","ПАРОЛЬ","ГРУППА"]];
    for(var tl in users){ if(users[tl].role==="teacher"){ aoa.push([users[tl].name||"", tl, users[tl].pass||"", users[tl].groupTeacher||""]); } }
    if(typeof window.__xlsxDownloadAoA!=="function"){ toast("Генератор Excel не загружен"); return; }
    window.__xlsxDownloadAoA(aoa, { fileName:"База_преподавателей.xlsx", sheetName:"Преподаватели" });
    toast("База преподавателей выгружена в Excel");
  });
  $("#srv-export").addEventListener("click",exportServerDB);
  $("#srv-import").addEventListener("click",function(){ $("#srv-file").click(); });
  $("#srv-file").addEventListener("change",function(e){
    var f=e.target.files&&e.target.files[0]; if(!f) return;
    if(typeof window.__xlsxReadFileToAoa!=="function"){ toast("Читатель Excel не загружен"); return; }
    window.__xlsxReadFileToAoa(f, function(aoa){ applyServerAoa(aoa); }, function(){ toast("Не удалось прочитать Excel-файл"); });
    this.value="";
  });
  $("#admin-logout").addEventListener("click",doLogout);
}
/* Применение таблицы (ФИО,ГРУППА,ЛОГИН,ПАРОЛЬ) к базе: создаёт учеников и группы */
function applyServerAoa(aoa){
  if(!aoa||aoa.length<2){ toast("Пустой файл"); return; }
  var users=getUsers();
  var classes=getClasses();
  var groupMap={}; classes.forEach(function(c){ groupMap[c.name]=c; });
  var added=0;
  for(var i=1;i<aoa.length;i++){
    var r=aoa[i];
    var name=String(r[0]||"").trim();
    var grp=String(r[1]||"").trim();
    var login=String(r[2]||"").trim();
    var pass=String(r[3]||"").trim();
    if(!login||!pass) continue;
    if(!users[login]){
      users[login]={login:login,pass:pass,name:(name||login),role:"student",className:grp||""};
      added++;
    } else {
      // обновляем существующего
      users[login].name=name||users[login].name;
      if(users[login].pass!==pass) users[login].pass=pass;
      if(grp) users[login].className=grp;
      added++;
    }
    // добавить в группу
    if(grp){
      if(!groupMap[grp]){ groupMap[grp]={name:grp,students:[]}; classes.push(groupMap[grp]); }
      if(!(groupMap[grp].students||[]).some(function(s){return s.login===login;})){
        groupMap[grp].students.push({login:login,name:name||login});
      }
    }
  }
  if(added===0){ toast("Не найдено строк с логином и паролем"); return; }
  saveUsers(users); saveClasses(classes);
  toast("Импортировано учеников: "+added);
  renderProfile(); renderAdmin(); renderDashboard();
}

/* ---------- Утилиты ---------- */
function sbUser(){ /* футер статичный в index.html */ }
function renderAllHome(){ renderDashboard(); }
function escapeHtml(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function downloadText(name,content){ var b=new Blob([content],{type:"text/plain;charset=utf-8"}); var a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },300); }

/* ---------- Back ---------- */
$("#mod-back").addEventListener("click",function(){ showView("modules"); });

/* ---------- Онбординг ---------- */
var OB_KEY="math10_onboard_done";
function showOnboarding(){ $("#onboard-modal").hidden=false; document.body.style.overflow="hidden"; }
function closeOnboarding(){ $("#onboard-modal").hidden=true; document.body.style.overflow=""; }
$("#ob-close").addEventListener("click",closeOnboarding);
$("#ob-skip").addEventListener("click",function(){ try{ localStorage.setItem(OB_KEY,"1"); }catch(e){} closeOnboarding(); });
$("#onboard-modal").addEventListener("click",function(e){ if(e.target===this)closeOnboarding(); });
var helpBtn=$("#nav-help-question");
if(helpBtn) helpBtn.addEventListener("click",showOnboarding);

/* ---------- Init ---------- */
// загружаем сессию
currentLogin=getSession();
if(currentLogin){ P=loadProgress(currentLogin); } else { P=loadProgress(""); }
// показываем кабинет гостю по умолчанию
var u=currentUser();
if(!u){ showView("profile"); hideGuestNav && hideGuestNav(); }
else { renderProfile(); }
refreshNav();
sbUser();
renderDashboard();
renderModuleGrid();
fillBankModuleFilter();
renderBank();
renderAchievements();
renderProfile();
var firstRun=false;
try{ firstRun=!localStorage.getItem(OB_KEY); }catch(e){ firstRun=true; }
if(firstRun && !u){ setTimeout(showOnboarding,350); }

})();