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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  patternId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pattern", ////Prepared for comments: connected users and patterns///
  }
})

const Favourite = mongoose.model("Favourite", {
  body: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  patternId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pattern", ////Prepared for favourite: connected users and patterns///
  }
})

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

//const comments = new Pattern ({
 // comments: "",
//});
//comments.save()

// const favourite = new Pattern ({
//   favourite: "",
// });
// favourite.save()

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

// Users favourite pattern
app.put("/users/:userId/favorites/:patternId", async (req, res) => {
  const { userId, patternid } = req.params;
  try {
    const markedPattern = await Pattern.findById(patternId); // Find the pattern the user wants to add.
    console.log("markedPattern", markedPattern);
    await User.updateOne(
      { _id: userId },
      { $push: { markedPattern: markedPattern } } //push the selected pattern into the favorite patterns array
    );
    //console.log("")
    res.status(200).json(markedPattern);
  } catch (err) {
    res.status(404).json({
      message: "Could not add pattern.",
      errors: { message: err.message, error: err },
    });
  }
});

//delete a pattern from favourites
app.delete("/users/:userId/favorites/:patternId", async (req, res) => {
  const { userId, patternId } = req.params;
  try {
    const markedPattern = await Pattern.findById(patternId); // Find the pattern the user wants to add.
    console.log("markedPattern", markedPattern);
    await User.deleteOne(
      { _id: userId },
      { $pull: { markedPattern: markedPattern } } //push the selected video into the favorite videos array
    );
    //console.log("")
    res.status(200).json(markedPattern);
  } catch (err) {
    res.status(404).json({
      message: "Could not remove video.",
      errors: { message: err.message, error: err },
    });
  }
});

app.get("/users/:id/favorites", async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId != req.user._id) {
      throw "Access denied";
    }
    const userFavoritesArray = await req.user.favoritePatterns; //--> shows array of added pattern (pattern-id:s)
    const getCurrentFavoritePatterns = await Pattern.find({
      _id: userFavoritesArray,
    }); // --> outputs the whole pattern-object in user favorites!
    res.status(200).json(getCurrentFavoritePatterns);
  } catch (err) {
    res.status(403).json({
      message: "Could not get favorite patterns. User must be logged in.",
      errors: { message: err.message, error: err },
    });
  }
});

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
    console.log(req.body)
    const savedPattern = await pattern.save();
    res.status(201).json(savedPattern);
  } catch (err) {
    res.status(400).json({
      message: "Could not post your pattern",
      errors: { message: err.message, error: err },
    });
  }
});

app.delete("/patterns/:patternId", authenticateUser);
app.delete("/patterns/:patternId", async (req, res) => { //deletes a pattern
  try {
    await Pattern.deleteOne({ _id: req.params.patternId });
    res.status(200).json({ sucess: true });
} catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Could not delete pattern' });
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
