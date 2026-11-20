// Математика: Алгебра 10 класс — метаданные олимпиадного трека
// Модули (3), уровень трека, навыки, достижения

// Модуль: { id, no, name, short, color, icon, desc, req (id предыдущего модуля или null),
//           unlocks: массив уровней, доступных в модуле }
var OLYMP_MODULES = [
  { id:"step",  no:"1", name:"Степенная функция", short:"Степень", color:"#2f6fed", icon:"📈",
    req:null,
    desc:"Степенная функция, корень n-й степени, степень с рациональным показателем, иррациональные уравнения и неравенства." },
  { id:"trig",  no:"2", name:"Тригонометрия", short:"Триго-метрия", color:"#1aa2b8", icon:"📐",
    req:"step",
    desc:"Окружность и графики, формулы тригонометрии, обратные функции, простейшие и сложные уравнения, отбор корней, неравенства." },
  { id:"deriv", no:"3", name:"Производная и её применение", short:"Производная", color:"#2f9e63", icon:"🚀",
    req:"trig",
    desc:"Производная, правила дифференцирования, касательная, исследование функций, экстремумы, построение графиков." }
];

// Уровни внутри модуля
var OLYMP_LEVELS = [
  { id:"base",   name:"База",   color:"#2f9e63", icon:"🌱", desc:"школьный уровень + минимум приёмов" },
  { id:"active", name:"Актив",  color:"#2f6fed", icon:"⚡", desc:"типовые олимпиадные задачи (школьный/муниципальный этап)" },
  { id:"olimp",  name:"Олимп",  color:"#e8503a", icon:"🔥", desc:"региональный уровень и нестандартные методы" }
];

// Типы задач
var OLYMP_TYPES = [
  { id:"calc",      name:"Расчётная задача",  icon:"🧮" },
  { id:"test",      name:"Тест",              icon:"✅" },
  { id:"expert",    name:"Экспертная",        icon:"💬" },
  { id:"experiment",name:"Эксперимент",       icon:"🔬" }
];

// Пять колец навыков
var OLYMP_SKILLS = [
  { id:"calc",   name:"Вычисления",      color:"#4a4de0", max:100, icon:"🧮" },
  { id:"solve",  name:"Скорость решения", color:"#2f9e63", max:100, icon:"⏱️" },
  { id:"exp",    name:"Оформление",      color:"#2f6fed", max:100, icon:"✍️" },
  { id:"analysis", name:"Анализ ошибок",  color:"#f4a825", max:100, icon:"🎯" },
  { id:"experiment", name:"Доказательства", color:"#e8503a", max:100, icon:"🧠" }
];

// Уровни трека (по накопленному XP)
var OLYMP_TRACK_LEVELS = [
  { level:1, xp:0,    name:"Новичок" },
  { level:2, xp:120,  name:"Подмастерье" },
  { level:3, xp:280,  name:"Исследователь" },
  { level:4, xp:520,  name:"Логик" },
  { level:5, xp:850,  name:"Мастер задач" },
  { level:6, xp:1250, name:"Аналитик" },
  { level:7, xp:1750, name:"Знаток" },
  { level:8, xp:2400, name:"Эксперт" },
  { level:9, xp:3200, name:"Олимпиец" },
  { level:10,xp:4200, name:"Гаусс" }
];

// Очки опыта за действия
var OLYMP_XP = {
  base:  10,     // решена задача уровня База
  active:20,     // решена задача уровня Актив
  olimp: 35,     // решена задача уровня Олимп
  fixError:15,   // закрыта работа над ошибками
  module:60      // зачтён модуль (мастерство 100%)
};

// Достижения: { id, name, icon, desc, check(state, stats) }
// check должен вернуть true, когда достижение открыто
var OLYMP_ACHIEVEMENTS = [
  { id:"first",  name:"Первый шаг",  icon:"🌱", xp:20,  desc:"Реши первую задачу.", check:function(s){ return s.solvedTotal>=1; } },
  { id:"ten",    name:"Десяточка",   icon:"🔟", xp:50,  desc:"Реши 10 задач.", check:function(s){ return s.solvedTotal>=10; } },
  { id:"fifty",  name:"Сотка задач", icon:"📚", xp:150, desc:"Реши 50 задач.", check:function(s){ return s.solvedTotal>=50; } },
  { id:"hundred",name:"Тонна решений",icon:"🏆", xp:300,desc:"Реши 100 задач.", check:function(s){ return s.solvedTotal>=100; } },
  { id:"streak3",name:"Серия: 3",    icon:"🔥", xp:40,  desc:"Реши 3 задачи подряд верно.", check:function(s){ return s.bestStreak>=3; } },
  { id:"streak5",name:"Серия: 5",    icon:"⚡", xp:70,  desc:"Реши 5 задач подряд верно.", check:function(s){ return s.bestStreak>=5; } },
  { id:"streak10",name:"Серия: 10",  icon:"🌋", xp:150,desc:"Реши 10 задач подряд верно.", check:function(s){ return s.bestStreak>=10; } },
  { id:"fixer",  name:"Мастер ошибок",icon:"🛠️", xp:60, desc:"Закрой 5 работ над ошибками.", check:function(s){ return s.errorsClosed>=5; } },
  { id:"nomistake",name:"Идеально с первого раза", icon:"🎯", xp:90, desc:"Реши задачу без единой ошибки (не попадай в «неверно»).", check:function(s){ return s.correctTotal>=5 && s.solvedTotal<=s.correctTotal; } },
  { id:"clean",  name:"Чистый блок",icon:"🧹", xp:80, desc:"Закрой первый блок на 100%.", check:function(s){ return s.modulesCompleted>=1; } },
  { id:"twoblocks",name:"Два из четырёх",icon:"🔶", xp:120, desc:"Закрой 2 блока.", check:function(s){ return s.modulesCompleted>=2; } },
  { id:"half",   name:"Половина пути",icon:"🌗", xp:160, desc:"Закрой 3 блока.", check:function(s){ return s.modulesCompleted>=3; } },
  { id:"allmodules",name:"Четыре стихии",icon:"🏛", xp:250, desc:"Закрой все 4 блока на 100%.", check:function(s){ return s.modulesCompleted>=4; } },
  { id:"skilltwenty",name:"Кольцо просыпается",icon:"🔮", xp:40, desc:"Прокачай любое кольцо навыка до 20%.", check:function(s){ return Math.max(s.skillCalc||0,s.skillSolve||0,s.skillExp||0,s.skillAnal||0)>=20; } },
  { id:"skillfifty",name:"Кольцо в работе",icon:"💍", xp:120, desc:"Прокачай любое кольцо навыка до 50%.", check:function(s){ return Math.max(s.skillCalc||0,s.skillSolve||0,s.skillExp||0,s.skillAnal||0)>=50; } },
  { id:"allexp", name:"Аналитик",     icon:"🧠", xp:250, desc:"Дочитай кольцо «Вычисления» до конца.", check:function(s){ return s.skillCalc>=100; } },
  { id:"allskills",name:"Мастер всех навыков",icon:"🌟", xp:400, desc:"Прокачай все кольца навыков до 100%.", check:function(s){ return (s.skillCalc||0)>=100&&(s.skillSolve||0)>=100&&(s.skillExp||0)>=100&&(s.skillAnal||0)>=100; } },
  { id:"boost",  name:"Быстрый старт",icon:"🚀", xp:90, desc:"Прыгни через уровень и открой блок раньше.", check:function(s){ return s.didBoost; } },
  { id:"firstbank",name:"Банкир", icon:"🏦", xp:40, desc:"Реши 10 задач из банка задач.", check:function(s){ return s.solvedTotal>=10; } },
  { id:"olympiadfirst",name:"Первая олимпиада",icon:"🥇", xp:100, desc:"Участвуй в олимпиаде.", check:function(s){ return s.olympiads>=1; } },
  { id:"olympiadperfect",name:"Олимпийский идеал",icon:"🥇", xp:200, desc:"Выполни олимпиаду без ошибок.", check:function(s){ return s.perfectOlymp; } },
  // --- Новые достижения ---
  { id:"n25",    name:"Четверть пути",icon:"📗", xp:60, desc:"Реши 25 задач.", check:function(s){ return s.solvedTotal>=25; } },
  { id:"n75",    name:"Три четверти",icon:"📘", xp:220, desc:"Реши 75 задач.", check:function(s){ return s.solvedTotal>=75; } },
  { id:"n150",   name:"Вторая сотня",icon:"📚", xp:350, desc:"Реши 150 задач.", check:function(s){ return s.solvedTotal>=150; } },
  { id:"n250",   name:"Легенда банка", icon:"🏅", xp:500, desc:"Реши 250 задач.", check:function(s){ return s.solvedTotal>=250; } },
  { id:"streak2",name:"Разогрев",icon:"🔥", xp:15, desc:"Реши 2 задачи подряд верно.", check:function(s){ return s.bestStreak>=2; } },
  { id:"streak7",name:"Семь раз подряд", icon:"⚡", xp:100, desc:"Реши 7 задач подряд верно.", check:function(s){ return s.bestStreak>=7; } },
  { id:"streak15",name:"Железная серия",icon:"🌋", xp:200, desc:"Реши 15 задач подряд верно.", check:function(s){ return s.bestStreak>=15; } },
  { id:"streak25",name:"Несокрушимый",icon:"🔥", xp:320, desc:"Реши 25 задач подряд верно.", check:function(s){ return s.bestStreak>=25; } },
  { id:"fixer3", name:"Работа над ошибками", icon:"🛠️", xp:30, desc:"Закрой 3 работы над ошибками.", check:function(s){ return s.errorsClosed>=3; } },
  { id:"fixer10",name:"Исправлённый десяток",icon:"🛠️", xp:120, desc:"Закрой 10 работ над ошибками.", check:function(s){ return s.errorsClosed>=10; } },
  { id:"skill40",name:"Кольцо набирает силу", icon:"💫", xp:80, desc:"Прокачай любое кольцо навыка до 40%.", check:function(s){ return Math.max(s.skillCalc||0,s.skillSolve||0,s.skillExp||0,s.skillAnal||0)>=40; } },
  { id:"skill75",name:"Кольцо почти полно",icon:"💎", xp:200, desc:"Прокачай любое кольцо навыка до 75%.", check:function(s){ return Math.max(s.skillCalc||0,s.skillSolve||0,s.skillExp||0,s.skillAnal||0)>=75; } },
  { id:"experiment",name:"Экспериментатор",icon:"🧪", xp:100, desc:"Прокачай кольцо «Эксперимент» до 30%.", check:function(s){ return (s.skillExp2||0)>=30; } },
  { id:"firstbank1",name:"Начало пути в банке",icon:"🏦", xp:20, desc:"Реши 5 задач из банка.", check:function(s){ return s.solvedTotal>=5; } },
  { id:"allmult", name:"Сапфир стихий", icon:"🔷", xp:300, desc:"Закрой 4 блока идеально (100%) без ошибок.", check:function(s){ return s.modulesCompleted>=4 && s.solvedTotal<=s.correctTotal; } }
];

// Цвета уровней для бейджей
function olympLvlColor(id){
  var l=OLYMP_LEVELS.filter(function(x){return x.id===id;})[0];
  return l?l.color:"#6b7394";
}
function olympLvlName(id){
  var l=OLYMP_LEVELS.filter(function(x){return x.id===id;})[0];
  return l?l.name:id;
}
function olympModuleMeta(id){
  var m=OLYMP_MODULES.filter(function(x){return x.id===id;})[0];
  return m||{id:id,name:id,short:id,color:"#6b7394",icon:"📘"};
}