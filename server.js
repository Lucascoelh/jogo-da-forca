const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Configuração do servidor
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Variáveis de estado do jogo
let gameState = {
    word: '', // Palavra secreta
    revealedWord: '', // Palavra revelada com underscores
    guessedLetters: [], // Letras adivinhadas
    remainingTries: 6, // Tentativas restantes
};

// Serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static('public'));

// Rota para a página principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Lidar com conexões de socket
io.on('connection', (socket) => {
    console.log('Um novo jogador se conectou');

    // Recebe a palavra secreta
    socket.on('set-word', (word) => {
        gameState.word = word.toLowerCase();
        gameState.revealedWord = '_'.repeat(word.length); // Palavra com underscores
        gameState.guessedLetters = [];
        gameState.remainingTries = 6;

        console.log('Palavra secreta definida: ' + word);

        // Inicia o jogo para o jogador
        io.emit('game-state', gameState);
    });

    // Recebe a letra do jogador
    socket.on('guess-letter', (letter) => {
        letter = letter.toLowerCase();

        if (!gameState.guessedLetters.includes(letter) && /^[a-z]$/.test(letter)) {
            gameState.guessedLetters.push(letter);

            if (gameState.word.includes(letter)) {
                // Atualiza a palavra revelada
                let revealed = '';
                for (let i = 0; i < gameState.word.length; i++) {
                    if (gameState.word[i] === letter || gameState.guessedLetters.includes(gameState.word[i])) {
                        revealed += gameState.word[i];
                    } else {
                        revealed += '_';
                    }
                }
                gameState.revealedWord = revealed;

                // Verificar vitória
                if (gameState.revealedWord === gameState.word) {
                    io.emit('game-over', 'Vitória! Você acertou a palavra!');
                    resetGame(); // Reinicia o jogo para o próximo turno
                    return; // Não continua executando o código após vitória
                }
            } else {
                gameState.remainingTries--;
            }

            // Verificar derrota
            if (gameState.remainingTries <= 0) {
                io.emit('game-over', `Derrota! A palavra era: ${gameState.word}`);
                resetGame(); // Reinicia o jogo para o próximo turno
                return; // Não continua executando o código após derrota
            }
        }

        io.emit('game-state', gameState); // Atualizar estado do jogo para todos
    });

    // Resetar o jogo para o próximo turno
    function resetGame() {
        gameState = {
            word: '',
            revealedWord: '',
            guessedLetters: [],
            remainingTries: 6,
        };
        io.emit('reset-game', 'Agora é a vez do outro jogador definir a palavra secreta!');
    }

    // Evento de desconexão
    socket.on('disconnect', () => {
        console.log('Jogador desconectado');
    });
});

// Iniciar o servidor na porta 3000
server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});