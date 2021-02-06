import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

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
    required: true,
    minlength: 5,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
  },
});

const Comment = mongoose.model("Comment", {
  body: String,
  date: Date, 
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  patternid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pattern", ////Prepared for comments: connected users and patterns///
  }
})

const Pattern = mongoose.model("Pattern", {
  post: {
    type: String,
    difficulty: Number
  },
  source: {
    type: String,
    //required: true, ///Fråga till MAKS
  },
  imageSource:{
    type: String
  },
  needles: {
    type: String,
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
});

const comments = new Pattern ({
  comments: "",
});
comments.save()


const port = process.env.PORT || 8081;
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

// Endpoint that creates a new user
app.post("/users", async (req, res) => {
  try {
    const { name, password } = req.body;
    const SALT = bcrypt.genSaltSync(10);
    const user = new User({ name, password: bcrypt.hashSync(password, SALT) });
    const saved = await user.save();
    res.status(201).json({
      id: saved._id,
      accessToken: saved.accessToken,
      message: "Your profile has been created successfully!",
    });
  } catch (err) {
    res.status(400).json({
      message: "Could not create user / User already exist",
      error: err.error,
    });
  }
});

// Endpoint that login the user
app.post("/sessions", async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({ userId: user._id, accessToken: user.accessToken });
    } else {
      res
        .status(400)
        .json({ message: "Wrong username or password", error: err.error });
    }
  } catch (err) {
    res
      .status(400)
      .json({ message: "Wrong username or password", error: err.error });
  }
});

// specific information for the user
app.get('users/:id', async (req, res) => {
  res.status(501).send();
})

///////////ENDPOINTS FOR PATTERNS///////////////
// Authenticated endpoint
//app.get("/patterns", authenticateUser);
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

app.get("/patterns/:patternid/comments", async (req, res) => {
  const { patternid } = req.params
  const commentsforpattern = await Comment.find({patternid})
})

app.post("/patterns", async (req, res) => {
  const { post, source, imageSource, needles, yarn, createdAt, likes, comments } = req.body;
  const pattern = new Pattern({
    post: post,
    source: source,
    imageSource: imageSource,
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

///Prepared for comments: connected users and patterns///
//app.get("/patterns/comments", async (req, res) => {
  //const comments = await Pattern.find().populate("user");
  //res.json(comments);
//});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
