require('dotenv').config();
const { ethers } = require('ethers');

// Инициализация провайдера
const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
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
        const txHash = event.transactionHash; // Используем txHash из события
        console.log(`Обнаружен Ping! Транзакция: ${txHash}`);
        await callPong(txHash);
    });

    // Обработка ошибок
    process.on('uncaughtException', (err) => {
        console.error('Произошла ошибка:', err);
        // Логика перезапуска (например, можно перезапустить бота)
    });
}

// Запускаем бота
init().catch(err => {
    console.error('Ошибка при инициализации:', err);
});

console.log('Бот запущен и ожидает события Ping...');
