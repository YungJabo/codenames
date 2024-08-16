import fs from "fs";

const allWords = JSON.parse(fs.readFileSync("words.json", "utf-8"));

function assignColors(words, commonGreenIndices) {
  // Создаем массив цветов с исходными значениями серого
  const colors = Array(25).fill("grey");

  // Назначаем 3 общих зеленых слова

  // Задаем начальные значения для оставшихся зеленых и черных слов
  let remainingGreenCount = 6; // Всего 9 - 3 общих = 6 уникальных зеленых
  let blackCount = 3; // 3 черных слова

  // Проходим по всем словам и назначаем оставшиеся зеленые и черные цвета
  for (let i = 0; i < colors.length; i++) {
    // Пропускаем уже назначенные общие зеленые слова
    if (colors[i] === "grey") {
      if (remainingGreenCount > 0) {
        colors[i] = "green";
        remainingGreenCount--;
      } else if (blackCount > 0) {
        colors[i] = "black";
        blackCount--;
      }
    }
  }

  // Перемешиваем цвета случайным образом, за исключением общих индексов
  let nonCommonIndices = [];
  for (let i = 0; i < colors.length; i++) {
    if (!commonGreenIndices.includes(i)) {
      nonCommonIndices.push(i);
    }
  }

  // Перемешиваем только те индексы, которые не являются общими
  nonCommonIndices.sort(() => 0.5 - Math.random());

  // Создаем новый массив для перемешанных цветов
  let shuffledColors = Array(25);
  for (let index of commonGreenIndices) {
    shuffledColors[index] = "green"; // Общие зеленые остаются на своих местах
  }

  let currentIndex = 0;

  for (let i of nonCommonIndices) {
    shuffledColors[i] = colors[currentIndex];
    currentIndex += 1;
  }

  let greenIndices = [];
  shuffledColors.forEach((color, index) => {
    if (color !== "green") {
      greenIndices.push(index);
    }
  });
  greenIndices.sort(() => 0.5 - Math.random());
  greenIndices = greenIndices.slice(0, 6);
  const newArray = Array(words.length);
  for (let index of commonGreenIndices) {
    newArray[index] = "green";
  }

  for (let index of greenIndices) {
    newArray[index] = "green";
  }

  let remainingBlackCount = 3;
  let remainingGreyCount = 13;

  for (let i = 0; i < newArray.length; i++) {
    if (newArray[i] !== "green") {
      if (remainingBlackCount > 0 && remainingGreyCount > 0) {
        const randomColor = Math.random() < 0.5 ? "black" : "grey";
        if (randomColor === "black") {
          remainingBlackCount--;
        } else {
          remainingGreyCount--;
        }
        newArray[i] = randomColor;
      } else if (remainingGreyCount === 0) {
        newArray[i] = "black";
      } else if (remainingBlackCount === 0) {
        newArray[i] = "grey";
      }
    }
  }

  return {
    player1: words.map((word, index) => ({
      id: index + 1,
      word: word,
      color: shuffledColors[index],
      active: true,
      selectedGrey: null,
    })),
    player2: words.map((word, index) => ({
      id: index + 1,
      word: word,
      color: newArray[index],
      active: true,
      selectedGrey: null,
    })),
  };
}

function getRandomElements() {
  let words = allWords;
  words.sort(() => 0.5 - Math.random());
  words.sort(() => 0.5 - Math.random());
  words.sort(() => 0.5 - Math.random());
  words.sort(() => 0.5 - Math.random());
  words.sort(() => 0.5 - Math.random());
  return words.slice(0, 25);
}

export const getWords = () => {
  const words = getRandomElements();

  // Случайно выбираем 3 индекса для общих зеленых слов
  const commonGreenIndices = [];
  while (commonGreenIndices.length < 3) {
    const randomIndex = Math.floor(Math.random() * words.length);
    if (!commonGreenIndices.includes(randomIndex)) {
      commonGreenIndices.push(randomIndex);
    }
  }

  const { player1, player2 } = assignColors(words, commonGreenIndices);

  // Корректируем список игрока 2, чтобы было ровно 6 уникальных зеленых слов

  return {
    player1: player1,
    player2: player2,
  };
};
