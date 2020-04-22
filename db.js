// db.js
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

//passport authentication
UserSchema.plugin(passportLocalMongoose);

const QuestionSchema = new mongoose.Schema({
  profile_id: String,
  question: String,
  answers: [Object],
  correctAnswer: String,
});

const ProfileSchema = new mongoose.Schema({
  user_id: {
    type: String,
    unique: true,
    required: true,
  },
  image: {
    data: String,
    contentType: String,
  },
  question_ids: [String],
});

// is the environment variable, NODE_ENV, set to PRODUCTION?
let dbconf;
if (process.env.NODE_ENV === "PRODUCTION") {
  // if we're in PRODUCTION mode, then read the configration from a file
  // use blocking file io to do this...
  const fs = require("fs");
  const path = require("path");
  const fn = path.join(__dirname, "./config.json");
  const data = fs.readFileSync(fn);

  const conf = JSON.parse(data);
  dbconf = conf.dbconf;
} else {
  // if we're not in PRODUCTION mode, then use
  dbconf = "mongodb://localhost/impressions";
}

mongoose.connect(process.env.MONGODB_URI || dbconf, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

mongoose.model("User", UserSchema);
mongoose.model("Profile", ProfileSchema);
mongoose.model("Question", QuestionSchema);
