import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/knitting-circle";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const Pattern = mongoose.model("Pattern", {
  post: {
    type: String,
    difficulty: Number,
    required: true //consider a maxlength to controll the size of feed.
  },
  source: {
    type: String, 
    required: true
  },
  needles: {
    type: Number
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
  },
  comments: [{ body: String, date: Date }],
});

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello knitting world");
});

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
  const pattern = new Pattern({ post: post, source: source, needles: needles, yarn: yarn, createdAt: createdAt, likes: likes, comments: comments });

  try {
    const savedPattern = await pattern.save();
    res.status(201).json(savedPattern);
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Could not post your pattern",
        error: err.errors,
      });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
