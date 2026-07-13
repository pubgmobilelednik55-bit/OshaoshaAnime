const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const token = '8600225219:AAHTwcIuiyG9OR8vXd20e9JBl3iPDNo5Nyg';
const ADMIN_ID = 8683151446;
const bot = new TelegramBot(token, { polling: true });
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({ animes: [], users: {}, payments: [] }, null, 2));
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { animes: [], users: {}, payments: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

bot.onText(/\/start/, (msg) => {
    const userId = msg.chat.id;
    let db = readDB();
    
    if (!db.users[userId]) {
        db.users[userId] = { status: 'free', name: msg.from.first_name || 'Foydalanuvchi' };
        writeDB(db);
    }
    
    const webAppUrl = 'https://animezcbot.onrender.com';

    bot.sendMessage(userId, `Salom ZcAnimeBotimizga xush kelibsiz \n\nSiz sifatli anime yuklab olish yoki sifatli tomosha qilmoqchimisiz unda menyudagi ilovani ochish tugmasini bosing`, {
        reply_markup: {
            inline_keyboard: [[{ text: "Ilovani ochish 📱", web_app: { url: webAppUrl } }]]
        }
    });
});

bot.on('callback_query', (query) => {
    const [action, uid] = query.data.split('_');
    const userId = parseInt(uid);
    let db = readDB();

    if (action === 'approve') {
        if (db.users[userId]) {
            db.users[userId].status = 's+';
            writeDB(db);
            bot.sendMessage(userId, "Tabriklaymiz! Sizda endi S+ Premium bor 🎉");
        }
    }
    bot.answerCallbackQuery(query.id);
});

app.get('/api/data', (req, res) => {
    const userId = req.query.userId;
    let db = readDB();
    const userStatus = db.users[userId]?.status || 'free';
    
    const filtered = db.animes.filter(a => userStatus === 's+' ? true : a.type === 'free');
    res.json({ animes: filtered, user: db.users[userId] || { status: 'free' } });
});

app.post('/api/add-anime', (req, res) => {
    let db = readDB();
    db.animes.push({ id: Date.now(), ...req.body });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/pay', (req, res) => {
    const { userId, name, plan } = req.body;
    bot.sendMessage(ADMIN_ID, `💰 To'lov: ${name}\nID: ${userId}\nPlan: ${plan}`, {
        reply_markup: {
            inline_keyboard: [[{ text: "Tasdiqlash", callback_data: `approve_${userId}` }]]
        }
    });
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda...`));
