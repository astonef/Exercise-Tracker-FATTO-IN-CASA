const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ path: './credenze.env' });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/?retryWrites=true&w=majority&appName=FCC-Exercise-Tracker`;

mongoose.connect(uri)
  .then(() => console.log("mongodb is connected ..."))
  .catch((err) => console.error("mongodb is not connected ...", err));

console.log("Connection URI:", uri);


const userSchema = new mongoose.Schema({
  username: String,
});

const User = mongoose.model("User", userSchema);


const exercisesSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

const Exercises = mongoose.model("Exercises", exercisesSchema);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});


app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    if (!users || users.length === 0) return res.status(404).send("No users found");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving users");
  }
});


app.post("/api/users", async (req, res) => {
  try {
    console.log("Received POST request to /api/users");
    console.log("Request body:", req.body);

    const user = new User({
      username: req.body.username,
    });
    
    await user.save();
    console.log("User saved:", user);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating user");
  }
});


app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).send("User not found");

    const exercises = new Exercises({
      user_id: user._id,
      description,
      duration: parseInt(duration), 
      date: date ? new Date(date) : new Date(),
    });

    const result = await exercises.save();
    res.json({
      _id: user._id,
      username: user.username,
      date: new Date(result.date).toDateString(),
      duration: result.duration,
      description: result.description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding exercise");
  }
});


app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).send("User not found");

    let dateObj = {};
    if (from) {
      dateObj["$gte"] = new Date(from);
    }
    if (to) {
      dateObj["$lte"] = new Date(to);
    }

    let filter = { user_id: id };
    if (from || to) {
      filter.date = dateObj;
    }

    const exercises = await Exercises.find(filter).limit(parseInt(limit) || 500);

    const log = exercises.map((e) => ({
      description: e.description.toString(),
      duration: parseInt(e.duration),
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving logs");
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
