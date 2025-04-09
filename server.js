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
const { Server } = require('socket.io');
const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.SESSION_SECRET;

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:8080",
      "https://your-production-url.com",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use((req, res, next) => {
  res.on('finish', () => {
    const headers = res.getHeaders();
    console.log(`[${req.method}] ${req.originalUrl} =>`, {
      'Set-Cookie': headers['set-cookie'],
      'Access-Control-Allow-Origin': headers['access-control-allow-origin'],
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

// API Routes
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/products"));
app.use("/api", require("./routes/blogPosts"));
app.use("/api", require("./routes/users"));
app.use("/api", require("./routes/analytics"));
app.use("/api", require("./routes/leads"));
app.use("/api", require("./routes/chat"));

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

app.use((req, res) => {
  const message = `404 Not Found: ${req.method} ${req.originalUrl}`;
  console.error(message);
  res.status(404).json({ error: "Not Found" });
});

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
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const Chat = require('./models/Chat');
const sendEmail = require('./utils/sendEmail');

// Track active chats and last message timestamps for inactivity timeout
const activeChats = new Map(); // userId -> { socketId, timeout }

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('admin-login', () => {
    console.log('Admin logged in:', socket.id);
    socket.join('admins');
  });

  socket.on('join-room', (userId) => {
    console.log('Client joined room:', userId);
    socket.join(userId);
  });

  socket.on('request-human', async (data) => {
    console.log('Request human received:', data);
    const chat = await Chat.findOne({ userId: data.userId });
    if (chat) {
      const hasPendingRequest = chat.messages.some(msg => 
        msg.text.includes('Your request has been sent to a human agent') && 
        !chat.messages.some(m => m.text === 'A human agent has joined the chat!')
      );

      // Check if admins are available
      const adminRoom = io.sockets.adapter.rooms.get('admins');
      const adminCount = adminRoom ? adminRoom.size : 0;

      if (adminCount === 0) {
        io.to(data.userId).emit('no-admins', {
          message: 'Sorry, it looks like our team is currently unavailable. Please provide your email, and we’ll follow up with you soon!',
        });
        return;
      }

      if (hasPendingRequest) {
        io.to('admins').emit('chat-notification', {
          userId: data.userId,
          name: data.name,
          email: data.email,
          message: 'User has requested to talk to a human again.',
        });
      } else {
        io.to('admins').emit('chat-request', {
          userId: data.userId,
          socketId: socket.id,
          name: data.name,
          email: data.email,
          message: data.message,
        });
      }
    }
  });

  socket.on('accept-chat', (data) => {
    console.log('Admin accepted chat:', data);
    // Clear any existing timeout for this userId
    if (activeChats.has(data.userId)) {
      const existingChat = activeChats.get(data.userId);
      clearTimeout(existingChat.timeout);
    }

    io.to(data.userSocketId).emit('human-connected', {
      message: 'A human agent has joined the chat!',
    });

    // Start inactivity timeout for this chat
    const timeout = setTimeout(() => {
      console.log(`Inactivity timeout triggered for userId: ${data.userId}`);
      io.to(data.userId).emit('inactivity-disconnect', {
        message: "You’ve been disconnected due to inactivity. Type 'talk to human' to reconnect.",
      });
      activeChats.delete(data.userId);
    }, 120000); // 2 minutes

    activeChats.set(data.userId, { socketId: data.userSocketId, timeout });
  });

  socket.on('user-message', async (data) => {
    console.log('User message received:', data);
    io.to(data.userId).emit('message', {
      text: data.message,
      sender: 'user',
      timestamp: new Date(),
    });

    // Reset inactivity timeout
    if (activeChats.has(data.userId)) {
      const chatData = activeChats.get(data.userId);
      clearTimeout(chatData.timeout);
      chatData.timeout = setTimeout(() => {
        console.log(`Inactivity timeout triggered for userId: ${data.userId}`);
        io.to(data.userId).emit('inactivity-disconnect', {
          message: "You’ve been disconnected due to inactivity. Type 'talk to human' to reconnect.",
        });
        activeChats.delete(data.userId);
      }, 120000);
      activeChats.set(data.userId, chatData);
    } else {
      console.log(`No active chat found for userId: ${data.userId}`);
    }

    try {
      const chat = await Chat.findOne({ userId: data.userId });
      if (chat) {
        chat.messages.push({
          text: data.message,
          sender: 'user',
          timestamp: new Date(),
        });
        await chat.save();
      }
    } catch (error) {
      console.error('Error saving user message:', error);
      logger.error('Error saving user message:', error.message, error.stack);
      await sendEmail(
        process.env.ADMIN_EMAIL,
        'Error: User Message Save Failed',
        `Failed to save user message for user ${data.userId}. Error: ${error.message}`
      );
    }
  });

  socket.on('admin-message', async (data) => {
    console.log('Admin message received:', data);
    io.to(data.userId).emit('message', {
      text: data.message,
      sender: data.sender || 'admin',
      timestamp: data.timestamp || new Date(),
    });

    // Reset inactivity timeout
    if (activeChats.has(data.userId)) {
      const chatData = activeChats.get(data.userId);
      clearTimeout(chatData.timeout);
      chatData.timeout = setTimeout(() => {
        console.log(`Inactivity timeout triggered for userId: ${data.userId}`);
        io.to(data.userId).emit('inactivity-disconnect', {
          message: "You’ve been disconnected due to inactivity. Type 'talk to human' to reconnect.",
        });
        activeChats.delete(data.userId);
      }, 120000);
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
      }
    } catch (error) {
      console.error('Error saving admin message:', error);
      logger.error('Error saving admin message:', error.message, error.stack);
      await sendEmail(
        process.env.ADMIN_EMAIL,
        'Error: Admin Message Save Failed',
        `Failed to save admin message for user ${data.userId}. Error: ${error.message}`
      );
    }
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected:', socket.id);
    if (socket.rooms.has('admins')) {
      io.to('waiting-users').emit('no-admins', {
        message: 'Sorry, it looks like our team is currently unavailable. Please provide your email, and we’ll follow up with you soon!',
      });
    }
  });
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received: closing server");
  server.close(() => {
    mongoose.connection.close();
    console.log("Server closed");
    process.exit(0);
  });
});