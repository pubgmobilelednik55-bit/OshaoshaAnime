const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const token = '8600225219:AAHTwcIuiyG9OR8vXd20e9JBl3iPDNo5Nyg';
const ADMIN_ID = 8683151446;
const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Fayl yuklash (Thumbnail rasm uchun)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(uploadDir));

// Ma'lumotlar bazasi (Xotirada)
let db = { animes: [], users: {} };

// Bot start
bot.onText(/\/start/, (msg) => {
    const userId = msg.chat.id;
    if (!db.users[userId]) db.users[userId] = { status: 'free', name: msg.from.first_name };
    
    bot.sendMessage(userId, `Salom ZcAnimeBotimizga xush kelibsiz ☺️\nSiz sifatli anime yuklab olish yoki sifatli tomosha qilmoqchimisiz unda menyudagi ilovani ochish tugmasini bosing👇`, {
        reply_markup: {
            inline_keyboard: [[{ text: "Ilovani ochish 📱", web_app: { url: 'https://SAYTINGIZ_NOMI.onrender.com' } }]]
        }
    });
});

// Admin tasdiqlashi
bot.on('callback_query', (query) => {
    const [action, uid] = query.data.split('_');
    const userId = parseInt(uid);
    if (action === 'approve') {
        if (db.users[userId]) db.users[userId].status = 's+';
        bot.sendMessage(userId, "Tabriklaymiz! Sizda endi S+ Premium bor! 🎉");
    }
    bot.answerCallbackQuery(query.id);
});

// API-lar
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/data', (req, res) => {
    const userId = req.query.userId;
    const userStatus = db.users[userId]?.status || 'free';
    const filtered = db.animes.filter(a => userStatus === 's+' ? true : a.type === 'free');
    res.json({ animes: filtered, user: db.users[userId] || { status: 'free' } });
});

app.post('/api/add-anime', upload.single('thumb'), (req, res) => {
    const { title, desc, videoUrl, type } = req.body;
    db.animes.push({
        id: Date.now(),
        title, desc, videoUrl, type,
        thumb: req.file ? `/uploads/${req.file.filename}` : ''
    });
    res.json({ success: true });
});

app.post('/api/pay', (req, res) => {
    const { userId, name, plan } = req.body;
    bot.sendMessage(ADMIN_ID, `💰 To'lov: ${name}\nID: ${userId}\nPlan: ${plan}\nKarta: 4916990355543858`, {
        reply_markup: {
            inline_keyboard: [[{ text: "✅ Tasdiqlash", callback_data: `approve_${userId}` }]]
        }
    });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server yondi: ${PORT}`));
