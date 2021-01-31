import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/knitting-circle";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;
mongoose.set("useCreateIndex", true);

const User = mongoose.model("User", {
  name: {
    type: String,
    unique: true,
    required: true,
    minlength: 3,
  },
  password: {
    type: String,
    unique: true,
    required: true,
    minlength: 5,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
  },
});

const Pattern = mongoose.model("Pattern", {
  post: {
    type: String,
    difficulty: Number,
    required: true, //consider a maxlength to controll the size of feed.
  },
  source: {
    type: String,
    required: true,
  },
  needles: {
    type: Number,
  },
  yarn: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      body: String,
      date: Date, //add user id (check out Maks Technigo members and roles)
    },
  ],
});

//Seed database
if (process.env.RESET_DATABASE) {
  console.log("resetting database!");

  const seedDatabase = async () => {
    await Pattern.deleteMany();

    const oslohuen = new Pattern({
      post: "Oslohuen",
      source:
        "https://www.petiteknit.com/products/oslohuen?variant=12540116533303",
      needles: 3.5,
      yarn: "Filocana",
    });
    await oslohuen.save();
  };
  seedDatabase();
}

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(bodyParser.json());

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header("Authorization"),
    });
    if (user) {
      req.res = user;
      next();
    } else {
      res.status(401).json({ loggedOut: true, message: "Try to log in again" });
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: "Acess token is missing or not valid", errors: err });
  }
};

app.get("/", (req, res) => {
  res.send("Hello knitting world");
});

///////////ENDPOINTS FOR USERS///////////////

// Sign-up endpoint
app.post("/users", async (req, res) => {
  try {
    const { name, password } = req.body;
    const SALT = bcrypt.genSaltSync(10);
    const user = new User({ name, password: bcrypt.hashSync(password, SALT) });
    const saved = await user.save();
    res
      .status(201)
      .json({
        id: saved._id,
        accessToken: saved.accessToken,
        message: "Your profile has been created successfully!",
      });
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Could not create user / User already exist",
        error: err.error,
      });
  }
});

// Authenticated endpoint
app.get("/secrets", authenticateUser);
app.get("/secrets", (req, res) => {
  res.json({ secret: "Success! You are logged in." });
});

// Sign-in endpoint
app.post("/sessions", async (req, res) => {
  try {
    const user = await User.findOne({ name: req.body.name });
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
      res.status(201).json({ userId: user._id, accessToken: user.accessToken });
    } else {
      res
        .status(400)
        .json({ message: "Wrong email or password", error: err.error });
    }
  } catch (err) {
    res
      .status(400)
      .json({ message: "Wrong email or password", error: err.error });
  }
});

///////////ENDPOINTS FOR PATTERNS///////////////

app.get("/patterns", async (req, res) => {
  try {
    const patterns = await Pattern.find()
      .sort({ createdAt: "desc" })
      .limit(24)
      .exec();
    res.json(patterns);
  } catch (err) {
    res.status(400).json({ message: "could not load the database" });
  }
});

app.post("/patterns", async (req, res) => {
  const { post, source, needles, yarn, createdAt, likes, comments } = req.body;
  const pattern = new Pattern({
    post: post,
    source: source,
    needles: needles,
    yarn: yarn,
    createdAt: createdAt,
    likes: likes,
    comments: comments,
  });

  try {
    const savedPattern = await pattern.save();
    res.status(201).json(savedPattern);
  } catch (err) {
    res.status(400).json({
      message: "Could not post your pattern",
      error: err.errors,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
