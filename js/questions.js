// 20 вопросов для Елены Феликсовны. answer — индекс правильного варианта.
window.QUESTIONS = [
  { tag: "HTML", q: "Какой тег делает самый крупный заголовок?",
    options: ["<h6>", "<h1>", "<head>", "<title>"], answer: 1 },
  { tag: "HTML", q: "Как правильно сделать ссылку?",
    options: ['<link src="…">', '<a src="…">', '<a href="…">', '<url>…</url>'], answer: 2 },
  { tag: "HTML", q: "Зачем картинке атрибут alt?",
    options: ["Чтобы задать ширину", "Текст вместо картинки, если она не загрузилась", "Чтобы картинка анимировалась", "Чтобы её нельзя было скачать"], answer: 1 },
  { tag: "HTML", q: "Какой тег создаёт нумерованный список?",
    options: ["<ul>", "<li>", "<list>", "<ol>"], answer: 3 },
  { tag: "HTML", q: "Где обычно подключают файл стилей?",
    options: ['В <head> через <link rel="stylesheet">', "В <footer> через <style src>", "В <title>", "В самом конце <body> через <css>"], answer: 0 },

  { tag: "CSS", q: "Как сделать текст жирным?",
    options: ["text-style: bold", "font-weight: bold", "font: heavy", "text-weight: 700"], answer: 1 },
  { tag: "CSS", q: "Чем padding отличается от margin?",
    options: ["Ничем, это синонимы", "padding снаружи, margin внутри", "padding внутри элемента, margin снаружи", "padding бывает только у текста"], answer: 2 },
  { tag: "CSS", q: "Что делает display: flex?",
    options: ["Прячет элемент", "Выстраивает дочерние элементы в ряд или колонку", "Включает анимацию", "Делает элемент круглым"], answer: 1 },
  { tag: "CSS", q: 'Какой селектор выберет элемент с id="menu"?',
    options: [".menu", "menu", "#menu", "*menu"], answer: 2 },
  { tag: "CSS", q: "Какого цвета будет текст с color: #ff0000?",
    options: ["Красного", "Зелёного", "Синего", "Чёрного"], answer: 0 },

  { tag: "JavaScript", q: 'Что выведет console.log("2" + 2)?',
    options: ["4", '"22"', "NaN", "Ошибку"], answer: 1 },
  { tag: "JavaScript", q: "Чем const отличается от let?",
    options: ["const нельзя переприсвоить", "const работает быстрее", "let только для чисел", "Ничем"], answer: 0 },
  { tag: "JavaScript", q: "Что вернёт typeof null?",
    options: ['"null"', '"undefined"', '"object"', '"number"'], answer: 2 },
  { tag: "JavaScript", q: 'Как найти элемент с id="title"?',
    options: ['document.findId("title")', 'document.getElementById("title")', 'window.id("title")', 'getElement("#title")'], answer: 1 },
  { tag: "JavaScript", q: "Чему равно [1, 2, 3].length?",
    options: ["2", "3", "4", "undefined"], answer: 1 },
  { tag: "JavaScript", q: "Что выведет 0.1 + 0.2 === 0.3?",
    options: ["true", "false", "undefined", "Ошибку"], answer: 1 },

  { tag: "Из жизни группы", q: "Студент говорит: «А у меня дома всё работало». Что это значит?",
    options: ["Флешка осталась дома", "Сайт работал только на localhost", "Дома компьютер умнее", "Всё вышеперечисленное"], answer: 3 },
  { tag: "Из жизни группы", q: "Каким тегом отметить студента, который не сделал домашку?",
    options: ["<absent>", "<hidden>", "<sick>", "<!-- его закомментировали -->"], answer: 3 },
  { tag: "Из жизни группы", q: "Сколько раз нужно сказать «тише», чтобы в группе стало тихо?",
    options: ["Один", "Три", "Десять", "Такого числа не существует"], answer: 3 },
  { tag: "Из жизни группы", q: "Какой язык в веб-разработке самый понятный?",
    options: ["HTML", "CSS", "JavaScript", "Тот, на котором объясняет Елена Феликсовна"], answer: 3 }
];

window.WRONG_REPLIES = [
  "Садитесь… хотя нет, стойте. Попробуйте ещё раз!",
  "С последней парты подсказывают: подумайте ещё.",
  "Почти! Но в журнал пока не ставим.",
  "Интересная версия. Но нет.",
  "Кто подсказывает? Ответ другой!",
  "Даже мы на этом не попадались. Ещё попытка!"
];
