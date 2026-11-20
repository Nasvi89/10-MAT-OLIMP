/* Слой базы данных курса МАТЕМАТИКИ: синхронизация localStorage ↔ Supabase.
   Грузится ДО app.js. При старте выгружает все общие данные из Supabase в localStorage,
   чтобы app.js (синхронный) видел актуальную базу. Все saveX-функции в app.js дублируют
   записи в облако асинхронно через window.DB.push.

   КЛЮЧЕВАЯ ОСОБЕННОСТЬ: физика и математика используют ОДНУ таблицу kv, но РАЗНЫЕ
   ключи: физика пишет в olymp8_*, математика в math10_*. Поэтому данные курсов
   полностью разделены — ни один курс не видит данных другого.

   Таблицы Supabase: kv(key text primary key, value jsonb).
   Ключи математики: math10_users, math10_classes, math10_homework, math10_olympiads,
   math10_content, math10_prog_<login> (ключи в облаке хранятся БЕЗ префикса math10_,
   т.е. users, classes, ... — в одной таблице с физикой они слились бы; поэтому в облаке
   используются ключи с префиксом: users, classes, ... уже заняты физикой → добавляем math10_).
*/
(function(){
if(window.__DB_LOADED) return; window.__DB_LOADED=true;

var url = (window.DB_CONFIG&&DB_CONFIG.url)||"";
var key = (window.DB_CONFIG&&DB_CONFIG.publishableKey)||"";

// Ключи курса математики в localStorage (все с префиксом math10_)
var LS_USERS="math10_users", LS_CLASSES="math10_classes", LS_HOMEWORK="math10_homework",
    LS_OLYM="math10_olympiads", LS_CONTENT="math10_content";

// Хранимые в облаке ключи для этого курса (добавляем префикс math10_, чтобы не пересекаться с физикой)
function dbKeyForLocal(lk){
  if(lk===LS_USERS) return "math10_users";
  if(lk===LS_CLASSES) return "math10_classes";
  if(lk===LS_HOMEWORK) return "math10_homework";
  if(lk===LS_CONTENT) return "math10_content";
  if(lk===LS_OLYM) return "math10_olympiads";
  if(lk.indexOf("math10_prog_")===0) return "math10_prog_"+lk.replace("math10_prog_","");
  return "math10_"+lk;
}
function localKeyForDb(dbKey){
  if(dbKey==="math10_olympiads") return LS_OLYM;
  if(dbKey==="math10_users") return LS_USERS;
  if(dbKey==="math10_classes") return LS_CLASSES;
  if(dbKey==="math10_homework") return LS_HOMEWORK;
  if(dbKey==="math10_content") return LS_CONTENT;
  if(dbKey.indexOf("math10_prog_")===0) return "math10_prog_"+dbKey.replace("math10_prog_","");
  return LS_USERS;
}

function makeHeaders(prefer){
  var h = {
    "apikey": key,
    "Authorization": "Bearer "+key,
    "Content-Type": "application/json"
  };
  if(prefer) h["Prefer"] = prefer;
  return h;
}

window.DB = {
  ready: false,
  err: null,
  __appPrefix:"math10_",

  // Синхронная выгрузка всей базы этого курса из Supabase в localStorage
  hydrateSync: function(){
    try{
      if(!url||!key){ window.DB.err="Нет конфигурации БД (db-config.js)"; return; }
      var rows = this.fetchAllSync();
      if(!rows || !rows.length) return;
      rows.forEach(function(r){
        if(!r || !r.key) return;
        // берём ТОЛЬКО ключи этого курса (префикс math10_)
        if(String(r.key).indexOf("math10_")!==0) return;
        var val = (typeof r.value==="object" && r.value!==null) ? r.value : {};
        try{ localStorage.setItem(localKeyForDb(r.key), JSON.stringify(val)); }catch(e){}
      });
      this.ready = true;
    }catch(e){ window.DB.err = String(e&&e.message||e); }
  },

  fetchAllSync: function(){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url+"/rest/v1/kv?select=key,value", false);
    var h={"apikey":key,"Authorization":"Bearer "+key,"Accept":"application/json","Content-Type":"application/json"};
    for(var k in h) xhr.setRequestHeader(k,h[k]);
    xhr.send(null);
    if(xhr.status>=200 && xhr.status<300){ return JSON.parse(xhr.responseText||"[]"); }
    throw new Error("HTTP "+xhr.status+" "+xhr.statusText);
  },

  // Асинхронная запись значения по локальному ключу (key = localStorage key, например math10_users)
  push: function(lk, value){
    if(!url||!key) return Promise.resolve(false);
    var dbKey = dbKeyForLocal(lk);
    return fetch(url+"/rest/v1/kv?on_conflict=key", {
      method:"POST",
      headers: makeHeaders("resolution=merge-duplicates"),
      body: JSON.stringify([{ key: dbKey, value: value }])
    }).then(function(r){ return r.status>=200&&r.status<300; }).catch(function(){ return false; });
  },

  // Сброс всей базы этого курса в Supabase из текущего localStorage (первый запуск / восстановление)
  pushAll: function(){
    var items=[];
    var map={}; map[LS_USERS]="math10_users"; map[LS_CLASSES]="math10_classes";
    map[LS_HOMEWORK]="math10_homework"; map[LS_CONTENT]="math10_content"; map[LS_OLYM]="math10_olympiads";
    for(var lk in map){
      try{ items.push({key:map[lk], value:JSON.parse(localStorage.getItem(lk)||"null")||{}}); }catch(e){}
    }
    // прогресс: все ключи math10_prog_*
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(k && k.indexOf("math10_prog_")===0){ items.push({key:"math10_prog_"+k.replace("math10_prog_",""), value:JSON.parse(localStorage.getItem(k))||{}}); }
      }
    }catch(e){}
    if(!url||!key) return Promise.resolve(false);
    return fetch(url+"/rest/v1/kv", {
      method:"POST",
      headers: makeHeaders("resolution=merge-duplicates"),
      body: JSON.stringify(items)
    }).then(function(r){ return r.status>=200&&r.status<300; }).catch(function(){ return false; });
  }
};

// При старте: выгружаем из облака в localStorage ДО того, как app.js прочитает данные.
window.DB.hydrateSync();

// Гарантия администратора: при первом запуске (когда облако пусто) заложим админа Nasv1.
(function(){
  try{
    var adm = {login:"Nasv1", pass:"16AKo1709=", name:"Администратор", role:"admin", className:""};
    var usersRaw = localStorage.getItem(LS_USERS);
    var users = null;
    try{ users = usersRaw ? JSON.parse(usersRaw) : {}; }catch(e){ users = {}; }
    if(!users) users = {};
    if(!users["Nasv1"]){
      users["Nasv1"] = adm;
      localStorage.setItem(LS_USERS, JSON.stringify(users));
      if(window.DB&&window.DB.push) window.DB.push(LS_USERS, users);
    }
  }catch(e){}
})();
})();