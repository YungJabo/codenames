import { WebSocketServer } from "ws";
import { getWords } from "./wordsLoader.js";

const gameState = {
  players: [],
  wordsPlayer1: [],
  wordsPlayer2: [],
  currentTurn: null,
  remainingTurns: 9,
  isChatting: false,
  text1: [],
  text2: [],
  selectedWord: null,
  greenWords: 0,
};
const wordTimeouts = new Map();

const addPlayer = (ws, username, team) => {
  let assignedTeam = "spectators"; // Default team

  // Check if the requested team is available
  const team1Occupied = gameState.players.some(
    (player) => player.team === "player1"
  );
  const team2Occupied = gameState.players.some(
    (player) => player.team === "player2"
  );

  // Assign to requested team if available
  if (team === "player1" && !team1Occupied) {
    assignedTeam = "player1";
  } else if (team === "player2" && !team2Occupied) {
    assignedTeam = "player2";
  }

  // Create and add new player
  const newPlayer = {
    username: username,
    team: assignedTeam,
    ws: ws,
  };
  gameState.players.push(newPlayer);
};

const returnLooseInfo = () => {
  gameState.players.forEach((player) => {
    player.ws.send(
      JSON.stringify({
        type: "loose",
      })
    );
  });
};

const returnWinInfo = () => {
  gameState.players.forEach((player) => {
    player.ws.send(
      JSON.stringify({
        type: "win",
      })
    );
  });
};

const returnPlayerInfo = () => {
  gameState.players.forEach((player) => {
    player.ws.send(
      JSON.stringify({
        type: "playerInfo",
        username: player.username,
        team: player.team,
      })
    );
  });
};
const returnGameState = (wss) => {
  const updateMessage = JSON.stringify({
    type: "gameState",
    currentTurn: gameState.currentTurn,
    remainingTurns: gameState.remainingTurns,
    isChatting: gameState.isChatting,
    text1: gameState.text1,
    text2: gameState.text2,
    selectedWord: gameState.selectedWord,
  });

  broadcast(wss, updateMessage);
};

const returnPlayers = (wss) => {
  const playersList = getPlayersList();
  const updateMessage = JSON.stringify({
    type: "playersList",
    players: playersList,
  });
  broadcast(wss, updateMessage);
};

const handleNewText = (ws, text) => {
  // Validate the text format using a regular expression
  const textPattern = /^[^\s]+\s\d+$/;
  if (!textPattern.test(text)) {
    console.log("Invalid text format");
    return;
  }

  // Find the player who sent the message
  const player = gameState.players.find((player) => player.ws === ws);
  if (!player) {
    console.log("Player not found");
    return;
  }

  // Push the text to the corresponding array based on the player's team
  if (player.team === "player1") {
    gameState.text1.push(text);
  } else if (player.team === "player2") {
    gameState.text2.push(text);
  }
  gameState.isChatting = false;
  if (gameState.currentTurn === "player1") {
    gameState.currentTurn = "player2";
  } else {
    gameState.currentTurn = "player1";
  }
};

const returnWords = (wss) => {
  wss.clients.forEach((client) => {
    const player = gameState.players.find((p) => p.ws === client);

    if (player.team === "player1") {
      console.log(gameState.wordsPlayer1);
      client.send(
        JSON.stringify({
          type: "words",
          words: gameState.wordsPlayer1,
        })
      );
    } else if (player.team === "player2") {
      // Отправляем изображения без цветов остальным
      client.send(
        JSON.stringify({
          type: "words",
          words: gameState.wordsPlayer2,
        })
      );
    } else {
      client.send(
        JSON.stringify({
          type: "words",
          words: [...gameState.wordsPlayer1].map((word) => ({
            ...word,
            color: "none",
          })),
        })
      );
    }
  });
};

const getPlayersList = () => {
  return gameState.players.map((player) => ({
    username: player.username,
    team: player.team,
  }));
};
const updateUsername = (ws, username) => {
  gameState.players.find((player) => player.ws === ws).username = username;
};
const updateTeam = (ws, newTeam) => {
  gameState.players.find((player) => player.ws === ws).team = newTeam;
};

const broadcast = (wss, message) => {
  wss.clients.forEach((client) => {
    client.send(message);
  });
};

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", async (message) => {
      console.log(`Received message: ${message}`);
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === "addPlayer") {
        addPlayer(ws, parsedMessage.username, parsedMessage.team);
        returnPlayers(wss);
        returnWords(wss);
        returnPlayerInfo();
        returnGameState(wss);
      }

      if (parsedMessage.type === "updateUsername") {
        updateUsername(ws, parsedMessage.username);
        returnPlayers(wss);
        returnPlayerInfo();
      }
      if (parsedMessage.type === "updateTeam") {
        updateTeam(ws, parsedMessage.team);
        returnPlayers(wss);
        returnWords(wss);
        returnPlayerInfo();
      }
      if (parsedMessage.type === "loadWords") {
        const { player1, player2 } = getWords();
        gameState.wordsPlayer1 = player1;
        gameState.wordsPlayer2 = player2;
        gameState.currentTurn = "player1";
        gameState.isChatting = true;
        gameState.text1 = [];
        gameState.text2 = [];
        gameState.selectedWord = null;

        returnGameState(wss);
        returnWords(wss);
      }
      if (parsedMessage.type === "clickOnWord") {
        const wordId = parsedMessage.id;
        const player = gameState.players.find((player) => player.ws === ws);
        if (player && player.team === gameState.currentTurn) {
          const playerWords =
            player.team === "player1"
              ? gameState.wordsPlayer1
              : gameState.wordsPlayer2;
          const opponentWords =
            player.team === "player1"
              ? gameState.wordsPlayer2
              : gameState.wordsPlayer1;

          const wordIndex = playerWords.findIndex((word) => word.id === wordId);

          // Устанавливаем новый таймер только если его нет
          if (!wordTimeouts.has(ws) && playerWords[wordIndex].active) {
            gameState.selectedWord = wordIndex + 1;
            returnGameState(wss);
            const timeoutId = setTimeout(() => {
              playerWords[wordIndex].color = opponentWords[wordIndex].color;
              playerWords[wordIndex].active = false;
              opponentWords[wordIndex].active = false;
              if (opponentWords[wordIndex].color === "grey") {
                gameState.remainingTurns -= 1;
                gameState.isChatting = true;
              }
              if (opponentWords[wordIndex].color === "black") {
                returnWords(wss);
                returnLooseInfo();
                gameState.currentTurn = null;
                gameState.isChatting = false;
                gameState.selectedWord = null;
                gameState.remainingTurns = 9;
              }
              if (opponentWords[wordIndex].color === "green") {
                gameState.greenWords += 1;
                console.log(gameState.greenWords);
                if (gameState.greenWords === 15) {
                  returnWords(wss);
                  returnWinInfo();
                  gameState.greenWords = 0;
                  gameState.currentTurn = null;
                  gameState.isChatting = false;
                  gameState.selectedWord = null;
                  gameState.remainingTurns = 9;
                }
              }

              if (gameState.remainingTurns === 0) {
                returnLooseInfo();
                gameState.greenWords = 0;
                gameState.currentTurn = null;
                gameState.isChatting = false;
                gameState.selectedWord = null;
                gameState.remainingTurns = 9;
              }
              returnGameState(wss);
              returnWords(wss);
              wordTimeouts.delete(ws); // Удаляем таймер после выполнения
            }, 1400);

            // Сохраняем идентификатор таймера в `Map`
            wordTimeouts.set(ws, timeoutId);
          } else {
            gameState.selectedWord = null;
            returnGameState(wss);
            clearTimeout(wordTimeouts.get(ws));
            wordTimeouts.delete(ws);
          }
        }
      }
      if (parsedMessage.type === "newText") {
        const { text } = parsedMessage;
        handleNewText(ws, text);
        returnGameState(wss);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      gameState.players = gameState.players.filter(
        (player) => player.ws !== ws
      );
      returnPlayers(wss);
    });
  });

  return wss;
}
