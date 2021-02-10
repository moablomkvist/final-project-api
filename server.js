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
  // selectedPatterns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pattern" }],
  
});

// const Comment = mongoose.model("Comment", {
//   body: String,
//   date: Date, 
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref:"User"
//   },
//   patternId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Pattern", ////Prepared for comments: connected users and patterns///
//   }
// })

// const Favourite = mongoose.model("Favourite", {
//   body: String,
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref:"User"
//   },
//   patternId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Pattern", ////Prepared for favourite: connected users and patterns///
//   }
// })

const Pattern = mongoose.model("Pattern", {
  post: {
    type: String,
    difficulty: Number
  },
  source: {
    type: String,
    required: true,
  },
  imageSource:{
    type: String,
    required: true,
  },
  needles: {
    type: String
  },
  yarn: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  likes: {
    type: Number,
    default: 0
  }
});



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
      .json({ message: "Acesstoken is missing or not valid", errors: err });
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
// app.get('users/:id', async (req, res) => {
//   res.status(501).send();
// })

app.get("/patterns/:id", async (req, res) => {
  const patternId = await Pattern.findOne({ _id: req.params.id });
  if (patternId) {
    res.json(patternId);
  } else {
    res.status(404).json({ error: "Pattern not found" });
  }
});

// // app.get("users/:userId/favourites/:patternId", authenticateUser);
// app.get("users/:userId/favourites/:patternId", async (req, res) => {
//   try {
//     const userId = req.params._id;
//     if (userId != req.user._id) {
//       throw "Access denied";
//     }
//     const favouritesArray = await req.user.selectedPatterns; //array of added patterns (pattern-id:s)
//     const getCurrentFavouritePatterns = await Pattern.find({
//       userId: favouritesArray,
//     }); // gives the  pattern-object in user favourites
//     res.status(200).json(getCurrentFavouritePatterns);
//   } catch (err) {
//     res.status(403).json({
//       message: "Could not get favourite pattern. User must be logged in.",
//       errors: { message: err.message, error: err },
//     });
//   }
// });


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

// //Comments
// app.get("/patterns/:patternid/comments", async (req, res) => {
//   const { patternid } = req.params
//   const commentsforpattern = await Comment.find({patternid})
// })

//Post Patterns
app.post("/patterns", async (req, res) => {
  const { post, source, imageSource, needles, yarn, createdAt, likes, comments, favourite } = req.body;
  const pattern = new Pattern({
    post: post,
    source: source,
    imageSource: imageSource,
    needles: needles,
    yarn: yarn,
    createdAt: createdAt,
    likes: likes,
    comments: comments,
    favourite: favourite,
  });
  try {
    const savedPattern = await pattern.save();
    res.status(201).json(savedPattern);
  } catch (err) {
    res.status(400).json({
      message: "Could not post your pattern",
      errors: { message: err.message, error: err },
    });
  }
});

app.delete('/patterns/:patternId', authenticateUser);
app.delete("/patterns/:patternId", async (req, res) => { //deletes a pattern
  try {
    await Pattern.deleteOne({ _id: req.params.patternId });
    res.status(200).json({ sucess: true });
} catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Could not delete pattern' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
