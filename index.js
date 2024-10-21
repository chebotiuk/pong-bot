require('dotenv').config();
const { ethers } = require('ethers');

// Инициализация провайдера
const provider = new ethers.WebSocketProvider(process.env.INFURA_WS_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function init() {
  const currentBlock = await provider.getBlockNumber();
  console.log('Текущий блок:', currentBlock);

  // Адрес контракта и ABI
  const contractAddress = '0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d';
  const abi = [
      "event Ping()",
      "function pong(bytes32 _txHash) external"
  ];

  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Функция для вызова pong()
  async function callPong(txHash) {
      try {
          const tx = await contract.pong(txHash);
          await tx.wait();
          console.log(`Вызван pong() для транзакции: ${txHash}`);
      } catch (error) {
          console.error(`Ошибка при вызове pong(): ${error}`);
      }
  }

  // Прослушивание событий Ping в реальном времени
  contract.on('Ping', async (event) => {
    const txHash = event.log.transactionHash;  // Извлекаем хеш транзакции из log
    if (txHash) {
        console.log(`Обнаружен Ping! Транзакция: ${txHash}`);
        await callPong(txHash);  // Вызываем функцию для отправки pong
    } else {
        console.error("Ошибка: txHash неопределен.");
    }
  });

  // Обработка событий провайдера
  // provider._ws.on('close', () => {
  //   console.error('WebSocket соединение закрыто, переподключение...');
  //   reconnect();
  // });

  // provider._ws.on('error', (error) => {
  //   console.error('Ошибка WebSocket:', error.message);
  //   reconnect();
  // });
}

function reconnect() {
  setTimeout(() => {
    console.log('Переподключение к WebSocket...');
    init();  // Пытаемся заново запустить бота
  }, 5000);  // Ожидание 5 секунд перед переподключением
}

// Запускаем бота
init().then(() => {
  console.log('Бот запущен и ожидает события Ping...');
}).catch(err => {
  console.error('Ошибка при инициализации:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Произошла ошибка:', err);
    // Логика перезапуска (например, можно перезапустить бота)
});


