require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require('express-validator');
const mongoSanitize = require('mongo-sanitize');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.SESSION_SECRET;

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:8080",
    "https://bagstory.editedgemultimedia.com",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.on('finish', () => {
    const headers = res.getHeaders();
    console.log(`[${req.method}] ${req.originalUrl} =>`, {
      'Set-Cookie': headers['set-cookie'],
      'Access-Control-Allow-Origin': headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': headers['access-control-allow-credentials'],
    });
  });
  next();
});

// Security Headers (Helmet)
const frameSrcUrls = [
  "https://js.stripe.com/",
  "https://www.sandbox.paypal.com/",
];

const scriptSrcUrls = [
  "https://js.stripe.com/",
  "https://cdn.jsdelivr.net/",
  "https://cdnjs.cloudflare.com/",
];

const styleSrcUrls = [
  "https://cdn.jsdelivr.net/",
  "https://fonts.googleapis.com/",
  "https://cdnjs.cloudflare.com/",
];

const connectSrcUrls = [
  "https://api.stripe.com/",
  "https://fonts.gstatic.com/",
  "https://bagstoryapi.editedgemultimedia.com",
];

const imgSrcUrls = [
  "https://images.unsplash.com/",
  "https://cdn.jsdelivr.net/",
  "https://res.cloudinary.com/",
];

const fontSrcUrls = [
  "https://fonts.gstatic.com/",
  "https://cdn.jsdelivr.net/",
];

const mediaSrcUrls = [
  "'self'",
  "blob:",
];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      frameSrc: ["'self'", ...frameSrcUrls],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSrcUrls],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      styleSrcElem: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: ["'self'", "blob:", "data:", ...imgSrcUrls],
      fontSrc: ["'self'", ...fontSrcUrls, "data:"],
      mediaSrc: [...mediaSrcUrls],
      "script-src-attr": ["'unsafe-inline'"],
    },
  })
);

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 500 : 1000,
  message: "Too many requests, please try again later.",
  keyGenerator: (req) => req.ip,
});

app.use(generalLimiter);

// Security Middleware
app.use((req, res, next) => {
  req.query = mongoSanitize(req.query);
  req.body = mongoSanitize(req.body);
  req.params = mongoSanitize(req.params);
  next();
});

// Database Connection
const dbUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL : process.env.DB_URL_DEV;
mongoose.connect(dbUrl, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
}).then(() => console.log("✅ Database Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

const db = mongoose.connection;
db.on("error", (err) => {
  console.error("❌ MongoDB Connection Error:", err);
});
db.once("open", () => {
  console.log("✅ MongoDB Connection Established");
});

const store = new MongoDBStore({
  uri: dbUrl,
  collection: "sessions",
});
store.on("connected", () => {
  console.log("✅ MongoDB session store connected");
});

store.on("error", (error) => {
  console.error("❌ Session store error:", error);
});

// Session Configuration
app.use(
  session({
    secret: secret,
    name: "_editEdge",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Initialize Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.set("trust proxy", 1);

// Request Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.use(cookieParser());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/products', require('./routes/products'));
app.use('/api/blog-posts', require('./routes/blogPosts'));
app.use('/api/user', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/order', require('./routes/orders'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/subscribers', require('./routes/subscribers'));

// Fallback for unmatched routes
app.use((req, res, next) => {
  console.warn('⚠️ Unmatched route:', req.method, req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// Error Handling
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:8080",
      "https://bagstory.editedgemultimedia.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set('io', io);

const Chat = require('./models/Chat');
const Lead = require('./models/Lead');
const sendEmail = require('./utils/sendEmail');

// Track active chats and last message timestamps for inactivity timeout
const activeChats = new Map(); // userId -> { socketId, timeout }
const chatAdmins = new Map(); // userId -> Map of adminSocketId -> { muted: boolean }

io.on('connection', (socket) => {
  console.debug('Socket.IO: Client connected', { socketId: socket.id });

  socket.on('admin-login', () => {
    console.debug('Socket.IO: Admin logged in', { socketId: socket.id });
    socket.join('admins');
    console.debug('Socket.IO: Admin joined admins room');
  });

  socket.on('join-room', (userId) => {
    console.debug('Socket.IO: Client joining room', { userId, socketId: socket.id });
    socket.join(userId);
  });

  socket.on('leave-room', (userId) => {
    console.debug('Socket.IO: Client leaving room', { userId, socketId: socket.id });
    socket.leave(userId);
  });

  socket.on('request-human', async (data) => {
    console.debug('Socket.IO: Request human received', data);
    const chat = await Chat.findOne({ userId: data.userId });
    if (chat) {
      const hasPendingRequest = chat.messages.some(msg => 
        msg.text.includes('Your request has been sent to an admin') && 
        !chat.messages.some(m => m.text === 'An admin has joined the chat!')
      );

      console.debug('Socket.IO: Emitting chat-notification to admins', { userId: data.userId });
      io.to('admins').emit('chat-notification', {
        userId: data.userId,
        name: data.name,
        email: data.email,
        message: 'User has requested to speak to an admin.',
      });

      if (!hasPendingRequest) {
        console.debug('Socket.IO: Emitting chat-request to admins', { userId: data.userId });
        io.to('admins').emit('chat-request', {
          userId: data.userId,
          socketId: socket.id,
          name: data.name,
          email: data.email,
          message: data.message,
        });

        setTimeout(async () => {
          const updatedChat = await Chat.findOne({ userId: data.userId });
          if (updatedChat && !updatedChat.messages.some(msg => msg.text === 'An admin has joined the chat!')) {
            console.debug('Socket.IO: No admin responded within 1 minute', { userId: data.userId });
            io.to(data.userId).emit('no-admins', {
              message: 'Sorry, our team is currently unavailable. We’ll follow up with you via email soon!',
            });

            try {
              const lead = await Lead.findOne({ email: data.email });
              if (!lead) {
                const newLead = new Lead({
                  name: data.name,
                  email: data.email,
                  source: 'Chat Widget',
                  date: new Date().toISOString().split('T')[0],
                  message: 'No admin responded to admin request',
                });
                await newLead.save();
                console.debug('Socket.IO: New lead created', { email: data.email });
              }

              await sendEmail(
                process.env.ADMIN_EMAIL,
                'Missed Chat Request',
                `User ${data.name} (${data.email}) requested an admin, but no admin responded within 1 minute. Please follow up with them soon.`
              );
              console.debug('Socket.IO: Admin notified of missed chat request', { email: data.email });
            } catch (err) {
              console.error('Socket.IO: Error saving lead or notifying admin', { error: err.message });
            }
          }
        }, 60000); // 1 minute
      }
    }
  });

  socket.on('accept-chat', (data) => {
    console.debug('Socket.IO: Admin accepted chat', { userId: data.userId, socketId: socket.id });
    if (activeChats.has(data.userId)) {
      const existingChat = activeChats.get(data.userId);
      clearTimeout(existingChat.timeout);
    }

    console.debug('Socket.IO: Emitting human-connected', { userId: data.userId });
    io.to(data.userId).emit('human-connected', {
      message: 'An admin has joined the chat!',
    });

    const timeout = setTimeout(() => {
      console.debug('Socket.IO: Inactivity timeout triggered', { userId: data.userId });
      io.to(data.userId).emit('inactivity-disconnect', {
        message: "You’ve been disconnected due to inactivity. Type 'speak to admin' to reconnect.",
      });
      activeChats.delete(data.userId);
      chatAdmins.delete(data.userId);
    }, 300000); // 5 minutes

    activeChats.set(data.userId, { socketId: socket.id, timeout });

    if (!chatAdmins.has(data.userId)) {
      chatAdmins.set(data.userId, new Map());
    }
    chatAdmins.get(data.userId).set(socket.id, { muted: false });
    console.debug('Socket.IO: Admin added to chat', { userId: data.userId, adminSocketId: socket.id });
  });

  socket.on('user-message', async (data) => {
    console.debug('Socket.IO: User message received', { userId: data.userId, message: data.message });
    console.debug('Socket.IO: Broadcasting user message', { userId: data.userId });
    io.to(data.userId).emit('message', {
      text: data.message,
      sender: 'user',
      timestamp: data.timestamp || new Date(),
      userId: data.userId,
      name: data.name,
    });

    if (activeChats.has(data.userId)) {
      const chatData = activeChats.get(data.userId);
      clearTimeout(chatData.timeout);
      chatData.timeout = setTimeout(() => {
        console.debug('Socket.IO: Inactivity timeout triggered', { userId: data.userId });
        io.to(data.userId).emit('inactivity-disconnect', {
          message: "You’ve been disconnected due to inactivity. Type 'speak to admin' to reconnect.",
        });
        activeChats.delete(data.userId);
        chatAdmins.delete(data.userId);
      }, 300000);
      activeChats.set(data.userId, chatData);
    }

    try {
      const chat = await Chat.findOne({ userId: data.userId });
      if (chat) {
        chat.messages.push({
          text: data.message,
          sender: 'user',
          timestamp: new Date(data.timestamp),
        });
        await chat.save();
        console.debug('Socket.IO: User message saved', { userId: data.userId, message: data.message });
      } else {
        console.debug('Socket.IO: No chat session found', { userId: data.userId });
      }
    } catch (error) {
      console.error('Socket.IO: Error saving user message', { error: error.message });
    }
  });

  socket.on('admin-message', async (data) => {
    console.debug('Socket.IO: Admin message received', { userId: data.userId, message: data.message, socketId: socket.id });
    const admins = chatAdmins.get(data.userId);
    if (admins && admins.get(socket.id)?.muted) {
      console.debug('Socket.IO: Admin is muted, message blocked', { userId: data.userId, socketId: socket.id });
      io.to(socket.id).emit('message-blocked', {
        message: 'You are muted and cannot send messages.',
      });
      return;
    }

    console.debug('Socket.IO: Broadcasting admin message', { userId: data.userId });
    io.to(data.userId).emit('message', {
      text: data.message,
      sender: data.sender || 'admin',
      timestamp: data.timestamp || new Date(),
      userId: data.userId,
      name: data.name,
    });

    if (activeChats.has(data.userId)) {
      const chatData = activeChats.get(data.userId);
      clearTimeout(chatData.timeout);
      chatData.timeout = setTimeout(() => {
        console.debug('Socket.IO: Inactivity timeout triggered', { userId: data.userId });
        io.to(data.userId).emit('inactivity-disconnect', {
          message: "You’ve been disconnected due to inactivity. Type 'speak to admin' to reconnect.",
        });
        activeChats.delete(data.userId);
        chatAdmins.delete(data.userId);
      }, 300000);
      activeChats.set(data.userId, chatData);
    }

    try {
      const chat = await Chat.findOne({ userId: data.userId });
      if (chat) {
        chat.messages.push({
          text: data.message,
          sender: 'admin',
          timestamp: new Date(data.timestamp),
        });
        await chat.save();
        console.debug('Socket.IO: Admin message saved', { userId: data.userId, message: data.message });
      }
    } catch (error) {
      console.error('Socket.IO: Error saving admin message', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.debug('Socket.IO: Client disconnected', { socketId: socket.id });
    for (const [userId, admins] of chatAdmins) {
      if (admins.has(socket.id)) {
        admins.delete(socket.id);
        if (admins.size === 0) {
          chatAdmins.delete(userId);
        }
        console.debug('Socket.IO: Admin removed from chat on disconnect', { userId, socketId: socket.id });
      }
    }
  });
});

app.set('activeChats', activeChats);
app.set('chatAdmins', chatAdmins);

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received: closing server");
  server.close(() => {
    mongoose.connection.close();
    console.log("Server closed");
    process.exit(0);
  });
});